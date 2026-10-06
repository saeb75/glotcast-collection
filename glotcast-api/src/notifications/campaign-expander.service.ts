import { Inject, Injectable, Logger } from "@nestjs/common"
import { type SQL, sql } from "drizzle-orm"
import { DRIZZLE, type Database } from "../database/database.module"
import { type Audience, audienceWhere, REACHABLE } from "./audience"
import { type CampaignDelivery, type CampaignToSend, renderCampaign } from "./campaigns"
import { localeSql } from "./locales"
import { type PushLink } from "./payload"
import { hm } from "./rules"
import { NotificationSettingsService } from "./settings.service"
import { type AutomationSettings } from "./settings"
import { type Executor, onlyUsers, ts, uuidArray } from "./sql"

type CampaignRow = {
  id: string
  name: string
  source_language: "en" | "tr"
  messages: CampaignToSend["messages"]
  audience: Audience
  link: PushLink
  image_url: string | null
  respect_quiet_hours: boolean
  delivery: CampaignDelivery
  send_at: Date | string
}

export interface Expanded {
  campaignId: string
  queued: number
  skipped: number
}

/** `minute` (an SQL int expression) inside the quiet hours, wrap-around included. */
function quietSql(minute: SQL, quiet: { from: string; to: string }): SQL {
  const from = hm(quiet.from)
  const to = hm(quiet.to)
  if (from === to) return sql`false`
  return from < to
    ? sql`(${minute} >= ${from} AND ${minute} < ${to})`
    : sql`(${minute} >= ${from} OR ${minute} < ${to})`
}

/**
 * Turns due campaigns into one send row per reachable user of the audience, in the user's language (fallback en,
 * then the campaign's source). "now" and "at" deliver at that instant, deferred to the end of the user's quiet
 * hours (08:00) when the campaign respects them; "local" delivers at the date and time in each user's zone, and
 * skips users for whom it passed more than an hour ago. Users without a time zone count as UTC.
 */
@Injectable()
export class CampaignExpander {
  private readonly logger = new Logger(CampaignExpander.name)

  constructor(
    @Inject(DRIZZLE) private readonly pool: Database,
    private readonly settingsService: NotificationSettingsService,
  ) {}

  async expandDue(opts: {
    now: Date
    db?: Executor
    userIds?: string[]
    campaignIds?: string[]
    settings?: AutomationSettings
  }): Promise<Expanded[]> {
    const db = opts.db ?? this.pool
    const settings = opts.settings ?? (await this.settingsService.get(db))
    const out: Expanded[] = []
    for (;;) {
      const done = await db.transaction(async (tx) => {
        const res = await tx.execute<CampaignRow>(sql`
          SELECT id, name, source_language, messages, audience, link, image_url, respect_quiet_hours, delivery, send_at
          FROM app.notification_campaigns
          WHERE status = 'scheduled' AND send_at <= ${ts(opts.now)}
            ${opts.campaignIds ? sql`AND id = ANY(${uuidArray(opts.campaignIds)})` : sql``}
          ORDER BY send_at, id
          LIMIT 1
          FOR UPDATE SKIP LOCKED
        `)
        const row = res.rows[0]
        if (!row) return null
        return this.expand(tx, row, opts.now, settings, opts.userIds)
      })
      if (!done) break
      out.push(done)
    }
    return out
  }

  private async expand(
    tx: Executor,
    row: CampaignRow,
    now: Date,
    settings: AutomationSettings,
    userIds?: string[],
  ): Promise<Expanded> {
    const campaign: CampaignToSend = {
      id: row.id,
      name: row.name,
      sourceLanguage: row.source_language,
      messages: row.messages,
      audience: row.audience,
      link: row.link,
      imageUrl: row.image_url,
      respectQuietHours: row.respect_quiet_hours,
    }
    const { data, messages } = renderCampaign(campaign)
    const delivery = row.delivery
    const local = delivery.mode === "local"
    const base =
      delivery.mode === "local"
        ? sql`((${delivery.date}::date + ${delivery.time}::time) AT TIME ZONE l.tz)`
        : sql`${ts(new Date(row.send_at))}`
    const quietTo = sql`${settings.quietHours.to}::time`
    const inserted = await tx.execute<{ status: string; n: number }>(sql`
      WITH ins AS (
        INSERT INTO app.notification_sends (user_id, kind, grp, daily_slot, campaign_id, local_date, due_at, status,
          skip_reason, language, variant, title, body, data, image_url, payload_hash, created_at)
        SELECT u.id, 'campaign', 'campaign', false, ${row.id}, (x.due AT TIME ZONE l.tz)::date, x.due,
               CASE WHEN x.passed THEN 'skipped' ELSE 'queued' END,
               CASE WHEN x.passed THEN 'time_passed' END,
               m.language, NULL, m.title, m.body, ${JSON.stringify(data)}::jsonb, ${row.image_url}, m.hash,
               ${ts(now)}
        FROM app.users u
        CROSS JOIN LATERAL (SELECT coalesce(u.timezone, 'UTC') AS tz, ${localeSql(sql`u.ui_language`)} AS locale) l
        JOIN jsonb_to_recordset(${JSON.stringify(messages)}::jsonb)
             AS m(locale text, language text, title text, body text, hash text) ON m.locale = l.locale
        CROSS JOIN LATERAL (SELECT ${base} AS at) b
        CROSS JOIN LATERAL (SELECT (b.at AT TIME ZONE l.tz) AS local_at) lt
        CROSS JOIN LATERAL (
          SELECT (extract(hour FROM lt.local_at) * 60 + extract(minute FROM lt.local_at))::int AS minute
        ) lm
        CROSS JOIN LATERAL (
          SELECT CASE
                   WHEN ${row.respect_quiet_hours}::boolean AND ${quietSql(sql`lm.minute`, settings.quietHours)} THEN
                     CASE WHEN ((lt.local_at::date + ${quietTo}) AT TIME ZONE l.tz) > b.at
                          THEN ((lt.local_at::date + ${quietTo}) AT TIME ZONE l.tz)
                          ELSE (((lt.local_at::date + 1) + ${quietTo}) AT TIME ZONE l.tz) END
                   ELSE b.at END AS due,
                 (${local}::boolean AND b.at < ${ts(now)} - interval '1 hour') AS passed
        ) x
        WHERE ${REACHABLE} AND ${audienceWhere(campaign.audience, now)} ${onlyUsers(sql`u.id`, userIds)}
        ON CONFLICT DO NOTHING
        RETURNING status
      )
      SELECT status, count(*)::int AS n FROM ins GROUP BY status
    `)
    const count = (status: string) => inserted.rows.find((r) => r.status === status)?.n ?? 0
    const queued = count("queued")
    const skipped = count("skipped")
    await tx.execute(sql`
      UPDATE app.notification_campaigns
      SET status = ${queued > 0 ? "sending" : "sent"}, recipients = ${queued},
          sent_at = ${queued > 0 ? null : ts(now)}, updated_at = ${ts(now)}
      WHERE id = ${row.id}
    `)
    this.logger.log(`campaign ${row.id}: ${queued} queued, ${skipped} skipped`)
    return { campaignId: row.id, queued, skipped }
  }

  /** Campaigns whose rows are all done: sent (or failed, when nothing could be sent). */
  async finalize(now: Date, db: Executor = this.pool): Promise<void> {
    await db.execute(sql`
      UPDATE app.notification_campaigns c
      SET status = CASE WHEN s.sent > 0 OR s.failed = 0 THEN 'sent' ELSE 'failed' END,
          sent_at = coalesce(s.last_sent, ${ts(now)}), updated_at = ${ts(now)}
      FROM (
        SELECT c2.id,
               count(*) FILTER (WHERE ns.status IN ('sent', 'unreachable'))::int AS sent,
               count(*) FILTER (WHERE ns.status = 'failed')::int AS failed,
               count(*) FILTER (WHERE ns.status IN ('queued', 'sending'))::int AS pending,
               max(ns.sent_at) AS last_sent
        FROM app.notification_campaigns c2
        LEFT JOIN app.notification_sends ns ON ns.campaign_id = c2.id
        WHERE c2.status = 'sending'
        GROUP BY c2.id
      ) s
      WHERE c.id = s.id AND s.pending = 0
    `)
  }
}
