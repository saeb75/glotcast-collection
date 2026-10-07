"use client"

import { useState } from "react"
import { Badge } from "@/components/ui/badge"
import { Card, CardAction, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card"
import { ToggleGroup, ToggleGroupItem } from "@/components/ui/toggle-group"
import { CAMPAIGNS } from "@/copy/campaigns"
import { LOCALES, localesSourceFirst, messageProblem, missingLocales, readyLocales } from "@/domain/campaign"
import { type CampaignEditor } from "@/stores/useCampaignEditorStore"
import { TranslationRow } from "./TranslationRow"

type Show = "all" | "missing"

/** The message in each of the 16 app languages, the source first: edit, see what's missing, reset. */
export function TranslationsCard({ editorKey, editor }: { editorKey: string; editor: CampaignEditor }) {
  const [show, setShow] = useState<Show>("all")
  const { draft } = editor
  const t = CAMPAIGNS.editor.translations
  const ready = readyLocales(draft.messages).length
  const missing = missingLocales(draft.messages).length
  const locales = localesSourceFirst(draft.sourceLanguage).filter(
    (l) =>
      show === "all" ||
      messageProblem(draft.messages[l]) !== null ||
      Boolean(editor.errors[`messages.${l}.title`]),
  )

  return (
    <Card className="gap-0 pb-0">
      <CardHeader className="pb-4">
        <CardTitle className="flex flex-wrap items-center gap-2">
          {t.title}
          <Badge variant="secondary" className="tabular-nums">
            {t.ready(ready, LOCALES.length)}
          </Badge>
          {missing > 0 ? (
            <Badge variant="outline" className="text-warning tabular-nums">
              {t.missing(missing)}
            </Badge>
          ) : null}
        </CardTitle>
        <CardDescription>{t.hint}</CardDescription>
        <CardAction>
          <ToggleGroup
            type="single"
            variant="outline"
            size="sm"
            value={show}
            onValueChange={(value) => value && setShow(value as Show)}
          >
            <ToggleGroupItem value="all" className="px-2.5 text-xs">
              {t.allShown}
            </ToggleGroupItem>
            <ToggleGroupItem value="missing" className="px-2.5 text-xs">
              {t.onlyMissing}
            </ToggleGroupItem>
          </ToggleGroup>
        </CardAction>
      </CardHeader>
      <CardContent className="divide-y border-t px-0">
        {locales.length === 0 ? (
          <p className="p-6 text-center text-sm text-muted-foreground">{t.allReady}</p>
        ) : (
          locales.map((locale) => (
            <TranslationRow key={locale} editorKey={editorKey} editor={editor} locale={locale} />
          ))
        )}
      </CardContent>
    </Card>
  )
}
