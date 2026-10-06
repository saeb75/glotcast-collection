import { Inject, Injectable } from "@nestjs/common"
import { type SQL, sql } from "drizzle-orm"
import { iso, isoAt, type Stamp } from "../../common/rows"
import { AppConfig } from "../../config/app-config.service"
import { DRIZZLE, type Database } from "../../database/database.module"
import { JobLeases } from "../../notifications/leases"
import { isLocale } from "../../notifications/locales"
import { OneSignalClient } from "../../notifications/onesignal.client"
import {
  linkOf,
  NOTIFICATION_KINDS,
  type NotificationKind,
  type PushData,
  type SendStatus,
} from "../../notifications/payload"
import { TICK_LEASE } from "../../notifications/scheduler"
import { NotificationSettingsService } from "../../notifications/settings.service"
import { type AutomationSettings } from "../../notifications/settings"
import { type AutomationsView, type NotificationsStatus, type SendRow } from "./notifications.dto"

type SendRowDb = {
  id: number
  user_id: string
  email: string | null
  is_anonymous: boolean
  kind: NotificationKind
  variant: string | null
  campaign_id: string | null
  status: SendStatus
  skip_reason: string | null
  language: string
  title: string
  body: string
  data: Partial<PushData>
  local_date: string
  due_at: Date | string
  sent_at: Stamp
  opened_at: Stamp
  created_at: Date | string
}

const toSendRow = (r: SendRowDb): SendRow => ({
  id: Number(r.id),
  user: { id: r.user_id, email: r.email, isAnonymous: r.is_anonymous },
  kind: r.kind,
  variant: r.variant,
  campaignId: r.campaign_id,
  status: r.status,
  skipReason: r.skip_reason,
  language: isLocale(r.language) ? r.language : "en",
  title: r.title,
  body: r.body,
  link: r.data.t ? linkOf({ t: r.data.t, id: r.data.id, lv: r.data.lv }) : { type: "home" },
  localDate: r.local_date,
  dueAt: isoAt(r.due_at),
  sentAt: iso(r.sent_at),
  openedAt: iso(r.opened_at),
  createdAt: isoAt(r.created_at),
})

/** The admin's view of the notifications: status, the automations' settings, the send log. */
@Injectable()
export class AdminNotificationsService {
  constructor(
    @Inject(DRIZZLE) private readonly db: Database,
    private readonly config: AppConfig,
    private readonly onesignal: OneSignalClient,
    private readonly leases: JobLeases,
    private readonly settings: NotificationSettingsService,
  ) {}

  async status(): Promise<NotificationsStatus> {
    const [lastTick, queued] = await Promise.all([
      this.leases.watermark(TICK_LEASE),
      this.db.execute<{ n: number }>(
        sql`SELECT count(*)::int AS n FROM app.notification_sends WHERE status = 'queued'`,
      ),
    ])
    return {
      configured: this.onesignal.configured,
      enabled: this.config.get("NOTIFICATIONS_ENABLED") === true,
      lastTickAt: lastTick?.toISOString() ?? null,
      queued: queued.rows[0]?.n ?? 0,
    }
  }

  async automations(): Promise<AutomationsView> {
    const [settings, status, counts] = await Promise.all([
      this.settings.get(),
      this.status(),
      this.db.execute<{ kind: NotificationKind; sent: number; opened: number }>(sql`
        SELECT kind, count(*) FILTER (WHERE status = 'sent')::int AS sent,
               count(*) FILTER (WHERE opened_at IS NOT NULL)::int AS opened
        FROM app.notification_sends
        WHERE created_at > now() - interval '7 days' AND grp <> 'test'
        GROUP BY kind
      `),
    ])
    const byKind = new Map(counts.rows.map((r) => [r.kind, r]))
    return {
      settings,
      status,
      last7Days: NOTIFICATION_KINDS.filter((k) => k !== "test").map((kind) => ({
        kind,
        sent: byKind.get(kind)?.sent ?? 0,
        opened: byKind.get(kind)?.opened ?? 0,
      })),
    }
  }

  async putAutomations(settings: AutomationSettings, adminId: string | null): Promise<AutomationsView> {
    await this.settings.put(settings, adminId)
    return this.automations()
  }

  /** The send log, newest first, by id cursor. */
  async sends(q: {
    kind?: NotificationKind
    status?: SendStatus
    campaignId?: string
    userId?: string
    limit: number
    before?: number
  }): Promise<{ entries: SendRow[]; nextBefore?: number }> {
    const where: SQL[] = []
    if (q.kind) where.push(sql`s.kind = ${q.kind}`)
    if (q.status) where.push(sql`s.status = ${q.status}`)
    if (q.campaignId) where.push(sql`s.campaign_id = ${q.campaignId}`)
    if (q.userId) where.push(sql`s.user_id = ${q.userId}`)
    if (q.before) where.push(sql`s.id < ${q.before}`)
    const res = await this.db.execute<SendRowDb>(sql`
      SELECT s.id, s.user_id, u.email, u.is_anonymous, s.kind, s.variant, s.campaign_id, s.status, s.skip_reason,
             s.language, s.title, s.body, s.data, s.local_date::text AS local_date, s.due_at, s.sent_at,
             s.opened_at, s.created_at
      FROM app.notification_sends s JOIN app.users u ON u.id = s.user_id
      ${where.length ? sql`WHERE ${sql.join(where, sql` AND `)}` : sql``}
      ORDER BY s.id DESC
      LIMIT ${q.limit}
    `)
    const entries = res.rows.map(toSendRow)
    const last = entries[entries.length - 1]
    return entries.length === q.limit && last ? { entries, nextBefore: last.id } : { entries }
  }
}
