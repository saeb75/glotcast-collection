import {
  BadRequestException,
  ConflictException,
  Inject,
  Injectable,
  NotFoundException,
  ServiceUnavailableException,
} from "@nestjs/common"
import { sql } from "drizzle-orm"
import { type AuthClaims } from "../../auth/auth-verifier"
import { type PageQuery, offsetOf, toPage } from "../../common/pagination"
import { iso, isoAt, type Stamp } from "../../common/rows"
import { AppConfig } from "../../config/app-config.service"
import { DRIZZLE, type Database } from "../../database/database.module"
import { type Audience, audienceWhere, REACHABLE } from "../../notifications/audience"
import {
  type CampaignDelivery,
  type CampaignMessage,
  type CampaignSource,
  type CampaignToSend,
  expandAt,
  messageFor,
} from "../../notifications/campaigns"
import { NotificationEvents } from "../../notifications/events.service"
import { mapLimit } from "../../notifications/limit"
import { isLocale, type Locale, LOCALES, localeOf, localeSql } from "../../notifications/locales"
import { OneSignalClient, type OneSignalStats } from "../../notifications/onesignal.client"
import { campaignRef, type PushLink, pushData } from "../../notifications/payload"
import { TestSendService } from "../../notifications/test-send.service"
import { GoogleTranslateClient } from "../../translate/google-translate.client"
import { googleTarget } from "../../translate/targets"
import {
  type AdminCampaign,
  type CampaignInput,
  type CampaignPatch,
  type CampaignStats,
} from "./notifications.dto"

type Row = {
  id: string
  name: string
  status: AdminCampaign["status"]
  source_language: CampaignSource
  messages: AdminCampaign["messages"]
  audience: Audience
  link: PushLink
  image_url: string | null
  respect_quiet_hours: boolean
  delivery: CampaignDelivery | null
  recipients: number | null
  sent_at: Stamp
  created_by: string | null
  created_by_email: string | null
  created_at: Date | string
  updated_at: Date | string
}

const toCampaign = (r: Row): AdminCampaign => ({
  id: r.id,
  name: r.name,
  status: r.status,
  sourceLanguage: r.source_language,
  messages: r.messages,
  audience: r.audience,
  link: r.link,
  imageUrl: r.image_url,
  respectQuietHours: r.respect_quiet_hours,
  delivery: r.delivery,
  recipients: r.recipients,
  sentAt: iso(r.sent_at),
  createdBy: r.created_by ? { id: r.created_by, email: r.created_by_email } : null,
  createdAt: isoAt(r.created_at),
  updatedAt: isoAt(r.updated_at),
})

const COLUMNS = sql`id, name, status, source_language, messages, audience, link, image_url, respect_quiet_hours,
  delivery, recipients, sent_at, created_by, created_by_email, created_at, updated_at`
const STATS_TTL_MS = 5 * 60_000
const clip = (text: string, max: number) => {
  const chars = [...text.trim()]
  return chars.length <= max
    ? chars.join("")
    : `${chars
        .slice(0, max - 1)
        .join("")
        .trimEnd()}…`
}

/** Admin campaigns: drafts, translation, reach, delivery (now / at / local time), test pushes and stats. */
@Injectable()
export class AdminCampaignsService {
  constructor(
    @Inject(DRIZZLE) private readonly db: Database,
    private readonly config: AppConfig,
    private readonly onesignal: OneSignalClient,
    private readonly google: GoogleTranslateClient,
    private readonly testSend: TestSendService,
    private readonly events: NotificationEvents,
  ) {}

  async page(q: PageQuery & { status?: AdminCampaign["status"] }) {
    const where = q.status ? sql`WHERE status = ${q.status}` : sql``
    const [rows, total] = await Promise.all([
      this.db.execute<Row>(sql`
        SELECT ${COLUMNS} FROM app.notification_campaigns ${where}
        ORDER BY created_at DESC, id LIMIT ${q.pageSize} OFFSET ${offsetOf(q)}
      `),
      this.db.execute<{ n: number }>(sql`SELECT count(*)::int AS n FROM app.notification_campaigns ${where}`),
    ])
    return toPage(rows.rows.map(toCampaign), total.rows[0]?.n ?? 0, q)
  }

  async get(id: string): Promise<AdminCampaign> {
    const res = await this.db.execute<Row>(
      sql`SELECT ${COLUMNS} FROM app.notification_campaigns WHERE id = ${id}`,
    )
    if (!res.rows[0]) throw new NotFoundException(`campaign ${id} not found`)
    return toCampaign(res.rows[0])
  }

  async create(input: CampaignInput, admin: AuthClaims): Promise<AdminCampaign> {
    const res = await this.db.execute<{ id: string }>(sql`
      INSERT INTO app.notification_campaigns (name, source_language, messages, audience, link, image_url,
        respect_quiet_hours, created_by, created_by_email)
      VALUES (${input.name}, ${input.sourceLanguage}, ${JSON.stringify(input.messages)}::jsonb,
        ${JSON.stringify(input.audience)}::jsonb, ${JSON.stringify(input.link)}::jsonb, ${input.imageUrl ?? null},
        ${input.respectQuietHours ?? true}, ${admin.userId}, ${admin.email})
      RETURNING id
    `)
    return this.get(res.rows[0]!.id)
  }

  /** Drafts only (409 otherwise). */
  async update(id: string, patch: CampaignPatch): Promise<AdminCampaign> {
    const campaign = await this.get(id)
    if (campaign.status !== "draft") throw new ConflictException("only a draft can be edited")
    const json = (v: unknown) => sql`${JSON.stringify(v)}::jsonb`
    const sets = [
      patch.name !== undefined && sql`name = ${patch.name}`,
      patch.sourceLanguage !== undefined && sql`source_language = ${patch.sourceLanguage}`,
      patch.messages !== undefined && sql`messages = ${json(patch.messages)}`,
      patch.audience !== undefined && sql`audience = ${json(patch.audience)}`,
      patch.link !== undefined && sql`link = ${json(patch.link)}`,
      patch.imageUrl !== undefined && sql`image_url = ${patch.imageUrl}`,
      patch.respectQuietHours !== undefined && sql`respect_quiet_hours = ${patch.respectQuietHours}`,
    ].filter((s) => s !== false)
    await this.db.execute(sql`
      UPDATE app.notification_campaigns SET ${sql.join([...sets, sql`updated_at = now()`], sql`, `)}
      WHERE id = ${id} AND status = 'draft'
    `)
    return this.get(id)
  }

  /** Drafts and finished campaigns (with their send log); not while scheduled or sending (409). */
  async remove(id: string): Promise<void> {
    const campaign = await this.get(id)
    if (campaign.status === "scheduled" || campaign.status === "sending")
      throw new ConflictException("cancel the campaign first")
    await this.db.execute(sql`DELETE FROM app.notification_campaigns WHERE id = ${id}`)
  }

  /** Queues a draft: expanded into sends by the scheduler at the delivery time ("now": right away). */
  async send(id: string, delivery: CampaignDelivery): Promise<AdminCampaign> {
    const campaign = await this.get(id)
    if (campaign.status !== "draft") throw new ConflictException(`the campaign is ${campaign.status}`)
    if (!campaign.messages[campaign.sourceLanguage])
      throw new BadRequestException(
        `a message in the source language (${campaign.sourceLanguage}) is required`,
      )
    if (!this.onesignal.configured)
      throw new ServiceUnavailableException("push notifications are not configured")
    if (this.config.get("NOTIFICATIONS_ENABLED") !== true)
      throw new ServiceUnavailableException("notifications are disabled (NOTIFICATIONS_ENABLED)")
    const now = new Date()
    if (delivery.mode === "at" && Date.parse(delivery.sendAt) < now.getTime() - 5 * 60_000)
      throw new BadRequestException("sendAt is in the past")
    const res = await this.db.execute(sql`
      UPDATE app.notification_campaigns
      SET status = 'scheduled', delivery = ${JSON.stringify(delivery)}::jsonb,
          send_at = ${expandAt(delivery, now).toISOString()}::timestamptz, updated_at = now()
      WHERE id = ${id} AND status = 'draft'
      RETURNING id
    `)
    if (!res.rows.length) throw new ConflictException("the campaign is no longer a draft")
    if (delivery.mode === "now") this.events.campaignQueued()
    return this.get(id)
  }

  /** Stops a scheduled or sending campaign: its queued sends are canceled. */
  async cancel(id: string): Promise<AdminCampaign> {
    const campaign = await this.get(id)
    if (campaign.status !== "scheduled" && campaign.status !== "sending")
      throw new ConflictException(`the campaign is ${campaign.status}`)
    await this.db.transaction(async (tx) => {
      await tx.execute(sql`
        UPDATE app.notification_sends SET status = 'canceled' WHERE campaign_id = ${id} AND status = 'queued'
      `)
      await tx.execute(sql`
        UPDATE app.notification_campaigns SET status = 'canceled', updated_at = now()
        WHERE id = ${id} AND status IN ('scheduled', 'sending')
      `)
    })
    return this.get(id)
  }

  /** The campaign to one user right now (the caller unless `userId` / `email`), outside caps and quiet hours. */
  async test(
    id: string,
    body: { language?: Locale; userId?: string; email?: string },
    caller: AuthClaims,
  ): Promise<{ onesignalId: string | null }> {
    const campaign = await this.get(id)
    const user = await this.db.execute<{ id: string; ui_language: string | null }>(
      body.userId
        ? sql`SELECT id, ui_language FROM app.users WHERE id = ${body.userId}`
        : body.email
          ? sql`SELECT id, ui_language FROM app.users WHERE lower(email) = lower(${body.email})
                ORDER BY created_at LIMIT 1`
          : sql`SELECT id, ui_language FROM app.users WHERE id = ${caller.userId}`,
    )
    const recipient = user.rows[0]
    if (!recipient)
      throw new NotFoundException("no such app user (sign in to the app with that account first)")
    const found = messageFor(campaign, body.language ?? localeOf(recipient.ui_language))
    if (!found) throw new BadRequestException("the campaign has no message yet")
    const toSend = this.toSend(campaign)
    return this.testSend.send({
      userId: recipient.id,
      language: found.language,
      title: found.message.title,
      body: found.message.body,
      data: pushData(toSend.link, "test", campaignRef(id)),
      imageUrl: toSend.imageUrl,
    })
  }

  /** The title and body in every app language (Google Translation from the source; the source as written). */
  async translate(source: CampaignSource, title: string, body: string) {
    const entries = await mapLimit(LOCALES, 4, async (locale): Promise<[Locale, CampaignMessage]> => {
      if (locale === source) return [locale, { title, body }]
      const [t, b] = await this.google.translate([title, body], googleTarget(locale), source)
      return [locale, { title: clip(t ?? title, 60), body: clip(b ?? body, 180) }]
    })
    return { messages: Object.fromEntries(entries) as Record<Locale, CampaignMessage> }
  }

  /** How many users match an audience, and how many of them a campaign reaches (push on, news on). */
  async reach(audience: Audience) {
    const now = new Date()
    const res = await this.db.execute<{ locale: string; matched: number; reachable: number }>(sql`
      SELECT ${localeSql(sql`u.ui_language`)} AS locale, count(*)::int AS matched,
             count(*) FILTER (WHERE ${REACHABLE})::int AS reachable
      FROM app.users u
      WHERE ${audienceWhere(audience, now)}
      GROUP BY 1
    `)
    const byLanguage = res.rows
      .filter((r) => isLocale(r.locale) && r.reachable > 0)
      .map((r) => ({ language: r.locale as Locale, reachable: r.reachable }))
      .sort((a, b) => b.reachable - a.reachable || a.language.localeCompare(b.language))
    return {
      matched: res.rows.reduce((n, r) => n + r.matched, 0),
      reachable: res.rows.reduce((n, r) => n + r.reachable, 0),
      byLanguage,
    }
  }

  /** Our counts per status and language, plus OneSignal's delivery numbers (cached 5 minutes per batch). */
  async stats(id: string, refresh: boolean): Promise<CampaignStats> {
    const campaign = await this.get(id)
    const [byStatus, byLanguage] = await Promise.all([
      this.db.execute<{ status: string; n: number; opened: number }>(sql`
        SELECT status, count(*)::int AS n, count(opened_at)::int AS opened
        FROM app.notification_sends WHERE campaign_id = ${id} GROUP BY status
      `),
      this.db.execute<{ language: string; recipients: number; opened: number }>(sql`
        SELECT language, count(*)::int AS recipients, count(opened_at)::int AS opened
        FROM app.notification_sends WHERE campaign_id = ${id} AND status <> 'skipped'
        GROUP BY language ORDER BY 2 DESC, 1
      `),
    ])
    const count = (status: string) => byStatus.rows.find((r) => r.status === status)?.n ?? 0
    const { onesignal, refreshedAt } = await this.onesignalStats(id, refresh)
    return {
      recipients: campaign.recipients ?? 0,
      queued: count("queued") + count("sending"),
      sent: count("sent"),
      failed: count("failed") + count("expired"),
      unreachable: count("unreachable"),
      skipped: count("skipped") + count("canceled"),
      opened: byStatus.rows.reduce((n, r) => n + r.opened, 0),
      onesignal,
      byLanguage: byLanguage.rows
        .filter((r) => isLocale(r.language))
        .map((r) => ({ language: r.language as Locale, recipients: r.recipients, opened: r.opened })),
      refreshedAt,
    }
  }

  private async onesignalStats(campaignId: string, refresh: boolean) {
    const res = await this.db.execute<{
      id: string
      onesignal_id: string
      stats: OneSignalStats | null
      stats_at: Stamp
    }>(
      sql`
        SELECT id, onesignal_id, stats, stats_at FROM app.notification_batches
        WHERE campaign_id = ${campaignId} AND onesignal_id IS NOT NULL
      `,
    )
    if (!res.rows.length) return { onesignal: null, refreshedAt: null }
    const now = Date.now()
    const batches = await mapLimit(res.rows, 4, async (b) => {
      const fresh = b.stats_at && now - new Date(iso(b.stats_at)!).getTime() < STATS_TTL_MS
      if ((!refresh && fresh) || !this.onesignal.configured) return b
      try {
        const stats = await this.onesignal.get(b.onesignal_id)
        await this.db.execute(sql`
          UPDATE app.notification_batches SET stats = ${JSON.stringify(stats)}::jsonb, stats_at = now()
          WHERE id = ${b.id}
        `)
        return { ...b, stats, stats_at: new Date() }
      } catch {
        return b // keep what we had
      }
    })
    const known = batches.filter((b) => b.stats)
    if (!known.length) return { onesignal: null, refreshedAt: null }
    const sum = (key: keyof OneSignalStats) => known.reduce((n, b) => n + Number(b.stats![key] ?? 0), 0)
    const oldest = known.reduce((min, b) => Math.min(min, new Date(iso(b.stats_at)!).getTime()), Infinity)
    return {
      onesignal: {
        successful: sum("successful"),
        failed: sum("failed"),
        errored: sum("errored"),
        converted: sum("converted"),
        received: sum("received"),
      },
      refreshedAt: Number.isFinite(oldest) ? new Date(oldest).toISOString() : null,
    }
  }

  private toSend(c: AdminCampaign): CampaignToSend {
    return {
      id: c.id,
      name: c.name,
      sourceLanguage: c.sourceLanguage,
      messages: c.messages,
      audience: c.audience,
      link: c.link,
      imageUrl: c.imageUrl,
      respectQuietHours: c.respectQuietHours,
    }
  }
}
