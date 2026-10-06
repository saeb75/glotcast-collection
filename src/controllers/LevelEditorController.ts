import { deleteLevel, getEpisode, putLevel } from "@/api/episodes"
import { getTranscription, startTranscription } from "@/api/pipeline"
import { errorCode } from "@/api/errors"
import { ERRORS } from "@/copy/common"
import { LEVEL } from "@/copy/levels"
import { LEVEL_LABELS } from "@/copy/status"
import { withData } from "@/domain/cache"
import { formatBytes } from "@/domain/format"
import {
  draftFrom,
  draftKey,
  isDirty,
  type LevelDraft,
  levelInput,
  redo,
  saveProblem,
  undo,
  withChunks,
} from "@/domain/levelDraft"
import { LEVELS, levelOf } from "@/domain/levels"
import { isAudioFile, pollDelay } from "@/domain/media"
import { type ChunkMode, chunksFor } from "@/domain/transcript"
import { type AdminEpisodeDetail, type Level, type TranscriptChunk } from "@/schemas/admin"
import { type AudioCompression, AudioCompressionService } from "@/services/AudioCompressionService"
import { ToastService } from "@/services/ToastService"
import { useEpisodesStore } from "@/stores/useEpisodesStore"
import { useLevelEditorStore } from "@/stores/useLevelEditorStore"
import { toastFailure } from "./load"
import { MediaController } from "./MediaController"

const store = useLevelEditorStore.getState
const episodes = useEpisodesStore.getState

/** Transcription polls in flight, per draft. */
const polls = new Map<string, number>()

function stopPolling(key: string): void {
  const timer = polls.get(key)
  if (timer !== undefined) window.clearTimeout(timer)
  polls.delete(key)
}

/**
 * One level of an episode, from audio to saved transcript: upload (compressed in the browser), transcription
 * (AssemblyAI, polled), the line editor with undo, save and delete. Drafts live in useLevelEditorStore.
 */
export class LevelEditorController {
  static get(key: string): LevelDraft | undefined {
    return store().drafts[key]
  }

  private static patch(key: string, change: (d: LevelDraft) => LevelDraft): void {
    const d = store().drafts[key]
    if (d) store().setDraft(key, change(d))
  }

  /**
   * The episode loaded or saved: drafts without unsaved changes follow it; `forceLevels` (a level just saved
   * or deleted) are reset whatever their state. A running transcription and its result are kept.
   */
  static sync(episode: AdminEpisodeDetail, forceLevels: Level[] = []): void {
    for (const level of LEVELS) {
      const key = draftKey(episode.id, level)
      const saved = levelOf(episode.levels, level) ?? null
      const current = store().drafts[key]
      if (!current) {
        store().setDraft(key, draftFrom(level, saved))
        continue
      }
      if (!forceLevels.includes(level) && isDirty(current)) continue
      if (!forceLevels.includes(level) && current.saved === saved) continue
      const fresh = draftFrom(level, saved)
      store().setDraft(key, {
        ...fresh,
        transcription: current.transcription,
        upload: current.upload,
        // The player knows the real length of the audio on screen.
        durationSec:
          current.audioUrl === fresh.audioUrl && current.durationSec
            ? current.durationSec
            : fresh.durationSec,
      })
    }
  }

  /** The episode is gone: forget its drafts and stop their polls. */
  static forget(episodeId: string): void {
    for (const level of LEVELS) stopPolling(draftKey(episodeId, level))
    store().removeDrafts(episodeId)
  }

  // Audio

  static setAudioUrl(key: string, url: string): void {
    this.patch(key, (d) => {
      const audioUrl = url.trim()
      if (audioUrl === d.audioUrl) return d
      const durationSec = d.saved && audioUrl === d.saved.audioUrl ? d.saved.durationSec : null
      return { ...d, audioUrl, durationSec }
    })
  }

  /** The player read the audio's length. */
  static setDuration(key: string, seconds: number): void {
    if (!Number.isFinite(seconds) || seconds <= 0) return
    this.patch(key, (d) =>
      d.durationSec && Math.abs(d.durationSec - seconds) < 0.01 ? d : { ...d, durationSec: seconds },
    )
  }

  static setDescription(key: string, description: string): void {
    this.patch(key, (d) => ({ ...d, description }))
  }

  /** Compress (optional) → presign → PUT to R2 → the new audio URL; then transcribe when asked. */
  static async uploadAudio(
    episodeId: string,
    level: Level,
    file: File,
    compression: AudioCompression,
    transcribeAfter: boolean,
  ): Promise<void> {
    const key = draftKey(episodeId, level)
    const d = store().drafts[key]
    if (!d || d.upload.phase !== "idle") return
    if (!isAudioFile(file)) return ToastService.error(LEVEL.audio.notAudio)

    const progress = (phase: "compressing" | "uploading") => {
      let last = -1
      return (fraction: number) => {
        const pct = Math.round(fraction * 100)
        if (pct === last) return
        last = pct
        this.patch(key, (x) => ({ ...x, upload: { phase, progress: fraction, fileName: file.name } }))
      }
    }
    const idle = () => this.patch(key, (x) => ({ ...x, upload: { phase: "idle", progress: 0 } }))

    let ready = file
    if (compression !== "none") {
      progress("compressing")(0)
      try {
        ready = await AudioCompressionService.compress(file, compression, progress("compressing"))
        ToastService.info(LEVEL.audio.compressed(formatBytes(file.size), formatBytes(ready.size)))
      } catch (error) {
        idle()
        return ToastService.error(
          LEVEL.audio.compressFailed,
          error instanceof Error ? error.message : undefined,
        )
      }
    }

    progress("uploading")(0)
    try {
      const renamed = new File([ready], `${episodeId.slice(0, 8)}-${level}-${ready.name}`, {
        type: ready.type,
      })
      const url = await MediaController.upload(renamed, "podcasts", progress("uploading"))
      idle()
      this.setAudioUrl(key, url)
      ToastService.success(LEVEL.audio.uploaded)
      if (transcribeAfter) await this.transcribe(key)
    } catch (error) {
      idle()
      toastFailure(error, LEVEL.audio.uploadFailed)
    }
  }

  // Transcription

  static async transcribe(key: string): Promise<void> {
    const d = store().drafts[key]
    if (!d?.audioUrl) return ToastService.error(LEVEL.transcribe.needAudio)
    if (
      d.transcription.status === "starting" ||
      d.transcription.status === "queued" ||
      d.transcription.status === "processing"
    )
      return
    stopPolling(key)
    this.patch(key, (x) => ({ ...x, transcription: { status: "starting" } }))
    try {
      const { jobId } = await startTranscription(d.audioUrl)
      this.patch(key, (x) => ({ ...x, transcription: { status: "queued", jobId, startedAt: Date.now() } }))
      this.schedulePoll(key, 2_000)
    } catch (error) {
      const failure = errorCode(error)
      this.patch(key, (x) => ({
        ...x,
        transcription: { status: "error", error: failure.message || ERRORS[failure.code] },
      }))
      toastFailure(error, LEVEL.transcribe.failed)
    }
  }

  private static schedulePoll(key: string, delay: number): void {
    stopPolling(key)
    polls.set(
      key,
      window.setTimeout(() => void this.poll(key), delay),
    )
  }

  private static async poll(key: string): Promise<void> {
    polls.delete(key)
    const d = store().drafts[key]
    const jobId = d?.transcription.jobId
    if (!d || !jobId) return
    try {
      const result = await getTranscription(jobId)
      const current = store().drafts[key]
      if (!current || current.transcription.jobId !== jobId) return // replaced meanwhile
      if (result.status === "completed") {
        this.patch(key, (x) => ({
          ...x,
          durationSec: x.durationSec ?? result.durationSec ?? null,
          transcription: { ...x.transcription, status: "completed", result },
        }))
        // Nothing on screen yet: take the speaker turns straight away.
        if (current.chunks.length === 0) this.applyMode(key, "utterance", false)
        ToastService.success(LEVEL.transcribe.completed)
        return
      }
      if (result.status === "error") {
        this.patch(key, (x) => ({
          ...x,
          transcription: { ...x.transcription, status: "error", error: result.error },
        }))
        ToastService.error(LEVEL.transcribe.failed, result.error)
        return
      }
      this.patch(key, (x) => ({ ...x, transcription: { ...x.transcription, status: result.status } }))
      this.schedulePoll(key, pollDelay(Date.now() - (current.transcription.startedAt ?? Date.now())))
    } catch (error) {
      // A network blip: keep asking, a little slower.
      if (errorCode(error).code === "not_found") {
        this.patch(key, (x) => ({
          ...x,
          transcription: { ...x.transcription, status: "error", error: ERRORS.not_found },
        }))
        return
      }
      this.schedulePoll(key, 8_000)
    }
  }

  /** Lines from the finished transcription in this grouping (undoable). */
  static applyMode(key: string, mode: ChunkMode, announce = true): void {
    const d = store().drafts[key]
    const result = d?.transcription.result
    if (!d || !result) return
    store().setDraft(key, { ...withChunks(d, chunksFor(result, mode)), mode })
    if (announce && d.chunks.length > 0)
      ToastService.withAction(
        LEVEL.transcribe.applied(LEVEL.transcribe.modeHints[mode]),
        LEVEL.editor.undo,
        () => this.undo(key),
      )
  }

  // The line editor

  /** Any edit of the lines (split, merge, nudge, text, speaker, delete) — one undo step. */
  static edit(key: string, change: (chunks: TranscriptChunk[]) => TranscriptChunk[]): void {
    this.patch(key, (d) => withChunks(d, change(d.chunks)))
  }

  static undo(key: string): void {
    this.patch(key, undo)
  }

  static redo(key: string): void {
    this.patch(key, redo)
  }

  /** Back to what is saved (a running transcription and its result stay). */
  static discard(key: string): void {
    this.patch(key, (d) => ({
      ...draftFrom(d.level, d.saved),
      transcription: d.transcription,
      past: [...d.past, d.chunks].slice(-50),
    }))
  }

  // Save / delete

  static async save(episodeId: string, level: Level): Promise<boolean> {
    const key = draftKey(episodeId, level)
    const d = store().drafts[key]
    if (!d) return false
    const problem = saveProblem(d)
    if (problem) {
      ToastService.error(LEVEL.problems[problem])
      return false
    }
    this.patch(key, (x) => ({ ...x, saving: true }))
    try {
      const episode = await putLevel(episodeId, level, levelInput(d))
      // Keep anything typed while the request was out? The save sent `d`; newer edits stay unsaved.
      const after = store().drafts[key]
      const editedMeanwhile = after && after.chunks !== d.chunks
      episodes().setDetail(episode.id, withData(episode))
      episodes().dropPages()
      if (editedMeanwhile) {
        this.patch(key, (x) => ({ ...x, saving: false, saved: levelOf(episode.levels, level) ?? null }))
      } else {
        this.sync(episode, [level])
      }
      ToastService.success(LEVEL.saved(LEVEL_LABELS[level]))
      return true
    } catch (error) {
      this.patch(key, (x) => ({ ...x, saving: false }))
      toastFailure(error)
      return false
    }
  }

  static async remove(episodeId: string, level: Level): Promise<boolean> {
    const key = draftKey(episodeId, level)
    this.patch(key, (x) => ({ ...x, deleting: true }))
    try {
      await deleteLevel(episodeId, level)
      stopPolling(key)
      const episode = await getEpisode(episodeId)
      episodes().setDetail(episode.id, withData(episode))
      episodes().dropPages()
      this.patch(key, (x) => ({ ...draftFrom(level, null), transcription: x.transcription }))
      this.sync(episode, [level])
      ToastService.success(LEVEL.deleted(LEVEL_LABELS[level]))
      return true
    } catch (error) {
      this.patch(key, (x) => ({ ...x, deleting: false }))
      toastFailure(error)
      return false
    }
  }

  static reset(): void {
    for (const key of [...polls.keys()]) stopPolling(key)
    store().clear()
  }
}
