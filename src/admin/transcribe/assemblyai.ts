import { type TranscriptChunk } from "../../database/schema/app"

/** An AssemblyAI segment (utterance, sentence or paragraph): times in milliseconds. */
export interface AaiSegment {
  text?: string | null
  start?: number | null
  end?: number | null
  speaker?: string | null
  words?: { text?: string | null; start?: number | null; end?: number | null }[] | null
}

const seconds = (ms: number | null | undefined): number => Math.round(Number(ms ?? 0)) / 1000

/** AssemblyAI segments → our chunks, in seconds, keeping word-level timestamps. */
export function toChunks(segments: AaiSegment[] | null | undefined): TranscriptChunk[] {
  return (segments ?? [])
    .filter((s) => (s.text ?? "").trim())
    .map((s) => ({
      text: (s.text ?? "").trim(),
      speaker: s.speaker ?? null,
      start: seconds(s.start),
      end: seconds(s.end),
      words: (s.words ?? [])
        .filter((w) => (w.text ?? "").trim())
        .map((w) => ({ text: (w.text ?? "").trim(), start: seconds(w.start), end: seconds(w.end) })),
    }))
}

export type JobStatus = "queued" | "processing" | "completed" | "error"

/** AssemblyAI statuses are ours already; anything unexpected counts as still processing. */
export const jobStatus = (status: unknown): JobStatus =>
  status === "queued" || status === "processing" || status === "completed" || status === "error"
    ? status
    : "processing"
