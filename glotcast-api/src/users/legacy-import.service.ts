import { Injectable, Logger } from "@nestjs/common"
import { sql } from "drizzle-orm"
import { type Database } from "../database/database.module"
import { words } from "../database/schema/app"
import { legacyWord, type LegacyWordRow } from "./legacy"

type Tx = Parameters<Parameters<Database["transaction"]>[0]>[0]

export interface LegacyImport {
  strapiUserId: number
  follows: number
  words: number
}

const LEGACY_TABLES = [
  "up_users",
  "podcasts",
  "subscriptions",
  "subscriptions_user_lnk",
  "subscriptions_podcast_lnk",
  "vocab_words",
  "vocab_user_words",
] as const

/**
 * Copies an account's data from the legacy stack — the Strapi user found by email in `public.up_users`: its
 * podcast subscriptions (→ follows, podcasts mapped by Strapi documentId) and its glotcast-vocab words with their
 * Leitner state (→ words) — then records `legacy_strapi_user_id`.
 *
 * The legacy tables are read live and never written. Missing tables (a local or test database without the legacy
 * stack) mean "nothing to import". Idempotent: rows already there are left alone, and an account linked once is
 * not imported again (a word the user deleted since stays deleted).
 */
@Injectable()
export class LegacyImportService {
  private readonly logger = new Logger(LegacyImportService.name)

  async importFor(tx: Tx, userId: string, email: string): Promise<LegacyImport | null> {
    const linked = await tx.execute<{ legacy_strapi_user_id: number | null }>(
      sql`SELECT legacy_strapi_user_id FROM app.users WHERE id = ${userId} FOR UPDATE`,
    )
    const row = linked.rows[0]
    if (!row || row.legacy_strapi_user_id !== null) return null
    const present = await this.tables(tx)
    if (!present.has("up_users")) return null

    const found = await tx.execute<{ id: number; feature_access: boolean | null }>(sql`
      SELECT id, feature_access FROM public.up_users
      WHERE lower(email) = lower(${email.trim()})
      ORDER BY id LIMIT 1
    `)
    const legacy = found.rows[0]
    if (!legacy) return null

    let follows = 0
    if (
      present.has("podcasts") &&
      present.has("subscriptions_user_lnk") &&
      present.has("subscriptions_podcast_lnk")
    ) {
      // A subscription links to the podcast's draft and published rows alike: map through the documentId.
      const res = await tx.execute(sql`
        INSERT INTO app.follows (user_id, podcast_id)
        SELECT DISTINCT ${userId}::uuid, ap.id
        FROM public.subscriptions_user_lnk su
        JOIN public.subscriptions_podcast_lnk sp ON sp.subscription_id = su.subscription_id
        JOIN public.podcasts lp ON lp.id = sp.podcast_id
        JOIN app.podcasts ap ON ap.legacy_document_id = lp.document_id
        WHERE su.user_id = ${legacy.id}
        ON CONFLICT DO NOTHING
      `)
      follows = res.rowCount ?? 0
    }

    let imported = 0
    if (present.has("vocab_words")) {
      const leitner = present.has("vocab_user_words")
      const res = await tx.execute<LegacyWordRow>(sql`
        SELECT w.word, w.meaning, w.phonetic, w.audio_url, w.detail::text AS detail_text, w.language,
               w.created_at::timestamptz AS created_at,
               ${
                 leitner
                   ? sql`uw.box_number, uw.next_review_date::timestamptz AS next_review_date,
               uw.last_reviewed_at::timestamptz AS last_reviewed_at, uw.correct_count, uw.incorrect_count`
                   : sql`NULL::int AS box_number, NULL::timestamptz AS next_review_date,
               NULL::timestamptz AS last_reviewed_at, NULL::int AS correct_count, NULL::int AS incorrect_count`
               }
        FROM public.vocab_words w
        ${leitner ? sql`LEFT JOIN public.vocab_user_words uw ON uw.word_id = w.id` : sql``}
        WHERE w.user_id = ${legacy.id}
        ORDER BY w.created_at, w.id
      `)
      const rows = res.rows.flatMap((r) => {
        const w = legacyWord(r)
        return w ? [{ ...w, userId }] : []
      })
      if (rows.length) {
        const inserted = await tx.insert(words).values(rows).onConflictDoNothing().returning({ id: words.id })
        imported = inserted.length
      }
    }

    await tx.execute(sql`
      UPDATE app.users
      SET legacy_strapi_user_id = ${legacy.id},
          legacy_checked_at = now(),
          feature_access = feature_access OR ${legacy.feature_access === true},
          updated_at = now()
      WHERE id = ${userId}
    `)
    this.logger.log({ userId, strapiUserId: legacy.id, follows, words: imported }, "legacy data imported")
    return { strapiUserId: legacy.id, follows, words: imported }
  }

  private async tables(tx: Tx): Promise<Set<string>> {
    const res = await tx.execute<Record<string, string | null>>(
      sql.raw(`SELECT ${LEGACY_TABLES.map((t) => `to_regclass('public.${t}')::text AS ${t}`).join(", ")}`),
    )
    const row = res.rows[0] ?? {}
    return new Set(LEGACY_TABLES.filter((t) => row[t]))
  }
}
