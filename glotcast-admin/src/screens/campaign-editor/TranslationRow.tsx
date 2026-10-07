"use client"

import { RotateCcw } from "lucide-react"
import { Badge } from "@/components/ui/badge"
import { Button } from "@/components/ui/button"
import { Input } from "@/components/ui/input"
import { Textarea } from "@/components/ui/textarea"
import { Tooltip, TooltipContent, TooltipTrigger } from "@/components/ui/tooltip"
import { CampaignEditorController } from "@/controllers/CampaignEditorController"
import { CAMPAIGNS } from "@/copy/campaigns"
import { BODY_MAX, localeName, messageFor, messageProblem, TITLE_MAX } from "@/domain/campaign"
import { cn } from "@/lib/utils"
import { type Locale } from "@/schemas/admin"
import { type CampaignEditor } from "@/stores/useCampaignEditorStore"
import { CharCounter } from "./CharCounter"

/** One language: its title and message, what is wrong with them, back to the machine translation. */
export function TranslationRow({
  editorKey,
  editor,
  locale,
}: {
  editorKey: string
  editor: CampaignEditor
  locale: Locale
}) {
  const { draft, machine, errors } = editor
  const t = CAMPAIGNS.editor.translations
  const message = draft.messages[locale]
  const isSource = locale === draft.sourceLanguage
  const problem = messageProblem(message)
  const machineText = machine[locale]
  const edited =
    machineText !== undefined && (machineText.title !== message.title || machineText.body !== message.body)
  const fallback = problem === "missing" ? messageFor(draft.messages, locale, draft.sourceLanguage) : null
  const titleError = errors[`messages.${locale}.title`]
  const bodyError = errors[`messages.${locale}.body`]
  const name = localeName(locale)

  return (
    <div className="grid gap-3 px-4 py-3 sm:grid-cols-[10rem_minmax(0,1fr)]">
      <div className="flex flex-wrap items-start justify-between gap-2 sm:flex-col sm:justify-start">
        <div className="min-w-0">
          <div className="text-sm font-medium">{name}</div>
          <div className="font-mono text-xs text-muted-foreground uppercase">{locale}</div>
        </div>
        <div className="flex flex-wrap items-center gap-1">
          {isSource ? <Badge>{t.source}</Badge> : null}
          {problem ? (
            <Badge
              variant="outline"
              className={cn(problem === "missing" ? "text-warning" : "text-destructive")}
            >
              {t.problems[problem]}
            </Badge>
          ) : null}
          {edited ? <Badge variant="secondary">{t.edited}</Badge> : null}
          {edited ? (
            <Tooltip>
              <TooltipTrigger asChild>
                <Button
                  type="button"
                  variant="ghost"
                  size="icon-xs"
                  aria-label={t.reset}
                  onClick={() => CampaignEditorController.resetMessage(editorKey, locale)}
                >
                  <RotateCcw />
                </Button>
              </TooltipTrigger>
              <TooltipContent>{t.reset}</TooltipContent>
            </Tooltip>
          ) : null}
        </div>
      </div>
      <div className="min-w-0 space-y-2">
        <div className="space-y-1">
          <div className="flex items-center gap-2">
            <Input
              lang={locale}
              dir={locale === "ar" ? "rtl" : undefined}
              aria-label={`${name} · ${CAMPAIGNS.editor.message.pushTitle}`}
              aria-invalid={titleError ? true : undefined}
              value={message.title}
              placeholder={fallback?.message.title}
              onChange={(e) =>
                CampaignEditorController.setMessage(editorKey, locale, "title", e.target.value)
              }
            />
            <CharCounter text={message.title} max={TITLE_MAX} />
          </div>
          {titleError ? <p className="text-xs text-destructive">{titleError}</p> : null}
        </div>
        <div className="space-y-1">
          <div className="flex items-start gap-2">
            <Textarea
              lang={locale}
              dir={locale === "ar" ? "rtl" : undefined}
              rows={2}
              className="min-h-0"
              aria-label={`${name} · ${CAMPAIGNS.editor.message.pushBody}`}
              aria-invalid={bodyError ? true : undefined}
              value={message.body}
              placeholder={fallback?.message.body}
              onChange={(e) => CampaignEditorController.setMessage(editorKey, locale, "body", e.target.value)}
            />
            <CharCounter text={message.body} max={BODY_MAX} />
          </div>
          {bodyError ? <p className="text-xs text-destructive">{bodyError}</p> : null}
        </div>
        {fallback && !isSource ? (
          <p className="text-xs text-muted-foreground">{t.fallback(localeName(fallback.language))}</p>
        ) : null}
      </div>
    </div>
  )
}
