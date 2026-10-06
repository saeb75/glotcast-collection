"use client"

import { CircleAlert, CircleCheck, Mic } from "lucide-react"
import { Button } from "@/components/ui/button"
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card"
import { Spinner } from "@/components/ui/spinner"
import { ToggleGroup, ToggleGroupItem } from "@/components/ui/toggle-group"
import { LevelEditorController } from "@/controllers/LevelEditorController"
import { LEVEL } from "@/copy/levels"
import { formatListening } from "@/domain/format"
import { draftKey } from "@/domain/levelDraft"
import { availableModes, type ChunkMode, chunksFor } from "@/domain/transcript"
import { type Level } from "@/schemas/admin"
import { useNow } from "@/shared/useNow"
import { useLevelEditorStore } from "@/stores/useLevelEditorStore"

/** Step 2: AssemblyAI (POST /admin/transcribe, then polled); step 3: which lines to take from it. */
export function TranscriptionCard({ episodeId, level }: { episodeId: string; level: Level }) {
  const key = draftKey(episodeId, level)
  const t = useLevelEditorStore((s) => s.drafts[key]?.transcription)
  const mode = useLevelEditorStore((s) => s.drafts[key]?.mode ?? null)
  const hasAudio = useLevelEditorStore((s) => Boolean(s.drafts[key]?.audioUrl))
  const uploading = useLevelEditorStore((s) => s.drafts[key]?.upload.phase !== "idle")
  const running = t?.status === "starting" || t?.status === "queued" || t?.status === "processing"
  const now = useNow(running)
  const c = LEVEL.transcribe
  const modes = availableModes(t?.result)

  const label =
    t?.status === "starting" ? c.starting : t?.status === "queued" ? c.queued : t?.status === "processing" ? c.processing : null

  return (
    <Card>
      <CardHeader>
        <CardTitle>{c.title}</CardTitle>
        <CardDescription>{c.hint}</CardDescription>
      </CardHeader>
      <CardContent className="space-y-4">
        {running ? (
          <div className="flex items-start gap-2 rounded-lg border bg-muted/40 px-3 py-2 text-sm">
            <Spinner className="mt-0.5" />
            <div>
              <div>{label}</div>
              {t?.startedAt ? (
                <div className="text-xs text-muted-foreground">
                  {c.elapsed(formatListening(Math.max(0, (now - t.startedAt) / 1000)))}
                </div>
              ) : null}
            </div>
          </div>
        ) : t?.status === "error" ? (
          <div className="flex items-start gap-2 rounded-lg border border-destructive/40 bg-destructive/5 px-3 py-2 text-sm text-destructive">
            <CircleAlert className="mt-0.5 size-4 shrink-0" />
            <div>
              <div className="font-medium">{c.failed}</div>
              {t.error ? <div className="text-xs">{t.error}</div> : null}
            </div>
          </div>
        ) : t?.status === "completed" ? (
          <div className="flex items-center gap-2 text-sm text-positive">
            <CircleCheck className="size-4" />
            {c.completed}
          </div>
        ) : null}

        {modes.length && t?.result ? (
          <div className="space-y-1.5">
            <div className="text-sm font-medium">{c.chunkMode}</div>
            <ToggleGroup
              type="single"
              variant="outline"
              value={mode ?? ""}
              onValueChange={(value) => value && LevelEditorController.applyMode(key, value as ChunkMode)}
              className="w-full"
            >
              {modes.map((m) => (
                <ToggleGroupItem key={m} value={m} className="flex-1 flex-col gap-0 py-5" title={c.modeHints[m]}>
                  <span>{c.modes[m]}</span>
                  <span className="text-[11px] font-normal text-muted-foreground">
                    {c.lines(chunksFor(t.result!, m).length)}
                  </span>
                </ToggleGroupItem>
              ))}
            </ToggleGroup>
          </div>
        ) : null}

        <Button
          type="button"
          variant={t?.status === "completed" ? "outline" : "default"}
          disabled={!hasAudio || running || uploading}
          onClick={() => void LevelEditorController.transcribe(key)}
        >
          {running ? <Spinner /> : <Mic />}
          {t?.status === "completed" || t?.status === "error" ? c.again : c.start}
        </Button>
        {!hasAudio ? <p className="text-xs text-muted-foreground">{c.needAudio}</p> : null}
      </CardContent>
    </Card>
  )
}
