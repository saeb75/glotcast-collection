import { Inject, Injectable } from "@nestjs/common"
import { type SQL, sql } from "drizzle-orm"
import { containsPattern, iso, isoAt } from "../common/rows"
import { DRIZZLE, type Database } from "../database/database.module"
import { type WordSource } from "../database/schema/app"
import { type Reviewed } from "./leitner"
import { type SavedWord } from "./words.dto"

type WordRow = {
  id: string
  word: string
  meaning: string
  phonetic: string | null
  audio_url: string | null
  detail: unknown
  language: string
  box: number
  next_review_at: Date | string
  last_reviewed_at: Date | string | null
  correct_count: number
  incorrect_count: number
  created_at: Date | string
  source: WordSource | null
}

const COLUMNS = sql`id, word, meaning, phonetic, audio_url, detail, language, box, next_review_at, last_reviewed_at,
  correct_count, incorrect_count, created_at, source`

export const toSavedWord = (r: WordRow): SavedWord => ({
  id: r.id,
  word: r.word,
  meaning: r.meaning,
  phonetic: r.phonetic,
  audioUrl: r.audio_url,
  detail: r.detail ?? null,
  language: r.language,
  box: Math.min(5, Math.max(1, r.box)) as SavedWord["box"],
  nextReviewAt: isoAt(r.next_review_at),
  lastReviewedAt: iso(r.last_reviewed_at),
  correctCount: r.correct_count,
  incorrectCount: r.incorrect_count,
  createdAt: isoAt(r.created_at),
  source: r.source ?? null,
})

export interface NewWord {
  word: string
  meaning: string
  language: string
  phonetic?: string | null
  audioUrl?: string | null
  detail?: unknown
  source?: WordSource | null
}

const json = (v: unknown): SQL =>
  v === undefined || v === null ? sql`NULL` : sql`${JSON.stringify(v)}::jsonb`

/** A user's saved words; every query is scoped to the user. */
@Injectable()
export class WordsRepository {
  constructor(@Inject(DRIZZLE) private readonly db: Database) {}

  private filter(userId: string, box?: number, q?: string): SQL {
    const parts = [sql`user_id = ${userId}`]
    if (box) parts.push(sql`box = ${box}`)
    if (q) parts.push(sql`(word ILIKE ${containsPattern(q)} OR meaning ILIKE ${containsPattern(q)})`)
    return sql.join(parts, sql` AND `)
  }

  async page(userId: string, f: { box?: number; q?: string; limit: number; offset: number }) {
    const where = this.filter(userId, f.box, f.q)
    const [rows, total] = await Promise.all([
      this.db.execute<WordRow>(sql`
        SELECT ${COLUMNS} FROM app.words WHERE ${where} ORDER BY created_at DESC, id LIMIT ${f.limit} OFFSET ${f.offset}
      `),
      this.db.execute<{ n: number }>(sql`SELECT count(*)::int AS n FROM app.words WHERE ${where}`),
    ])
    return { items: rows.rows.map(toSavedWord), total: total.rows[0]?.n ?? 0 }
  }

  async stats(userId: string) {
    const res = await this.db.execute<{ box: number; n: number; due: number }>(sql`
      SELECT box, count(*)::int AS n, count(*) FILTER (WHERE next_review_at <= now())::int AS due
      FROM app.words WHERE user_id = ${userId} GROUP BY box
    `)
    const byBox = { "1": 0, "2": 0, "3": 0, "4": 0, "5": 0 }
    let total = 0
    let due = 0
    for (const r of res.rows) {
      const key = String(r.box) as keyof typeof byBox
      if (key in byBox) byBox[key] = r.n
      total += r.n
      due += r.due
    }
    return { total, byBox, due }
  }

  /** Insert, or update the content of the word the user already saved (same word, any case); Leitner state stays. */
  async upsert(userId: string, w: NewWord): Promise<SavedWord> {
    const res = await this.db.execute<WordRow>(sql`
      INSERT INTO app.words (user_id, word, meaning, language, phonetic, audio_url, detail, source)
      VALUES (${userId}, ${w.word}, ${w.meaning}, ${w.language}, ${w.phonetic ?? null}, ${w.audioUrl ?? null},
              ${json(w.detail)}, ${json(w.source)})
      ON CONFLICT (user_id, lower(word)) DO UPDATE SET
        meaning = excluded.meaning,
        language = excluded.language,
        phonetic = coalesce(excluded.phonetic, app.words.phonetic),
        audio_url = coalesce(excluded.audio_url, app.words.audio_url),
        detail = coalesce(excluded.detail, app.words.detail),
        source = coalesce(app.words.source, excluded.source),
        updated_at = now()
      RETURNING ${COLUMNS}
    `)
    return toSavedWord(res.rows[0]!)
  }

  async get(userId: string, id: string): Promise<SavedWord | null> {
    const res = await this.db.execute<WordRow>(
      sql`SELECT ${COLUMNS} FROM app.words WHERE id = ${id} AND user_id = ${userId}`,
    )
    return res.rows[0] ? toSavedWord(res.rows[0]) : null
  }

  async delete(userId: string, id: string): Promise<void> {
    await this.db.execute(sql`DELETE FROM app.words WHERE id = ${id} AND user_id = ${userId}`)
  }

  async due(userId: string, limit: number): Promise<SavedWord[]> {
    const res = await this.db.execute<WordRow>(sql`
      SELECT ${COLUMNS} FROM app.words WHERE user_id = ${userId} AND next_review_at <= now()
      ORDER BY next_review_at, id LIMIT ${limit}
    `)
    return res.rows.map(toSavedWord)
  }

  async saveReview(userId: string, id: string, r: Reviewed): Promise<SavedWord | null> {
    const res = await this.db.execute<WordRow>(sql`
      UPDATE app.words SET box = ${r.box}, next_review_at = ${r.nextReviewAt.toISOString()},
        last_reviewed_at = ${r.lastReviewedAt.toISOString()}, correct_count = ${r.correctCount},
        incorrect_count = ${r.incorrectCount}, updated_at = now()
      WHERE id = ${id} AND user_id = ${userId}
      RETURNING ${COLUMNS}
    `)
    return res.rows[0] ? toSavedWord(res.rows[0]) : null
  }
}
