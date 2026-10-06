/**
 * Pure mapping of the legacy glotcast-vocab rows (public.vocab_words + public.vocab_user_words, keyed by the
 * Strapi user id) to our words. The legacy service stored `detail` as JSON (jsonb or text) and boxes 1–5.
 */
export type LegacyWordRow = {
  word: string | null
  meaning: string | null
  phonetic: string | null
  audio_url: string | null
  detail_text: string | null
  language: string | null
  created_at: Date | string | null
  box_number: number | null
  next_review_date: Date | string | null
  last_reviewed_at: Date | string | null
  correct_count: number | null
  incorrect_count: number | null
}

export interface ImportedWord {
  word: string
  meaning: string
  phonetic: string | null
  audioUrl: string | null
  detail: unknown
  language: string
  box: number
  nextReviewAt: Date
  lastReviewedAt: Date | null
  correctCount: number
  incorrectCount: number
  createdAt: Date
}

const date = (v: Date | string | null): Date | null => {
  if (v === null) return null
  const d = v instanceof Date ? v : new Date(v)
  return Number.isNaN(d.getTime()) ? null : d
}

const blank = (v: string | null): string | null => (v && v.trim() ? v.trim() : null)

/** null when the row has no usable word. A word without a Leitner row starts in box 1, due now. */
export function legacyWord(row: LegacyWordRow, now = new Date()): ImportedWord | null {
  const word = row.word?.trim()
  if (!word) return null
  let detail: unknown = null
  if (row.detail_text) {
    try {
      detail = JSON.parse(row.detail_text)
    } catch {
      detail = null
    }
  }
  const box = Math.min(5, Math.max(1, Math.round(Number(row.box_number ?? 1)) || 1))
  return {
    word,
    meaning: row.meaning?.trim() ?? "",
    phonetic: blank(row.phonetic),
    audioUrl: blank(row.audio_url),
    detail,
    language: blank(row.language) ?? "tr",
    box,
    nextReviewAt: date(row.next_review_date) ?? now,
    lastReviewedAt: date(row.last_reviewed_at),
    correctCount: Math.max(0, Number(row.correct_count ?? 0)),
    incorrectCount: Math.max(0, Number(row.incorrect_count ?? 0)),
    createdAt: date(row.created_at) ?? now,
  }
}
