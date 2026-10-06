import { Injectable } from "@nestjs/common"
import { sql } from "drizzle-orm"
import { chunk } from "./limit"
import { type Locale } from "./locales"
import { type NotificationKind, type PushData, type PushGroup } from "./payload"
import { type Executor } from "./sql"

/** A row of the outbox / send log to insert. */
export interface NewSend {
  userId: string
  kind: NotificationKind
  grp: PushGroup
  dailySlot: boolean
  campaignId: string | null
  localDate: string
  dueAt: Date
  status: "queued" | "sending" | "skipped"
  skipReason: string | null
  language: Locale
  variant: string | null
  title: string
  body: string
  data: PushData | Record<string, never>
  imageUrl: string | null
  payloadHash: string
  episodeIds: string[]
  createdAt: Date
}

const ROWS_PER_INSERT = 1000

/** Writes send rows; the unique indexes silently drop a row that would be a second push of its kind. */
@Injectable()
export class SendsRepository {
  /** Inserts in order (earlier rows win a daily slot); returns the ids of the rows actually inserted, by index. */
  async insert(db: Executor, rows: NewSend[]): Promise<Map<number, number>> {
    const inserted = new Map<number, number>()
    let offset = 0
    for (const part of chunk(rows, ROWS_PER_INSERT)) {
      const json = JSON.stringify(
        part.map((r, i) => ({
          i: offset + i,
          user_id: r.userId,
          kind: r.kind,
          grp: r.grp,
          daily_slot: r.dailySlot,
          campaign_id: r.campaignId,
          local_date: r.localDate,
          due_at: r.dueAt.toISOString(),
          status: r.status,
          skip_reason: r.skipReason,
          language: r.language,
          variant: r.variant,
          title: r.title,
          body: r.body,
          data: r.data,
          image_url: r.imageUrl,
          payload_hash: r.payloadHash,
          episode_ids: r.episodeIds,
          created_at: r.createdAt.toISOString(),
        })),
      )
      const res = await db.execute<{ id: number; i: number }>(sql`
        WITH input AS (
          SELECT * FROM jsonb_to_recordset(${json}::jsonb) AS x(
            i int, user_id uuid, kind text, grp text, daily_slot boolean, campaign_id uuid, local_date date,
            due_at timestamptz, status text, skip_reason text, language text, variant text, title text, body text,
            data jsonb, image_url text, payload_hash text, episode_ids uuid[], created_at timestamptz)
        ), ins AS (
          INSERT INTO app.notification_sends (user_id, kind, grp, daily_slot, campaign_id, local_date, due_at, status,
            skip_reason, language, variant, title, body, data, image_url, payload_hash, episode_ids, created_at)
          SELECT user_id, kind, grp, daily_slot, campaign_id, local_date, due_at, status, skip_reason, language,
                 variant, title, body, data, image_url, payload_hash, episode_ids, created_at
          FROM input ORDER BY i
          ON CONFLICT DO NOTHING
          RETURNING id, user_id, kind, local_date, campaign_id
        )
        SELECT ins.id, input.i FROM ins
        JOIN input ON input.user_id = ins.user_id AND input.kind = ins.kind AND input.local_date = ins.local_date
          AND input.campaign_id IS NOT DISTINCT FROM ins.campaign_id
      `)
      for (const r of res.rows) inserted.set(Number(r.i), Number(r.id))
      offset += part.length
    }
    return inserted
  }
}
