import { Inject, Injectable } from "@nestjs/common"
import { sql } from "drizzle-orm"
import { isUuid } from "../catalog/catalog.repository"
import { AppConfig } from "../config/app-config.service"
import { DRIZZLE, type Database } from "../database/database.module"
import { CampaignExpander } from "./campaign-expander.service"
import { ContentService } from "./content.service"
import { type MessageKey, type Params, render, variantCount } from "./copy"
import { isLocale, type Locale, localeOf } from "./locales"
import { OneSignalClient } from "./onesignal.client"
import { type PushLink, pushData } from "./payload"
import { type PlannedSend, PlannerService } from "./planner.service"
import { variantIndex } from "./rules"
import { NotificationsScheduler, type TickReport, TICK_LEASE } from "./scheduler"
import { NotificationSettingsService } from "./settings.service"
import { type AutomationSettings } from "./settings"
import { JobLeases } from "./leases"
import { TestSendService } from "./test-send.service"
import { ts } from "./sql"

class DryRunRollback extends Error {}

export interface DryRunRow {
  user: string
  timezone: string
  localTime: string
  kind: string
  variant: string
  language: string
  title: string
  body: string
  due: string
  status: string
}

const TEST_KINDS = ["reminder", "streak_saver", "learning", "new_episodes"] as const

/** `node dist/cli.js notify …`: status, a dry run at any time, a test push, one tick. */
@Injectable()
export class NotifyCliService {
  constructor(
    @Inject(DRIZZLE) private readonly db: Database,
    private readonly config: AppConfig,
    private readonly onesignal: OneSignalClient,
    private readonly settings: NotificationSettingsService,
    private readonly leases: JobLeases,
    private readonly planner: PlannerService,
    private readonly content: ContentService,
    private readonly campaigns: CampaignExpander,
    private readonly scheduler: NotificationsScheduler,
    private readonly testSend: TestSendService,
  ) {}

  async status() {
    const [settings, lastTickAt, counts] = await Promise.all([
      this.settings.get(),
      this.leases.watermark(TICK_LEASE),
      this.db.execute<{ status: string; n: number }>(sql`
        SELECT status, count(*)::int AS n FROM app.notification_sends
        WHERE created_at > now() - interval '24 hours' GROUP BY status ORDER BY status
      `),
    ])
    return {
      configured: this.onesignal.configured,
      enabled: this.config.get("NOTIFICATIONS_ENABLED") === true,
      lastTickAt: lastTickAt?.toISOString() ?? null,
      last24h: Object.fromEntries(counts.rows.map((r) => [r.status, r.n])),
      settings,
    }
  }

  /** A user id, or the account with that email. */
  async resolveUser(ref: string): Promise<string> {
    const res = await this.db.execute<{ id: string }>(
      isUuid(ref)
        ? sql`SELECT id FROM app.users WHERE id = ${ref}`
        : sql`SELECT id FROM app.users WHERE lower(email) = lower(${ref}) ORDER BY created_at LIMIT 1`,
    )
    const id = res.rows[0]?.id
    if (!id) throw new Error(`no user ${ref}`)
    return id
  }

  /**
   * What a tick at `at` would plan — live episodes, daily pushes, new episodes, due campaigns — written in one
   * transaction that is rolled back. Nothing is sent.
   */
  async dryRun(opts: {
    at: Date
    windowMin: number
    user?: string
    /** Preview as if every automation were switched on (with its stored parameters). */
    allOn?: boolean
  }): Promise<{ window: string; rows: DryRunRow[]; live: number }> {
    const userIds = opts.user ? [await this.resolveUser(opts.user)] : undefined
    const from = new Date(opts.at.getTime() - opts.windowMin * 60_000)
    let result: { rows: DryRunRow[]; live: number } = { rows: [], live: 0 }
    try {
      await this.db.transaction(async (tx) => {
        const stored = await this.settings.get(tx)
        const settings: AutomationSettings = opts.allOn
          ? {
              ...stored,
              reminder: { ...stored.reminder, enabled: true },
              streakSaver: { ...stored.streakSaver, enabled: true },
              learning: { ...stored.learning, enabled: true },
              newEpisodes: { ...stored.newEpisodes, enabled: true },
            }
          : stored
        const live = await this.content.markLive(opts.at, tx)
        const planned: PlannedSend[] = [
          ...(await this.planner.plan({ from, to: opts.at, now: opts.at, userIds, db: tx, settings })),
          ...(await this.content.plan({ now: opts.at, userIds, db: tx, settings })),
        ]
        const expanded = await this.campaigns.expandDue({ now: opts.at, userIds, db: tx, settings })
        const campaignRows = expanded.length
          ? await tx.execute<{
              user_id: string
              timezone: string | null
              local_date: string
              due_at: Date | string
              status: string
              skip_reason: string | null
              language: string
              title: string
              body: string
            }>(sql`
              SELECT s.user_id, u.timezone, s.local_date::text AS local_date, s.due_at, s.status, s.skip_reason,
                     s.language, s.title, s.body
              FROM app.notification_sends s JOIN app.users u ON u.id = s.user_id
              WHERE s.campaign_id = ANY(${`{${expanded.map((e) => e.campaignId).join(",")}}`}::uuid[])
                AND s.created_at = ${ts(opts.at)}
              ORDER BY s.due_at, s.id LIMIT 200
            `)
          : { rows: [] }
        const users = [
          ...new Set([...planned.map((p) => p.userId), ...campaignRows.rows.map((r) => r.user_id)]),
        ]
        const emails = users.length
          ? await tx.execute<{ id: string; email: string | null }>(
              sql`SELECT id, email FROM app.users WHERE id = ANY(${`{${users.join(",")}}`}::uuid[])`,
            )
          : { rows: [] }
        const label = new Map(emails.rows.map((r) => [r.id, r.email ?? r.id.slice(0, 8)]))
        const rows: DryRunRow[] = [
          ...planned.map((p) => ({
            user: label.get(p.userId) ?? p.userId,
            timezone: p.timezone,
            localTime: localTime(p.dueAt, p.timezone),
            kind: p.kind,
            variant: p.variant ?? "",
            language: p.language,
            title: p.title,
            body: p.body,
            due: p.dueAt.toISOString(),
            status:
              p.status === "skipped" ? `skipped: ${p.skipReason}` : p.inserted ? "queued" : "dropped (cap)",
          })),
          ...campaignRows.rows.map((r) => ({
            user: label.get(r.user_id) ?? r.user_id,
            timezone: r.timezone ?? "UTC",
            localTime: localTime(new Date(r.due_at), r.timezone ?? "UTC"),
            kind: "campaign",
            variant: "",
            language: r.language,
            title: r.title,
            body: r.body,
            due: new Date(r.due_at).toISOString(),
            status: r.status === "skipped" ? `skipped: ${r.skip_reason}` : r.status,
          })),
        ]
        result = { rows, live: live.length }
        throw new DryRunRollback()
      })
    } catch (err) {
      if (!(err instanceof DryRunRollback)) throw err
    }
    return { window: `${from.toISOString()} → ${opts.at.toISOString()}`, ...result }
  }

  /** A sample push of an automation to one user, in their language (or `lang`). */
  async test(opts: { user: string; kind?: string; lang?: string }) {
    const userId = await this.resolveUser(opts.user)
    const kind = (opts.kind ?? "reminder") as (typeof TEST_KINDS)[number]
    if (!TEST_KINDS.includes(kind)) throw new Error(`--kind must be one of ${TEST_KINDS.join(", ")}`)
    if (opts.lang && !isLocale(opts.lang)) throw new Error(`--lang must be an app language`)
    const res = await this.db.execute<{ ui_language: string | null }>(
      sql`SELECT ui_language FROM app.users WHERE id = ${userId}`,
    )
    const language: Locale = opts.lang && isLocale(opts.lang) ? opts.lang : localeOf(res.rows[0]?.ui_language)
    const { key, params, link, imageUrl } = await this.sample(kind)
    const today = new Date().toISOString().slice(0, 10)
    const text = render(language, key, variantIndex(userId, today, variantCount(key)), params)
    const sent = await this.testSend.send({
      userId,
      language,
      title: text.title,
      body: text.body,
      data: pushData(link, "test", kind),
      imageUrl,
      variant: text.variant,
    })
    return { userId, language, ...text, ...sent }
  }

  private async sample(
    kind: (typeof TEST_KINDS)[number],
  ): Promise<{ key: MessageKey; params: Params; link: PushLink; imageUrl: string | null }> {
    if (kind === "streak_saver")
      return { key: "streakSaver", params: { count: 7 }, link: { type: "home" }, imageUrl: null }
    if (kind === "learning")
      return { key: "wordsDue", params: { count: 12 }, link: { type: "review" }, imageUrl: null }
    if (kind === "new_episodes") {
      const res = await this.db.execute<{
        id: string
        title: string
        podcast: string
        cover: string | null
      }>(sql`
        SELECT e.id, e.title, p.name AS podcast, coalesce(e.cover_url, p.cover_url) AS cover
        FROM app.episodes e JOIN app.podcasts p ON p.id = e.podcast_id
        WHERE e.published_at <= now() AND p.published_at <= now()
        ORDER BY e.published_at DESC LIMIT 1
      `)
      const e = res.rows[0]
      if (e)
        return {
          key: "newEpisodeFollowed",
          params: { title: e.title, podcast: e.podcast },
          link: { type: "episode", id: e.id },
          imageUrl: e.cover,
        }
    }
    return { key: "generic", params: {}, link: { type: "home" }, imageUrl: null }
  }

  async tick(): Promise<TickReport | null> {
    if (!this.onesignal.configured)
      throw new Error("OneSignal is not configured (ONESIGNAL_APP_ID, ONESIGNAL_API_KEY)")
    if (this.config.get("NOTIFICATIONS_ENABLED") !== true)
      throw new Error(
        "NOTIFICATIONS_ENABLED is false: nothing is planned or sent (use `notify dry-run` to preview)",
      )
    return this.scheduler.tick()
  }
}

function localTime(at: Date, timezone: string): string {
  return new Intl.DateTimeFormat("en-GB", {
    timeZone: timezone,
    weekday: "short",
    hour: "2-digit",
    minute: "2-digit",
    hour12: false,
  }).format(at)
}
