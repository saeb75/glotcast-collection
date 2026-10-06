import { randomUUID } from "node:crypto"
import { Inject, Injectable, Logger } from "@nestjs/common"
import { sql } from "drizzle-orm"
import { AppConfig } from "../config/app-config.service"
import { DRIZZLE, type Database } from "../database/database.module"
import { chunk, mapLimit } from "./limit"
import { MAX_RECIPIENTS, OneSignalClient, OneSignalRejected, type OneSignalResult } from "./onesignal.client"
import { type PushData, type PushGroup } from "./payload"
import { onlyUsers, ts, uuidArray } from "./sql"

/** Rows claimed per round. */
const CLAIM = 50_000
/** A batch still pending after this long (a crash, OneSignal down) is sent again with the same idempotency key. */
const RESEND_AFTER_MIN = 10
/** …until it is this old: then it failed. */
const GIVE_UP_AFTER_HOURS = 6

type Claimed = {
  id: number
  user_id: string
  kind: string
  grp: PushGroup
  campaign_id: string | null
  language: string
  title: string
  body: string
  data: PushData
  image_url: string | null
  payload_hash: string
}

export interface Batch {
  id: string
  kind: string
  grp: PushGroup
  campaignId: string | null
  language: string
  title: string
  body: string
  data: PushData
  imageUrl: string | null
  userIds: string[]
}

export interface DispatchReport {
  expired: number
  batches: number
  sent: number
  unreachable: number
  failed: number
  pending: number
}

/**
 * Sends what is due: claims queued rows (FOR UPDATE SKIP LOCKED, so instances never share a row), groups rows with
 * the same payload into OneSignal batches of at most 20,000 users (a batch row first, its id = OneSignal's
 * idempotency key), sends them a few at a time and records the outcome per row. A batch that never got an answer
 * stays pending and is sent again later with the same key — OneSignal drops the duplicate.
 */
@Injectable()
export class DispatcherService {
  private readonly logger = new Logger(DispatcherService.name)
  private readonly concurrency: number

  constructor(
    @Inject(DRIZZLE) private readonly db: Database,
    private readonly onesignal: OneSignalClient,
    config: AppConfig,
  ) {
    this.concurrency = config.get("ONESIGNAL_CONCURRENCY") ?? 4
  }

  async run(opts: { now: Date; userIds?: string[] }): Promise<DispatchReport> {
    const report: DispatchReport = { expired: 0, batches: 0, sent: 0, unreachable: 0, failed: 0, pending: 0 }
    report.expired = await this.expire(opts.now, opts.userIds)
    for (const batch of await this.stale(opts.now, opts.userIds)) await this.send(batch, opts.now, report)
    for (;;) {
      const { batches, claimed } = await this.claim(opts.now, opts.userIds)
      if (!batches.length) break
      await mapLimit(batches, this.concurrency, (batch) => this.send(batch, opts.now, report))
      if (claimed < CLAIM) break
    }
    if (report.batches) this.logger.log({ ...report }, "dispatched")
    return report
  }

  /** Queued rows nobody sent in time (the scheduler was down): a reminder is stale after 2 h, a campaign 12 h. */
  async expire(now: Date, userIds?: string[]): Promise<number> {
    const res = await this.db.execute(sql`
      UPDATE app.notification_sends SET status = 'expired'
      WHERE status = 'queued' ${onlyUsers(sql`user_id`, userIds)}
        AND due_at < ${ts(now)} - CASE WHEN grp = 'campaign' THEN interval '12 hours' ELSE interval '2 hours' END
    `)
    return res.rowCount ?? 0
  }

  private async claim(now: Date, userIds?: string[]): Promise<{ batches: Batch[]; claimed: number }> {
    return this.db.transaction(async (tx) => {
      const res = await tx.execute<Claimed>(sql`
        WITH due AS (
          SELECT id FROM app.notification_sends
          WHERE status = 'queued' AND due_at <= ${ts(now)} ${onlyUsers(sql`user_id`, userIds)}
          ORDER BY due_at, id
          LIMIT ${CLAIM}
          FOR UPDATE SKIP LOCKED
        )
        UPDATE app.notification_sends s SET status = 'sending' FROM due WHERE s.id = due.id
        RETURNING s.id, s.user_id, s.kind, s.grp, s.campaign_id, s.language, s.title, s.body, s.data, s.image_url,
                  s.payload_hash
      `)
      const groups = new Map<string, Claimed[]>()
      for (const row of res.rows) {
        const group = groups.get(row.payload_hash) ?? []
        group.push(row)
        groups.set(row.payload_hash, group)
      }
      const batches: Batch[] = []
      for (const rows of groups.values()) {
        for (const part of chunk(rows, MAX_RECIPIENTS)) {
          const first = part[0]!
          const batch: Batch = {
            id: randomUUID(),
            kind: first.kind,
            grp: first.grp,
            campaignId: first.campaign_id,
            language: first.language,
            title: first.title,
            body: first.body,
            data: first.data,
            imageUrl: first.image_url,
            userIds: part.map((r) => r.user_id),
          }
          await tx.execute(sql`
            INSERT INTO app.notification_batches (id, campaign_id, kind, language, recipients, status, created_at)
            VALUES (${batch.id}, ${batch.campaignId}, ${batch.kind}, ${batch.language}, ${part.length}, 'pending',
                    ${ts(now)})
          `)
          await tx.execute(sql`
            UPDATE app.notification_sends SET batch_id = ${batch.id}
            WHERE id = ANY(${`{${part.map((r) => r.id).join(",")}}`}::bigint[])
          `)
          batches.push(batch)
        }
      }
      return { batches, claimed: res.rows.length }
    })
  }

  /** Pending batches that never got an answer: again with the same key, or failed once too old. */
  private async stale(now: Date, userIds?: string[]): Promise<Batch[]> {
    const res = await this.db.execute<{
      id: string
      kind: string
      campaign_id: string | null
      language: string
      created_at: Date | string
      rows: Claimed[]
    }>(sql`
      SELECT b.id, b.kind, b.campaign_id, b.language, b.created_at,
             json_agg(json_build_object('user_id', s.user_id, 'grp', s.grp, 'title', s.title, 'body', s.body,
                                        'data', s.data, 'image_url', s.image_url)) AS rows
      FROM app.notification_batches b
      JOIN app.notification_sends s ON s.batch_id = b.id AND s.status = 'sending'
      WHERE b.status = 'pending' AND b.created_at < ${ts(now)} - ${`${RESEND_AFTER_MIN} minutes`}::interval
        ${onlyUsers(sql`s.user_id`, userIds)}
      GROUP BY b.id
    `)
    const out: Batch[] = []
    for (const b of res.rows) {
      if (new Date(b.created_at).getTime() < now.getTime() - GIVE_UP_AFTER_HOURS * 3600_000) {
        await this.fail(b.id, "no answer from OneSignal", now)
        continue
      }
      const first = b.rows[0]!
      out.push({
        id: b.id,
        kind: b.kind,
        grp: first.grp,
        campaignId: b.campaign_id,
        language: b.language,
        title: first.title,
        body: first.body,
        data: first.data,
        imageUrl: first.image_url,
        userIds: b.rows.map((r) => r.user_id),
      })
    }
    return out
  }

  private async send(batch: Batch, now: Date, report: DispatchReport): Promise<void> {
    report.batches += 1
    let result: OneSignalResult
    try {
      result = await this.onesignal.send({
        externalIds: batch.userIds,
        title: batch.title,
        body: batch.body,
        data: batch.data,
        imageUrl: batch.imageUrl,
        group: batch.grp,
        idempotencyKey: batch.id,
        name: `${batch.kind}${batch.campaignId ? ` ${batch.campaignId.slice(0, 8)}` : ""} · ${batch.language}`,
      })
    } catch (err) {
      if (err instanceof OneSignalRejected) {
        await this.fail(batch.id, `${err.status}: ${err.message}`, now)
        report.failed += batch.userIds.length
      } else {
        // Left pending: sent again (same key) on a later tick.
        await this.db.execute(sql`
          UPDATE app.notification_batches SET attempts = attempts + 1, error = ${String(err).slice(0, 500)}
          WHERE id = ${batch.id}
        `)
        report.pending += batch.userIds.length
        this.logger.warn({ batch: batch.id, err: String(err) }, "push batch left pending")
      }
      return
    }
    const unreachable = result.notSubscribed ? batch.userIds : result.invalidExternalIds
    await this.record(batch.id, result.notSubscribed ? "empty" : "sent", result.id, unreachable, now)
    report.unreachable += unreachable.length
    report.sent += batch.userIds.length - unreachable.length
  }

  /** The batch's outcome on its rows: sent, or unreachable for users without a push subscription. */
  async record(
    batchId: string,
    status: "sent" | "empty",
    onesignalId: string | null,
    unreachable: string[],
    now: Date,
  ): Promise<void> {
    await this.db.transaction(async (tx) => {
      await tx.execute(sql`
        UPDATE app.notification_batches
        SET status = ${status}, onesignal_id = ${onesignalId}, attempts = attempts + 1, error = NULL,
            sent_at = ${ts(now)}
        WHERE id = ${batchId}
      `)
      await tx.execute(sql`
        UPDATE app.notification_sends
        SET status = CASE WHEN user_id = ANY(${uuidArray(unreachable)}) THEN 'unreachable' ELSE 'sent' END,
            sent_at = ${ts(now)}
        WHERE batch_id = ${batchId} AND status = 'sending'
      `)
    })
  }

  async fail(batchId: string, error: string, now: Date): Promise<void> {
    await this.db.transaction(async (tx) => {
      await tx.execute(sql`
        UPDATE app.notification_batches
        SET status = 'failed', error = ${error.slice(0, 500)}, attempts = attempts + 1, sent_at = ${ts(now)}
        WHERE id = ${batchId}
      `)
      await tx.execute(sql`
        UPDATE app.notification_sends SET status = 'failed' WHERE batch_id = ${batchId} AND status = 'sending'
      `)
    })
  }
}
