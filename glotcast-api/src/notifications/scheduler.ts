import { randomUUID } from "node:crypto"
import { hostname } from "node:os"
import { Inject, Injectable, Logger, type OnApplicationShutdown } from "@nestjs/common"
import { Cron } from "@nestjs/schedule"
import { sql } from "drizzle-orm"
import { AppConfig } from "../config/app-config.service"
import { DRIZZLE, type Database } from "../database/database.module"
import { CampaignExpander, type Expanded } from "./campaign-expander.service"
import { ContentService } from "./content.service"
import { type DispatchReport, DispatcherService } from "./dispatcher.service"
import { JobLeases } from "./leases"
import { OneSignalClient } from "./onesignal.client"
import { PlannerService } from "./planner.service"
import { NotificationSettingsService } from "./settings.service"
import { ts } from "./sql"

export const TICK_LEASE = "notifications"
const DAILY_LEASE = "notifications:daily"
/** An outage never fires stale reminders: a tick looks back at most this far. */
const MAX_LOOKBACK_MS = 30 * 60_000
const LEASE_MS = 4 * 60_000
const KICK_DEBOUNCE_MS = 2_000
const KEEP_DAYS = 90
const KEEP_SKIPPED_DAYS = 14

export interface TickReport {
  from: string
  to: string
  live: number
  planned: number
  skipped: number
  content: number
  campaigns: Expanded[]
  dispatch: DispatchReport | null
  errors: string[]
}

/**
 * Every 5 minutes (when NOTIFICATIONS_ENABLED and OneSignal is configured): mark newly live episodes, plan the
 * daily habit/learning pushes due since the last run, the new-episode pushes, expand due campaigns, send what is
 * due, and once a day clean up. One instance at a time (a lease row), one run at a time per process.
 */
@Injectable()
export class NotificationsScheduler implements OnApplicationShutdown {
  private readonly logger = new Logger(NotificationsScheduler.name)
  private readonly holder = `${hostname()}:${process.pid}:${randomUUID().slice(0, 8)}`
  private running = false
  private kickTimer: NodeJS.Timeout | null = null

  constructor(
    @Inject(DRIZZLE) private readonly db: Database,
    private readonly config: AppConfig,
    private readonly onesignal: OneSignalClient,
    private readonly leases: JobLeases,
    private readonly settings: NotificationSettingsService,
    private readonly content: ContentService,
    private readonly planner: PlannerService,
    private readonly campaigns: CampaignExpander,
    private readonly dispatcher: DispatcherService,
  ) {}

  /** The kill switch and the keys: without both nothing is planned or sent. */
  get enabled(): boolean {
    return this.config.get("NOTIFICATIONS_ENABLED") === true && this.onesignal.configured
  }

  @Cron("*/5 * * * *", { name: "notifications" })
  async cron(): Promise<void> {
    if (!this.enabled) return
    await this.tick().catch((err: unknown) => this.logger.error({ err }, "notification tick failed"))
  }

  /** A tick soon (debounced): after a publish or a campaign sent now. */
  kick(): void {
    if (!this.enabled) return
    if (this.kickTimer) clearTimeout(this.kickTimer)
    this.kickTimer = setTimeout(() => {
      this.kickTimer = null
      void this.tick().catch((err: unknown) => this.logger.error({ err }, "notification tick failed"))
    }, KICK_DEBOUNCE_MS)
    this.kickTimer.unref()
  }

  onApplicationShutdown(): void {
    if (this.kickTimer) clearTimeout(this.kickTimer)
  }

  /** One run under the lease; null when another run (here or on another instance) is in progress. */
  async tick(now = new Date()): Promise<TickReport | null> {
    if (this.running) return null
    this.running = true
    try {
      const lease = await this.leases.take(TICK_LEASE, this.holder, now, LEASE_MS)
      if (!lease) return null
      const floor = new Date(now.getTime() - MAX_LOOKBACK_MS)
      const from = lease.watermark && lease.watermark > floor ? lease.watermark : floor
      let report: TickReport | null = null
      try {
        report = await this.steps({ now, from })
        await this.housekeeping(now)
      } finally {
        // The window moves on only once the daily pushes were planned (a failed run is retried next tick).
        const planned = report !== null && !report.errors.some((e) => e.startsWith("plan"))
        await this.leases.release(TICK_LEASE, this.holder, new Date(), planned ? now : undefined)
      }
      return report
    } finally {
      this.running = false
    }
  }

  /** The steps of a run, without the lease. Each step's failure is logged; the others still run. */
  async steps(o: { now: Date; from: Date; userIds?: string[]; campaignIds?: string[] }): Promise<TickReport> {
    const errors: string[] = []
    const step = async <T>(name: string, fn: () => Promise<T>, fallback: T): Promise<T> => {
      try {
        return await fn()
      } catch (err) {
        errors.push(`${name}: ${String(err)}`)
        this.logger.error({ err }, `notifications: ${name} failed`)
        return fallback
      }
    }
    const settings = await this.settings.get()
    const live = await step("live", () => this.content.markLive(o.now), [])
    const planned = await step(
      "plan",
      () => this.planner.plan({ from: o.from, to: o.now, now: o.now, userIds: o.userIds, settings }),
      [],
    )
    const content = await step(
      "content",
      () => this.content.plan({ now: o.now, userIds: o.userIds, settings }),
      [],
    )
    const campaigns = await step(
      "campaigns",
      () =>
        this.campaigns.expandDue({ now: o.now, userIds: o.userIds, campaignIds: o.campaignIds, settings }),
      [],
    )
    const dispatch = await step(
      "dispatch",
      () => this.dispatcher.run({ now: o.now, userIds: o.userIds }),
      null,
    )
    await step("finalize", () => this.campaigns.finalize(o.now), undefined)
    return {
      from: o.from.toISOString(),
      to: o.now.toISOString(),
      live: live.length,
      planned: planned.filter((p) => p.status === "queued" && p.inserted).length,
      skipped: planned.filter((p) => p.status === "skipped" && p.inserted).length,
      content: content.filter((p) => p.inserted).length,
      campaigns,
      dispatch,
      errors,
    }
  }

  /** Once a day (its own lease, never given back early): the log keeps 90 days, skips 14. */
  private async housekeeping(now: Date): Promise<void> {
    const lease = await this.leases.take(DAILY_LEASE, this.holder, now, 23 * 3600_000)
    if (!lease) return
    const sends = await this.db.execute(sql`
      DELETE FROM app.notification_sends
      WHERE created_at < ${ts(now)} - ${`${KEEP_DAYS} days`}::interval
         OR (status = 'skipped' AND created_at < ${ts(now)} - ${`${KEEP_SKIPPED_DAYS} days`}::interval)
    `)
    const batches = await this.db.execute(sql`
      DELETE FROM app.notification_batches WHERE created_at < ${ts(now)} - ${`${KEEP_DAYS} days`}::interval
    `)
    this.logger.log(`housekeeping: ${sends.rowCount ?? 0} sends, ${batches.rowCount ?? 0} batches purged`)
  }
}
