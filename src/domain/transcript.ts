/**
 * The transcript editor's rules: pure functions over the chunks (times in seconds). Every edit returns new
 * objects, so the store can keep an undo history by reference.
 */
import { type TranscriptChunk, type TranscriptWord, type Transcription } from "@/schemas/admin"

export const CHUNK_MODES = ["utterance", "sentence", "paragraph"] as const
export type ChunkMode = (typeof CHUNK_MODES)[number]

/** The shortest a line may get when its times are nudged. */
export const MIN_LINE = 0.05

export const roundTime = (t: number) => Math.round(t * 100) / 100

const tokens = (text: string) => text.trim().split(/\s+/).filter(Boolean)

/** The grouping of a finished transcription the admin picked. */
export function chunksFor(result: Transcription, mode: ChunkMode): TranscriptChunk[] {
  const chunks = mode === "utterance" ? result.utterances : mode === "sentence" ? result.sentences : result.paragraphs
  return (chunks ?? []).map((c) => ({ ...c, speaker: c.speaker ?? null }))
}

/** Which groupings a finished transcription has. */
export const availableModes = (result: Transcription | undefined): ChunkMode[] =>
  result ? CHUNK_MODES.filter((mode) => chunksFor(result, mode).length > 0) : []

/** The line playing at `t` (start ≤ t < end), or -1 between lines. */
export function activeIndex(chunks: readonly TranscriptChunk[], t: number): number {
  for (let i = 0; i < chunks.length; i++) {
    const c = chunks[i]!
    if (t >= c.start && t < c.end) return i
  }
  return -1
}

/** New text for a line. Word timings stay when the words still line up one-to-one, else they are dropped. */
export function withText(chunk: TranscriptChunk, text: string): TranscriptChunk {
  const next = { ...chunk, text }
  if (!chunk.words?.length) return next
  const words = tokens(text)
  if (words.length === chunk.words.length)
    return { ...next, words: chunk.words.map((w, i) => ({ ...w, text: words[i]! })) }
  const { words: _dropped, ...rest } = next
  return rest
}

export const withSpeaker = (chunk: TranscriptChunk, speaker: string | null): TranscriptChunk => ({
  ...chunk,
  speaker: speaker?.trim() ? speaker.trim() : null,
})

/** The character index where a split at `at` really happens: the end of the word the caret is in. */
function splitPoint(text: string, at: number | undefined): number {
  if (at === undefined) {
    // No caret: the word boundary closest to the middle.
    const middle = text.length / 2
    let best = -1
    for (let i = 1; i < text.length; i++)
      if (/\s/.test(text[i]!) && !/\s/.test(text[i - 1]!) && (best < 0 || Math.abs(i - middle) < Math.abs(best - middle)))
        best = i
    return best
  }
  let i = Math.max(0, Math.min(text.length, at))
  while (i < text.length && i > 0 && !/\s/.test(text[i]!) && !/\s/.test(text[i - 1]!)) i++
  return i
}

/**
 * One line made two at the caret (or near the middle). With word timings the cut falls between the two
 * words; without, the time is shared out by characters. Null when there is nothing on one side.
 */
export function splitChunk(chunk: TranscriptChunk, at?: number): [TranscriptChunk, TranscriptChunk] | null {
  const point = splitPoint(chunk.text, at)
  if (point <= 0) return null
  const firstText = chunk.text.slice(0, point).trim()
  const secondText = chunk.text.slice(point).trim()
  if (!firstText || !secondText) return null
  const { words, ...base } = chunk
  const k = tokens(firstText).length
  if (words && words.length === tokens(chunk.text).length && k > 0 && k < words.length) {
    const w1: TranscriptWord[] = words.slice(0, k)
    const w2: TranscriptWord[] = words.slice(k)
    return [
      { ...base, text: firstText, end: w1[w1.length - 1]!.end, words: w1 },
      { ...base, text: secondText, start: w2[0]!.start, words: w2 },
    ]
  }
  const share = firstText.length / (firstText.length + secondText.length)
  const cut = roundTime(chunk.start + (chunk.end - chunk.start) * share)
  return [
    { ...base, text: firstText, end: cut },
    { ...base, text: secondText, start: cut },
  ]
}

/** Two neighbouring lines as one: the first line's speaker, both texts, the whole time span. */
export function mergeChunks(a: TranscriptChunk, b: TranscriptChunk): TranscriptChunk {
  const merged: TranscriptChunk = {
    text: `${a.text.trim()} ${b.text.trim()}`.trim(),
    speaker: a.speaker ?? b.speaker ?? null,
    start: Math.min(a.start, b.start),
    end: Math.max(a.end, b.end),
  }
  if (a.words?.length && b.words?.length) merged.words = [...a.words, ...b.words]
  return merged
}

/**
 * A line's start or end set to `value` (seconds), kept ≥ 0, within the audio when its length is known, and
 * at least MIN_LINE long.
 */
export function withTime(
  chunk: TranscriptChunk,
  edge: "start" | "end",
  value: number,
  duration?: number | null,
): TranscriptChunk {
  const max = duration && duration > 0 ? duration : Infinity
  if (edge === "start") {
    const start = roundTime(Math.min(Math.max(0, value), chunk.end - MIN_LINE))
    return { ...chunk, start: Math.max(0, start) }
  }
  const end = roundTime(Math.max(Math.min(max, value), chunk.start + MIN_LINE))
  return { ...chunk, end }
}

/** The array with one line replaced. */
export const replaceAt = (chunks: readonly TranscriptChunk[], index: number, ...lines: TranscriptChunk[]) => [
  ...chunks.slice(0, index),
  ...lines,
  ...chunks.slice(index + 1),
]

/** Split line `index`; the same array when it can't be split. */
export function splitAt(chunks: readonly TranscriptChunk[], index: number, at?: number): TranscriptChunk[] {
  const chunk = chunks[index]
  const parts = chunk ? splitChunk(chunk, at) : null
  return parts ? replaceAt(chunks, index, ...parts) : [...chunks]
}

/** Merge line `index` with the next one. */
export function mergeWithNext(chunks: readonly TranscriptChunk[], index: number): TranscriptChunk[] {
  const a = chunks[index]
  const b = chunks[index + 1]
  if (!a || !b) return [...chunks]
  return [...chunks.slice(0, index), mergeChunks(a, b), ...chunks.slice(index + 2)]
}

export const removeAt = (chunks: readonly TranscriptChunk[], index: number) =>
  chunks.filter((_, i) => i !== index)

/** The speakers in use, sorted ("A", "B", …). */
export const speakersOf = (chunks: readonly TranscriptChunk[]) =>
  [...new Set(chunks.map((c) => c.speaker).filter((s): s is string => Boolean(s)))].sort()

/** The next free speaker letter after the ones in use. */
export function nextSpeaker(speakers: readonly string[]): string {
  for (let code = 65; code <= 90; code++) {
    const letter = String.fromCharCode(code)
    if (!speakers.includes(letter)) return letter
  }
  return `S${speakers.length + 1}`
}

/** The transcript as running text (cover prompts). */
export const plainText = (chunks: readonly TranscriptChunk[]) =>
  chunks
    .map((c) => c.text.trim())
    .filter(Boolean)
    .join(" ")

export type IssueKind = "empty" | "range" | "overlap" | "beyond"

export interface Issue {
  index: number
  kind: IssueKind
  /** Errors block saving; the rest are warnings. */
  blocking: boolean
}

/** What is wrong with the lines: empty text and end ≤ start block saving; overlaps and lines past the end warn. */
export function transcriptIssues(chunks: readonly TranscriptChunk[], duration?: number | null): Issue[] {
  const issues: Issue[] = []
  chunks.forEach((c, index) => {
    if (!c.text.trim()) issues.push({ index, kind: "empty", blocking: true })
    if (!(c.end > c.start) || c.start < 0) issues.push({ index, kind: "range", blocking: true })
    const prev = chunks[index - 1]
    if (prev && c.start < prev.end - 0.25) issues.push({ index, kind: "overlap", blocking: false })
    if (duration && c.end > duration + 1) issues.push({ index, kind: "beyond", blocking: false })
  })
  return issues
}

/** A typed time back to seconds: "83.4", "1:23.4", "01:23.45", "1:02:03.5"; null when unreadable. */
export function parseTimestamp(text: string): number | null {
  const value = text.trim()
  if (!value) return null
  if (/^\d+(\.\d+)?$/.test(value)) return Number(value)
  const parts = value.split(":")
  if (parts.length < 2 || parts.length > 3 || parts.some((p) => !/^\d+(\.\d+)?$/.test(p))) return null
  const nums = parts.map(Number)
  const seconds = nums.reduce((total, n) => total * 60 + n, 0)
  return Number.isFinite(seconds) ? roundTime(seconds) : null
}
