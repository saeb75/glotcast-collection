"use client"

import { ExternalLink, ImageOff, Sparkles, WandSparkles } from "lucide-react"
import { useState } from "react"
import { Button } from "@/components/ui/button"
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card"
import { Field, FieldDescription, FieldLabel } from "@/components/ui/field"
import { Spinner } from "@/components/ui/spinner"
import { Textarea } from "@/components/ui/textarea"
import { ToggleGroup, ToggleGroupItem } from "@/components/ui/toggle-group"
import { CoverController } from "@/controllers/CoverController"
import { COVERS } from "@/copy/covers"
import { cn } from "@/lib/utils"
import { type CoverAspect, type CoverModel, type CoverStyle } from "@/schemas/admin"
import { NEW_COVER_SESSION, useCoverStore } from "@/stores/useCoverStore"
import { CopyButton } from "./CopyButton"
import { OptionSelect } from "./OptionSelect"

const STYLES = [
  "vibrant-gradient",
  "cinematic-photo",
  "minimal-editorial",
  "risograph",
  "bold-pop",
] as const satisfies readonly CoverStyle[]
const MODELS = ["gemini", "openai"] as const satisfies readonly CoverModel[]
const ASPECTS = ["3:4", "4:3", "1:1"] as const satisfies readonly CoverAspect[]
const ASPECT_CLASS: Record<CoverAspect, string> = {
  "3:4": "aspect-[3/4]",
  "4:3": "aspect-[4/3]",
  "1:1": "aspect-square",
}

export interface CoverTextSource {
  id: string
  label: string
  text: string
}

export interface CoverAction {
  label: string
  onUse: (url: string) => unknown
}

/**
 * The content pipeline's cover tool (from whisper-transcriber): a prompt written from a transcript in one of
 * five styles (or typed), an image drawn by Gemini or OpenAI and stored in R2, then "use as cover / banner".
 */
export function CoverGenerator({
  sessionKey,
  podcastName,
  title,
  sources,
  emptyHint,
  hint = COVERS.hint,
  actions,
  className,
}: {
  sessionKey: string
  podcastName: string
  title: string
  sources: CoverTextSource[]
  emptyHint: string
  hint?: string
  actions: CoverAction[]
  className?: string
}) {
  const session = useCoverStore((s) => s.sessions[sessionKey]) ?? NEW_COVER_SESSION
  const [sourceId, setSourceId] = useState<string | undefined>(undefined)
  const [using, setUsing] = useState<string | null>(null)
  const source = sources.find((s) => s.id === sourceId) ?? sources[0]
  const selected = session.selected ?? session.images[0]
  const set = (patch: Parameters<typeof CoverController.set>[1]) => CoverController.set(sessionKey, patch)

  const use = async (action: CoverAction) => {
    if (!selected) return
    setUsing(action.label)
    try {
      await action.onUse(selected)
    } finally {
      setUsing(null)
    }
  }

  return (
    <Card className={className}>
      <CardHeader>
        <CardTitle>{COVERS.title}</CardTitle>
        <CardDescription>{hint}</CardDescription>
      </CardHeader>
      <CardContent className="grid gap-6 lg:grid-cols-[minmax(0,1fr)_minmax(0,22rem)]">
        <div className="space-y-4">
          <div className="flex flex-wrap items-end gap-2">
            {sources.length > 1 ? (
              <Field className="w-auto">
                <FieldLabel>{COVERS.source}</FieldLabel>
                <OptionSelect
                  label={COVERS.source}
                  value={source?.id ?? ""}
                  options={sources.map((s) => s.id)}
                  labels={(id) => sources.find((s) => s.id === id)?.label ?? id}
                  onChange={setSourceId}
                  className="w-48"
                />
              </Field>
            ) : null}
            <Field className="w-auto">
              <FieldLabel>{COVERS.style}</FieldLabel>
              <OptionSelect
                label={COVERS.style}
                value={session.style}
                options={STYLES}
                labels={COVERS.styles}
                onChange={(style) => set({ style })}
                className="w-48"
                disabled={session.writing}
              />
            </Field>
            <Button
              type="button"
              variant="outline"
              disabled={!source || session.writing}
              onClick={() =>
                source &&
                void CoverController.writePrompt(sessionKey, {
                  podcastName,
                  episodeTitle: title,
                  text: source.text,
                })
              }
            >
              {session.writing ? <Spinner /> : <WandSparkles />}
              {session.writing ? COVERS.writing : session.prompt ? COVERS.rewritePrompt : COVERS.writePrompt}
            </Button>
          </div>
          <p className="-mt-2 text-xs text-muted-foreground">
            {source ? COVERS.styleHints[session.style] : emptyHint}
          </p>
          <Field>
            <FieldLabel htmlFor={`${sessionKey}-prompt`}>{COVERS.prompt}</FieldLabel>
            <Textarea
              id={`${sessionKey}-prompt`}
              rows={7}
              value={session.prompt}
              placeholder={COVERS.promptPlaceholder}
              disabled={session.writing}
              onChange={(e) => set({ prompt: e.target.value })}
            />
          </Field>
          <div className="flex flex-wrap items-end gap-3">
            <Field className="w-auto">
              <FieldLabel>{COVERS.model}</FieldLabel>
              <OptionSelect
                label={COVERS.model}
                value={session.model}
                options={MODELS}
                labels={COVERS.models}
                onChange={(model) => set({ model })}
                className="w-52"
                disabled={session.drawing}
              />
            </Field>
            <Field className="w-auto">
              <FieldLabel>{COVERS.aspect}</FieldLabel>
              <ToggleGroup
                type="single"
                variant="outline"
                value={session.aspect}
                onValueChange={(aspect) => aspect && set({ aspect: aspect as CoverAspect })}
                disabled={session.drawing}
              >
                {ASPECTS.map((a) => (
                  <ToggleGroupItem key={a} value={a} aria-label={COVERS.aspects[a]} className="px-3">
                    {a}
                  </ToggleGroupItem>
                ))}
              </ToggleGroup>
            </Field>
            <Button
              type="button"
              className="ml-auto"
              disabled={!session.prompt.trim() || session.drawing || session.writing}
              onClick={() => void CoverController.generate(sessionKey)}
            >
              {session.drawing ? <Spinner /> : <Sparkles />}
              {session.drawing ? COVERS.generating : COVERS.generate}
            </Button>
          </div>
        </div>

        <div className="space-y-3">
          <Field>
            <FieldLabel>{COVERS.results}</FieldLabel>
            <FieldDescription>{COVERS.resultsHint}</FieldDescription>
          </Field>
          <div
            className={cn(
              "flex w-full items-center justify-center overflow-hidden rounded-lg border bg-muted",
              ASPECT_CLASS[session.aspect],
            )}
          >
            {session.drawing ? (
              <Spinner className="size-6 text-muted-foreground" />
            ) : selected ? (
              <img src={selected} alt="" className="size-full object-contain" />
            ) : (
              <div className="flex flex-col items-center gap-2 p-6 text-center text-xs text-muted-foreground">
                <ImageOff className="size-5" />
                {COVERS.noResults}
              </div>
            )}
          </div>
          {selected ? (
            <>
              <div className="flex flex-wrap gap-2">
                {actions.map((action) => (
                  <Button
                    key={action.label}
                    type="button"
                    size="sm"
                    disabled={using !== null}
                    onClick={() => void use(action)}
                  >
                    {using === action.label ? <Spinner /> : null}
                    {action.label}
                  </Button>
                ))}
                <Button type="button" size="sm" variant="ghost" asChild>
                  <a href={selected} target="_blank" rel="noreferrer">
                    <ExternalLink />
                    {COVERS.open}
                  </a>
                </Button>
                <CopyButton value={selected} />
              </div>
              {session.images.length > 1 ? (
                <div className="grid grid-cols-4 gap-2">
                  {session.images.map((url) => (
                    <button
                      key={url}
                      type="button"
                      onClick={() => set({ selected: url })}
                      className={cn(
                        "overflow-hidden rounded-md border outline-none focus-visible:ring-2 focus-visible:ring-ring/50",
                        url === selected && "ring-2 ring-brand",
                      )}
                    >
                      <img src={url} alt="" className="aspect-square w-full object-cover" />
                    </button>
                  ))}
                </div>
              ) : null}
            </>
          ) : null}
        </div>
      </CardContent>
    </Card>
  )
}
