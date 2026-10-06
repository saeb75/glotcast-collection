"use client"

import { Sparkles, Upload, X } from "lucide-react"
import { type DragEvent, useRef, useState } from "react"
import { Button } from "@/components/ui/button"
import { Input } from "@/components/ui/input"
import { Progress } from "@/components/ui/progress"
import { toastFailure } from "@/controllers/load"
import { MediaController } from "@/controllers/MediaController"
import { MEDIA } from "@/copy/media"
import { isImageFile } from "@/domain/media"
import { cn } from "@/lib/utils"
import { type ImageCompression } from "@/services/ImageCompressionService"
import { ToastService } from "@/services/ToastService"
import { CoverThumb } from "./CoverThumb"
import { OptionSelect } from "./OptionSelect"

const COMPRESSIONS = ["none", "low", "medium", "high"] as const satisfies readonly ImageCompression[]

/**
 * A cover or banner URL: paste one, upload a file (compressed in the browser, PUT to R2 through a presigned
 * URL — drop it on the preview too) or open the generator.
 */
export function ImageField({
  id,
  value,
  onChange,
  aspect = "square",
  onGenerate,
  disabled,
  invalid,
}: {
  id?: string
  value: string | null
  onChange: (url: string | null) => void
  aspect?: "square" | "portrait" | "landscape"
  onGenerate?: () => void
  disabled?: boolean
  invalid?: boolean
}) {
  const fileRef = useRef<HTMLInputElement>(null)
  const [progress, setProgress] = useState<number | null>(null)
  const [compression, setCompression] = useState<ImageCompression>("medium")
  const [dragging, setDragging] = useState(false)
  const busy = progress !== null

  const upload = async (file: File | undefined) => {
    if (!file || busy) return
    if (!isImageFile(file)) return ToastService.error(MEDIA.notImage)
    setProgress(0)
    try {
      const url = await MediaController.uploadImage(file, compression, setProgress)
      onChange(url)
      ToastService.success(MEDIA.uploaded)
    } catch (error) {
      toastFailure(error, MEDIA.failed)
    } finally {
      setProgress(null)
      if (fileRef.current) fileRef.current.value = ""
    }
  }

  const commit = (text: string) => {
    const next = text.trim() || null
    if (next !== value) onChange(next)
  }

  const onDrop = (e: DragEvent) => {
    e.preventDefault()
    setDragging(false)
    if (!disabled) void upload(e.dataTransfer.files[0])
  }

  return (
    <div className="flex flex-col gap-3 sm:flex-row sm:items-start">
      <div
        onDragOver={(e) => {
          e.preventDefault()
          setDragging(true)
        }}
        onDragLeave={() => setDragging(false)}
        onDrop={onDrop}
        className={cn("shrink-0 rounded-lg", dragging && "ring-2 ring-ring")}
      >
        <CoverThumb url={value} alt="" aspect={aspect} className={aspect === "landscape" ? "w-40" : "w-28"} />
      </div>
      <div className="min-w-0 flex-1 space-y-2">
        <Input
          id={id}
          key={value ?? ""}
          defaultValue={value ?? ""}
          placeholder={MEDIA.urlPlaceholder}
          disabled={disabled || busy}
          aria-invalid={invalid || undefined}
          onBlur={(e) => commit(e.target.value)}
          onKeyDown={(e) => {
            if (e.key === "Enter") {
              e.preventDefault()
              commit(e.currentTarget.value)
            }
          }}
        />
        <div className="flex flex-wrap items-center gap-2">
          <input
            ref={fileRef}
            type="file"
            accept="image/*"
            className="hidden"
            onChange={(e) => void upload(e.target.files?.[0])}
          />
          <Button
            type="button"
            variant="outline"
            size="sm"
            disabled={disabled || busy}
            onClick={() => fileRef.current?.click()}
          >
            <Upload />
            {MEDIA.upload}
          </Button>
          <OptionSelect
            label={MEDIA.compression}
            value={compression}
            options={COMPRESSIONS}
            labels={MEDIA.presets}
            onChange={setCompression}
            className="h-7 w-40 text-xs"
            disabled={disabled || busy}
          />
          {onGenerate ? (
            <Button
              type="button"
              variant="outline"
              size="sm"
              disabled={disabled || busy}
              onClick={onGenerate}
            >
              <Sparkles />
              {MEDIA.generate}
            </Button>
          ) : null}
          {value ? (
            <Button
              type="button"
              variant="ghost"
              size="sm"
              disabled={disabled || busy}
              onClick={() => onChange(null)}
            >
              <X />
              {MEDIA.remove}
            </Button>
          ) : null}
        </div>
        {busy ? (
          <div className="space-y-1">
            <Progress value={Math.round(progress * 100)} />
            <p className="text-xs text-muted-foreground">{MEDIA.uploading(Math.round(progress * 100))}</p>
          </div>
        ) : null}
      </div>
    </div>
  )
}
