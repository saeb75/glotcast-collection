/** One level being edited in the episode editor: what is saved, what is on screen, and what the save sends. */
import { type AdminEpisodeLevelDetail, type Level, type LevelInput, type TranscriptChunk, type Transcription } from "@/schemas/admin"
import { type ChunkMode, transcriptIssues } from "./transcript"

export type UploadPhase = "idle" | "compressing" | "uploading"
export type TranscribeStatus = "idle" | "starting" | "queued" | "processing" | "completed" | "error"

export interface LevelDraft {
  level: Level
  /** The level as the API has it; null = not created yet. */
  saved: AdminEpisodeLevelDetail | null
  audioUrl: string
  /** From the audio element (or the transcription) once known. */
  durationSec: number | null
  description: string
  chunks: TranscriptChunk[]
  /** Undo / redo stacks of whole transcripts. */
  past: TranscriptChunk[][]
  future: TranscriptChunk[][]
  upload: { phase: UploadPhase; progress: number; fileName?: string }
  transcription: {
    status: TranscribeStatus
    jobId?: string
    error?: string
    result?: Transcription
    startedAt?: number
  }
  /** The grouping the lines came from (null = the saved transcript). */
  mode: ChunkMode | null
  saving: boolean
  deleting: boolean
}

export const HISTORY_LIMIT = 100

/** A fresh draft from the saved level (or an empty one). */
export function draftFrom(level: Level, saved: AdminEpisodeLevelDetail | null): LevelDraft {
  return {
    level,
    saved,
    audioUrl: saved?.audioUrl ?? "",
    durationSec: saved?.durationSec ?? null,
    description: saved?.description ?? "",
    chunks: saved?.transcript.chunks ?? [],
    past: [],
    future: [],
    upload: { phase: "idle", progress: 0 },
    transcription: { status: "idle" },
    mode: null,
    saving: false,
    deleting: false,
  }
}

/** Unsaved changes: the audio, the description or the transcript differ from the saved level. */
export function isDirty(d: LevelDraft): boolean {
  if (!d.saved) return d.audioUrl.trim() !== "" || d.chunks.length > 0 || d.description.trim() !== ""
  return (
    d.audioUrl.trim() !== d.saved.audioUrl ||
    d.description.trim() !== (d.saved.description ?? "") ||
    d.chunks !== d.saved.transcript.chunks
  )
}

export type SaveProblem = "no_audio" | "bad_url" | "no_duration" | "lines" | "busy"

const isUrl = (value: string) => {
  try {
    const u = new URL(value)
    return u.protocol === "https:" || u.protocol === "http:"
  } catch {
    return false
  }
}

/** Why the level can't be saved yet, or null. */
export function saveProblem(d: LevelDraft): SaveProblem | null {
  if (d.saving || d.deleting || d.upload.phase !== "idle") return "busy"
  if (!d.audioUrl.trim()) return "no_audio"
  if (!isUrl(d.audioUrl.trim())) return "bad_url"
  if (!d.durationSec || d.durationSec <= 0) return "no_duration"
  if (transcriptIssues(d.chunks, d.durationSec).some((i) => i.blocking)) return "lines"
  return null
}

/** The PUT body. */
export function levelInput(d: LevelDraft): LevelInput {
  return {
    audioUrl: d.audioUrl.trim(),
    durationSec: Math.round((d.durationSec ?? 0) * 100) / 100,
    description: d.description.trim() ? d.description.trim() : null,
    transcript: { chunks: d.chunks },
  }
}

/** The transcript replaced (an edit): the old one goes on the undo stack, redo is cleared. */
export function withChunks(d: LevelDraft, chunks: TranscriptChunk[]): LevelDraft {
  if (chunks === d.chunks) return d
  return { ...d, chunks, past: [...d.past, d.chunks].slice(-HISTORY_LIMIT), future: [] }
}

export function undo(d: LevelDraft): LevelDraft {
  const previous = d.past[d.past.length - 1]
  if (!previous) return d
  return { ...d, chunks: previous, past: d.past.slice(0, -1), future: [d.chunks, ...d.future] }
}

export function redo(d: LevelDraft): LevelDraft {
  const [next, ...rest] = d.future
  if (!next) return d
  return { ...d, chunks: next, past: [...d.past, d.chunks], future: rest }
}

export const draftKey = (episodeId: string, level: Level) => `${episodeId}:${level}`
