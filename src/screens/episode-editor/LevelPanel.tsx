import { type Level } from "@/schemas/admin"
import { AudioCard } from "./AudioCard"
import { LevelSaveCard } from "./LevelSaveCard"
import { TranscriptEditor } from "./TranscriptEditor"
import { TranscriptionCard } from "./TranscriptionCard"

/** One level, top to bottom: audio → transcription → lines → save. */
export function LevelPanel({ episodeId, level }: { episodeId: string; level: Level }) {
  return (
    <div className="grid items-start gap-6 xl:grid-cols-[22rem_minmax(0,1fr)]">
      <div className="space-y-4 xl:sticky xl:top-20">
        <AudioCard episodeId={episodeId} level={level} />
        <TranscriptionCard episodeId={episodeId} level={level} />
        <LevelSaveCard episodeId={episodeId} level={level} />
      </div>
      <TranscriptEditor episodeId={episodeId} level={level} />
    </div>
  )
}
