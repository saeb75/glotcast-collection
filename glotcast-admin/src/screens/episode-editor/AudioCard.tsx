"use client"

import { ExternalLink, FileAudio, Upload } from "lucide-react"
import { type DragEvent, useRef, useState } from "react"
import { Button } from "@/components/ui/button"
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card"
import { Checkbox } from "@/components/ui/checkbox"
import { Field, FieldLabel } from "@/components/ui/field"
import { Input } from "@/components/ui/input"
import { Progress } from "@/components/ui/progress"
import { LevelEditorController } from "@/controllers/LevelEditorController"
import { LEVEL } from "@/copy/levels"
import { formatClock } from "@/domain/format"
import { draftKey } from "@/domain/levelDraft"
import { cn } from "@/lib/utils"
import { type Level } from "@/schemas/admin"
import { type AudioCompression } from "@/services/AudioCompressionService"
import { CopyButton } from "@/shared/CopyButton"
import { OptionSelect } from "@/shared/OptionSelect"
import { useLevelEditorStore } from "@/stores/useLevelEditorStore"

const COMPRESSIONS = ["none", "low", "medium", "high"] as const satisfies readonly AudioCompression[]

/** Step 1: the level's audio — upload (compressed in the browser) or paste a URL. Drop a file on the card. */
export function AudioCard({ episodeId, level }: { episodeId: string; level: Level }) {
  const key = draftKey(episodeId, level)
  const audioUrl = useLevelEditorStore((s) => s.drafts[key]?.audioUrl ?? "")
  const duration = useLevelEditorStore((s) => s.drafts[key]?.durationSec ?? null)
  const upload = useLevelEditorStore((s) => s.drafts[key]?.upload)
  const fileRef = useRef<HTMLInputElement>(null)
  const [compression, setCompression] = useState<AudioCompression>("medium")
  const [transcribeAfter, setTranscribeAfter] = useState(true)
  const [dragging, setDragging] = useState(false)
  const busy = upload !== undefined && upload.phase !== "idle"
  const a = LEVEL.audio

  const start = (file: File | undefined) => {
    if (!file || busy) return
    void LevelEditorController.uploadAudio(episodeId, level, file, compression, transcribeAfter)
    if (fileRef.current) fileRef.current.value = ""
  }

  const onDrop = (e: DragEvent) => {
    e.preventDefault()
    setDragging(false)
    start(e.dataTransfer.files[0])
  }

  const commitUrl = (value: string) => LevelEditorController.setAudioUrl(key, value)

  return (
    <Card
      onDragOver={(e) => {
        e.preventDefault()
        setDragging(true)
      }}
      onDragLeave={() => setDragging(false)}
      onDrop={onDrop}
      className={cn(dragging && "ring-2 ring-ring")}
    >
      <CardHeader>
        <CardTitle>{a.title}</CardTitle>
        <CardDescription>{a.hint}</CardDescription>
      </CardHeader>
      <CardContent className="space-y-4">
        {audioUrl ? (
          <div className="flex items-center gap-2 rounded-lg border bg-muted/40 px-3 py-2">
            <FileAudio className="size-4 shrink-0 text-muted-foreground" />
            <div className="min-w-0 flex-1">
              <a
                href={audioUrl}
                target="_blank"
                rel="noreferrer"
                className="block truncate text-sm font-medium hover:underline"
                title={audioUrl}
              >
                {audioUrl.split("/").pop() || audioUrl}
              </a>
              <div className="text-xs text-muted-foreground">
                {duration ? a.duration(formatClock(duration)) : a.noDuration}
              </div>
            </div>
            <CopyButton value={audioUrl} />
            <Button variant="ghost" size="icon-xs" asChild>
              <a href={audioUrl} target="_blank" rel="noreferrer" aria-label={audioUrl}>
                <ExternalLink />
              </a>
            </Button>
          </div>
        ) : null}

        <div className="space-y-2">
          <input
            ref={fileRef}
            type="file"
            accept="audio/*,.mp3,.m4a,.wav,.aac,.ogg,.flac"
            className="hidden"
            onChange={(e) => start(e.target.files?.[0])}
          />
          <Button
            type="button"
            className="w-full"
            variant={audioUrl ? "outline" : "default"}
            disabled={busy}
            onClick={() => fileRef.current?.click()}
          >
            <Upload />
            {audioUrl ? a.replace : a.upload}
          </Button>
          <OptionSelect
            label={a.compression}
            value={compression}
            options={COMPRESSIONS}
            labels={a.presets}
            onChange={setCompression}
            className="w-full"
            disabled={busy}
          />
          <label className="flex items-center gap-2 text-sm text-muted-foreground">
            <Checkbox
              checked={transcribeAfter}
              onCheckedChange={(v) => setTranscribeAfter(v === true)}
              disabled={busy}
            />
            {a.transcribeAfter}
          </label>
          {busy && upload ? (
            <div className="space-y-1">
              <Progress value={Math.round(upload.progress * 100)} />
              <p className="truncate text-xs text-muted-foreground">
                {upload.phase === "compressing"
                  ? a.compressing(Math.round(upload.progress * 100))
                  : a.uploading(Math.round(upload.progress * 100))}
                {upload.fileName ? ` · ${upload.fileName}` : ""}
              </p>
            </div>
          ) : null}
        </div>

        <Field>
          <FieldLabel htmlFor={`${key}-url`}>{a.urlLabel}</FieldLabel>
          <div className="flex gap-2">
            <Input
              id={`${key}-url`}
              key={audioUrl}
              defaultValue={audioUrl}
              placeholder={a.urlPlaceholder}
              disabled={busy}
              className="font-mono text-xs"
              onKeyDown={(e) => {
                if (e.key === "Enter") {
                  e.preventDefault()
                  commitUrl(e.currentTarget.value)
                }
              }}
              onBlur={(e) => commitUrl(e.target.value)}
            />
          </div>
        </Field>
      </CardContent>
    </Card>
  )
}
