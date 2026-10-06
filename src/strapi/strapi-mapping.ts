import { type Level, type TranscriptChunk, type TranscriptWord } from "../database/schema/app"

/**
 * Pure mapping of Strapi v5 content to ours. The shared.level component's enum was declared as "BG,", "IN,",
 * "AD" (a typo the database kept), and older rows say "Beginner," and the like; transcripts are Whisper-style
 * `{ text, chunks: [{ text, speaker, timestamp: [start, end] }] }`, some in milliseconds.
 */
export function normalizeLevel(raw: unknown): Level | null {
  if (typeof raw !== "string") return null
  const v = raw
    .trim()
    .replace(/^[\s,;.:-]+|[\s,;.:-]+$/g, "")
    .toLowerCase()
  if (v === "bg" || v === "b" || v.startsWith("beg")) return "bg"
  if (v === "in" || v === "int" || v === "i" || v.startsWith("inter")) return "in"
  if (v === "ad" || v === "adv" || v === "a" || v.startsWith("advan")) return "ad"
  return null
}

/** Above this, a transcript's timestamps are milliseconds (no episode is 16+ hours long). */
export const MS_THRESHOLD = 60_000

export interface NormalizedTranscript {
  chunks: TranscriptChunk[]
  /** The last chunk's end (seconds); 0 without chunks. */
  durationSec: number
  /** The timestamps were in milliseconds. */
  milliseconds: boolean
}

const num = (v: unknown): number | null => {
  const n = typeof v === "string" && v.trim() !== "" ? Number(v) : v
  return typeof n === "number" && Number.isFinite(n) ? n : null
}
const round = (n: number): number => Math.round(n * 1000) / 1000

type RawChunk = {
  text?: unknown
  speaker?: unknown
  timestamp?: unknown
  start?: unknown
  end?: unknown
  startTime?: unknown
  endTime?: unknown
  words?: unknown
}

export function normalizeTranscript(raw: unknown): NormalizedTranscript {
  let value: unknown = raw
  if (typeof value === "string") {
    try {
      value = JSON.parse(value)
    } catch {
      value = null
    }
  }
  const list: RawChunk[] = Array.isArray(value)
    ? (value as RawChunk[])
    : Array.isArray((value as { chunks?: unknown } | null)?.chunks)
      ? (value as { chunks: RawChunk[] }).chunks
      : []
  const rows = list
    .filter((c): c is RawChunk => typeof c === "object" && c !== null)
    .map((c) => {
      const ts = Array.isArray(c.timestamp)
        ? (c.timestamp as unknown[])
        : [c.start ?? c.startTime, c.end ?? c.endTime]
      const words = Array.isArray(c.words)
        ? (c.words as { text?: unknown; start?: unknown; end?: unknown }[]).map((w) => ({
            text: String(w?.text ?? "").trim(),
            start: num(w?.start),
            end: num(w?.end),
          }))
        : null
      return {
        text: String(c.text ?? "").trim(),
        speaker: typeof c.speaker === "string" && c.speaker.trim() ? c.speaker.trim() : null,
        start: num(ts[0]),
        end: num(ts[1]),
        words,
      }
    })
  const max = Math.max(0, ...rows.flatMap((r) => [r.start ?? 0, r.end ?? 0]))
  const milliseconds = max > MS_THRESHOLD
  const scale = (v: number | null): number | null => (v === null ? null : milliseconds ? v / 1000 : v)

  const chunks: TranscriptChunk[] = []
  let previousEnd = 0
  rows.forEach((r, i) => {
    const start = scale(r.start) ?? previousEnd
    // Whisper leaves the last chunk's end empty: the next chunk's start, else its own start.
    let end = scale(r.end) ?? scale(rows[i + 1]?.start ?? null) ?? start
    if (end < start) end = start
    previousEnd = end
    if (!r.text) return
    const chunk: TranscriptChunk = { text: r.text, speaker: r.speaker, start: round(start), end: round(end) }
    const words = r.words
      ?.filter((w) => w.text)
      .map((w): TranscriptWord => ({
        text: w.text,
        start: round(scale(w.start) ?? start),
        end: round(scale(w.end) ?? scale(w.start) ?? start),
      }))
    if (words?.length) chunk.words = words
    chunks.push(chunk)
  })
  return { chunks, durationSec: chunks.at(-1)?.end ?? 0, milliseconds }
}

/** Strapi's local upload provider stores "/uploads/x.png": prefix it with the public Strapi URL when known. */
export function absoluteUrl(url: unknown, base?: string | null): string | null {
  if (typeof url !== "string" || !url.trim()) return null
  const u = url.trim()
  if (/^https?:\/\//i.test(u)) return u
  if (u.startsWith("//")) return `https:${u}`
  return base ? `${base.replace(/\/+$/, "")}/${u.replace(/^\/+/, "")}` : u
}

export interface StrapiLevelRow {
  order: number | null
  level: unknown
  url: unknown
  transcript: unknown
  description: unknown
}

export interface MappedLevel {
  level: Level
  audioUrl: string
  description: string | null
  transcript: NormalizedTranscript
}

export interface LevelReport {
  levels: MappedLevel[]
  unknownLevel: number
  noAudio: number
  duplicates: number
}

/** An episode's level components (in component order) → one level each; the first of a duplicated level wins. */
export function mapLevels(rows: StrapiLevelRow[], base?: string | null): LevelReport {
  const report: LevelReport = { levels: [], unknownLevel: 0, noAudio: 0, duplicates: 0 }
  const seen = new Set<Level>()
  for (const row of [...rows].sort((a, b) => (a.order ?? 0) - (b.order ?? 0))) {
    const level = normalizeLevel(row.level)
    if (!level) {
      report.unknownLevel += 1
      continue
    }
    const audioUrl = absoluteUrl(row.url, base)
    if (!audioUrl) {
      report.noAudio += 1
      continue
    }
    if (seen.has(level)) {
      report.duplicates += 1
      continue
    }
    seen.add(level)
    report.levels.push({
      level,
      audioUrl,
      description:
        typeof row.description === "string" && row.description.trim() ? row.description.trim() : null,
      transcript: normalizeTranscript(row.transcript),
    })
  }
  return report
}
