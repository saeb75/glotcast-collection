"use client"

import { Languages, TriangleAlert } from "lucide-react"
import { useState } from "react"
import { Button } from "@/components/ui/button"
import { Card, CardContent, CardDescription, CardFooter, CardHeader, CardTitle } from "@/components/ui/card"
import { Field, FieldDescription, FieldError, FieldGroup, FieldLabel } from "@/components/ui/field"
import { Input } from "@/components/ui/input"
import { Spinner } from "@/components/ui/spinner"
import { Textarea } from "@/components/ui/textarea"
import { ToggleGroup, ToggleGroupItem } from "@/components/ui/toggle-group"
import { CampaignEditorController } from "@/controllers/CampaignEditorController"
import { CAMPAIGNS } from "@/copy/campaigns"
import {
  BODY_MAX,
  localeName,
  messageProblem,
  NAME_MAX,
  overwrittenByTranslate,
  SOURCE_LANGUAGES,
  TITLE_MAX,
} from "@/domain/campaign"
import { type CampaignSource } from "@/schemas/admin"
import { ConfirmDialog } from "@/shared/ConfirmDialog"
import { type CampaignEditor } from "@/stores/useCampaignEditorStore"
import { CharCounter } from "./CharCounter"

/** The internal name, the source language, the title and message in it, and "Translate to all languages". */
export function MessageCard({
  editorKey,
  editor,
  translating,
}: {
  editorKey: string
  editor: CampaignEditor
  translating: boolean
}) {
  const [confirming, setConfirming] = useState(false)
  const { draft, errors, machine, translatedFrom } = editor
  const source = draft.sourceLanguage
  const message = draft.messages[source]
  const m = CAMPAIGNS.editor.message
  const titleKey = `messages.${source}.title`
  const bodyKey = `messages.${source}.body`
  const canTranslate = messageProblem(message) === null
  const overwritten = overwrittenByTranslate(draft.messages, machine, source)
  const stale =
    translatedFrom !== null &&
    (translatedFrom.source !== source ||
      translatedFrom.title !== message.title.trim() ||
      translatedFrom.body !== message.body.trim())

  const translate = () => {
    if (overwritten.length > 0) setConfirming(true)
    else void CampaignEditorController.translate(editorKey)
  }

  return (
    <Card>
      <CardHeader>
        <CardTitle>{m.title}</CardTitle>
        <CardDescription>{m.hint}</CardDescription>
      </CardHeader>
      <CardContent>
        <FieldGroup>
          <div className="grid gap-4 sm:grid-cols-[minmax(0,1fr)_auto]">
            <Field data-invalid={errors.name ? true : undefined}>
              <FieldLabel htmlFor="campaign-name">{m.name}</FieldLabel>
              <Input
                id="campaign-name"
                value={draft.name}
                maxLength={NAME_MAX}
                placeholder={m.namePlaceholder}
                autoFocus={editor.base === null}
                aria-invalid={errors.name ? true : undefined}
                onChange={(e) => CampaignEditorController.setName(editorKey, e.target.value)}
              />
              {errors.name ? (
                <FieldError>{errors.name}</FieldError>
              ) : (
                <FieldDescription>{m.nameHint}</FieldDescription>
              )}
            </Field>
            <Field>
              <FieldLabel>{m.source}</FieldLabel>
              <ToggleGroup
                type="single"
                variant="outline"
                value={source}
                aria-label={m.source}
                onValueChange={(value) =>
                  value && CampaignEditorController.setSource(editorKey, value as CampaignSource)
                }
              >
                {SOURCE_LANGUAGES.map((l) => (
                  <ToggleGroupItem key={l} value={l} className="px-3">
                    {localeName(l)}
                  </ToggleGroupItem>
                ))}
              </ToggleGroup>
            </Field>
          </div>
          <Field data-invalid={errors[titleKey] ? true : undefined}>
            <div className="flex items-end justify-between gap-2">
              <FieldLabel htmlFor="campaign-title">{m.pushTitle}</FieldLabel>
              <CharCounter text={message.title} max={TITLE_MAX} />
            </div>
            <Input
              id="campaign-title"
              value={message.title}
              placeholder={m.titlePlaceholder}
              aria-invalid={errors[titleKey] ? true : undefined}
              onChange={(e) =>
                CampaignEditorController.setMessage(editorKey, source, "title", e.target.value)
              }
            />
            {errors[titleKey] ? <FieldError>{errors[titleKey]}</FieldError> : null}
          </Field>
          <Field data-invalid={errors[bodyKey] ? true : undefined}>
            <div className="flex items-end justify-between gap-2">
              <FieldLabel htmlFor="campaign-body">{m.pushBody}</FieldLabel>
              <CharCounter text={message.body} max={BODY_MAX} />
            </div>
            <Textarea
              id="campaign-body"
              rows={3}
              value={message.body}
              placeholder={m.bodyPlaceholder}
              aria-invalid={errors[bodyKey] ? true : undefined}
              onChange={(e) => CampaignEditorController.setMessage(editorKey, source, "body", e.target.value)}
            />
            {errors[bodyKey] ? <FieldError>{errors[bodyKey]}</FieldError> : null}
          </Field>
        </FieldGroup>
      </CardContent>
      <CardFooter className="flex-wrap gap-x-3 gap-y-2 border-t">
        <Button type="button" variant="outline" disabled={!canTranslate || translating} onClick={translate}>
          {translating ? <Spinner /> : <Languages />}
          {translating ? m.translating : m.translate}
        </Button>
        {!canTranslate ? (
          <span className="text-xs text-muted-foreground">{m.translateNeedsText}</span>
        ) : stale ? (
          <span className="inline-flex items-center gap-1.5 text-xs text-warning">
            <TriangleAlert className="size-3.5 shrink-0" />
            {m.sourceChanged}
          </span>
        ) : null}
      </CardFooter>
      <ConfirmDialog
        open={confirming}
        onOpenChange={setConfirming}
        title={m.overwriteTitle}
        description={m.overwriteBody(overwritten.length)}
        confirmLabel={m.overwriteConfirm}
        onConfirm={() => CampaignEditorController.translate(editorKey)}
      />
    </Card>
  )
}
