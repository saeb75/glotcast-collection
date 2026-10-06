"use client"

import { Redo2, Undo2 } from "lucide-react"
import { useCallback, useEffect, useState } from "react"
import { Button } from "@/components/ui/button"
import { Switch } from "@/components/ui/switch"
import { LevelEditorController } from "@/controllers/LevelEditorController"
import { PlayerController } from "@/controllers/PlayerController"
import { LEVEL } from "@/copy/levels"
import { draftKey } from "@/domain/levelDraft"
import { type Level } from "@/schemas/admin"
import { AudioPlayerService } from "@/services/AudioPlayerService"
import { OptionSelect } from "@/shared/OptionSelect"
import { useLevelEditorStore } from "@/stores/useLevelEditorStore"
import { usePlayerStore } from "@/stores/usePlayerStore"

const RATES = ["0.75", "1", "1.25", "1.5"] as const

/**
 * The synced preview: the level's audio, the speed, "follow" (the transcript scrolls with playback), undo and
 * redo. Its length becomes the level's durationSec; its position drives the highlighted line.
 */
export function PlayerBar({ episodeId, level }: { episodeId: string; level: Level }) {
  const key = draftKey(episodeId, level)
  const url = useLevelEditorStore((s) => s.drafts[key]?.audioUrl ?? "")
  const canUndo = useLevelEditorStore((s) => (s.drafts[key]?.past.length ?? 0) > 0)
  const canRedo = useLevelEditorStore((s) => (s.drafts[key]?.future.length ?? 0) > 0)
  const playing = usePlayerStore((s) => s.playing)
  const follow = usePlayerStore((s) => s.follow)
  const rate = usePlayerStore((s) => s.rate)
  const [failedUrl, setFailedUrl] = useState<string | null>(null)

  useEffect(() => {
    PlayerController.load(key)
  }, [key])

  // While playing, follow the playhead more finely than `timeupdate` (4 per second) does.
  useEffect(() => {
    if (!playing) return
    let frame = 0
    const tick = () => {
      PlayerController.time(AudioPlayerService.currentTime())
      frame = requestAnimationFrame(tick)
    }
    frame = requestAnimationFrame(tick)
    return () => cancelAnimationFrame(frame)
  }, [playing])

  const attach = useCallback((el: HTMLAudioElement | null) => {
    AudioPlayerService.attach(el)
    if (el) el.playbackRate = usePlayerStore.getState().rate
    return () => {
      AudioPlayerService.attach(null)
      PlayerController.playing(false)
    }
  }, [])

  return (
    <div className="sticky top-14 z-10 -mx-px space-y-1 rounded-t-xl border-b bg-card/95 px-3 py-2 backdrop-blur">
      <div className="flex flex-wrap items-center gap-2">
        {url ? (
          <audio
            key={url}
            ref={attach}
            src={url}
            preload="metadata"
            controls
            className="h-9 min-w-56 flex-1"
            onLoadedMetadata={(e) => LevelEditorController.setDuration(key, e.currentTarget.duration)}
            onDurationChange={(e) => LevelEditorController.setDuration(key, e.currentTarget.duration)}
            onTimeUpdate={(e) => PlayerController.time(e.currentTarget.currentTime)}
            onPlay={() => PlayerController.playing(true)}
            onPause={() => PlayerController.playing(false)}
            onEnded={() => PlayerController.playing(false)}
            onError={() => setFailedUrl(url)}
          />
        ) : (
          <p className="flex h-9 min-w-56 flex-1 items-center rounded-full bg-muted px-4 text-xs text-muted-foreground">
            {LEVEL.player.noAudio}
          </p>
        )}
        <OptionSelect
          label={LEVEL.player.rate}
          value={String(rate) as (typeof RATES)[number]}
          options={RATES}
          labels={(r) => `${r}×`}
          onChange={(r) => PlayerController.setRate(Number(r))}
          className="h-8 w-20"
        />
        <label className="flex items-center gap-2 text-xs text-muted-foreground">
          <Switch size="sm" checked={follow} onCheckedChange={(v) => PlayerController.setFollow(v)} />
          {LEVEL.editor.follow}
        </label>
        <div className="flex items-center">
          <Button
            variant="ghost"
            size="icon-sm"
            disabled={!canUndo}
            onClick={() => LevelEditorController.undo(key)}
            title={LEVEL.editor.undo}
            aria-label={LEVEL.editor.undo}
          >
            <Undo2 />
          </Button>
          <Button
            variant="ghost"
            size="icon-sm"
            disabled={!canRedo}
            onClick={() => LevelEditorController.redo(key)}
            title={LEVEL.editor.redo}
            aria-label={LEVEL.editor.redo}
          >
            <Redo2 />
          </Button>
        </div>
      </div>
      {url && failedUrl === url ? <p className="text-xs text-destructive">{LEVEL.audio.loadFailed}</p> : null}
    </div>
  )
}
