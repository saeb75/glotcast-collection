"use client"

import { CircleAlert, CircleCheck, Smartphone } from "lucide-react"
import { useState } from "react"
import { Button } from "@/components/ui/button"
import {
  Field,
  FieldContent,
  FieldDescription,
  FieldError,
  FieldLabel,
  FieldTitle,
} from "@/components/ui/field"
import { Input } from "@/components/ui/input"
import {
  Popover,
  PopoverAnchor,
  PopoverContent,
  PopoverDescription,
  PopoverHeader,
  PopoverTitle,
} from "@/components/ui/popover"
import { RadioGroup, RadioGroupItem } from "@/components/ui/radio-group"
import { Spinner } from "@/components/ui/spinner"
import { CampaignEditorController, type Outcome } from "@/controllers/CampaignEditorController"
import { CAMPAIGNS } from "@/copy/campaigns"
import { LOCALES, localeName, testTarget } from "@/domain/campaign"
import { cn } from "@/lib/utils"
import { type Locale, type TestInput } from "@/schemas/admin"
import { OptionSelect } from "@/shared/OptionSelect"
import { useAuthStore } from "@/stores/useAuthStore"
import { useCampaignEditorStore } from "@/stores/useCampaignEditorStore"

const THEIRS = "theirs"
const LANGUAGES = [
  THEIRS,
  ...[...LOCALES].sort((a, b) => localeName(a).localeCompare(localeName(b))),
] as const

/** A test push right now, to me or to a user (id or email), in their language or a chosen one. */
export function TestSendButton({ editorKey, onOpen }: { editorKey: string; onOpen: () => void }) {
  const open = useCampaignEditorStore((s) => s.dialog?.key === editorKey && s.dialog.kind === "test")
  const email = useAuthStore((s) => s.user?.email ?? "")
  const [to, setTo] = useState<"me" | "other">("me")
  const [other, setOther] = useState("")
  const [invalid, setInvalid] = useState(false)
  const [language, setLanguage] = useState<(typeof LANGUAGES)[number]>(THEIRS)
  const [busy, setBusy] = useState(false)
  const [outcome, setOutcome] = useState<Outcome | null>(null)
  const t = CAMPAIGNS.editor.test

  const send = async () => {
    let body: TestInput = {}
    if (to === "other") {
      const target = testTarget(other)
      if (!target) return setInvalid(true)
      body = target
    }
    if (language !== THEIRS) body.language = language as Locale
    setBusy(true)
    setOutcome(null)
    const result = await CampaignEditorController.test(editorKey, body)
    setBusy(false)
    setOutcome(result)
  }

  return (
    <Popover
      open={open}
      onOpenChange={(next) => {
        if (next || busy) return
        CampaignEditorController.setDialog(null)
        setOutcome(null)
      }}
    >
      <PopoverAnchor asChild>
        <Button variant="outline" onClick={onOpen}>
          <Smartphone />
          {t.button}
        </Button>
      </PopoverAnchor>
      <PopoverContent align="end" className="w-[22rem] max-w-[calc(100vw-2rem)]">
        <PopoverHeader>
          <PopoverTitle>{t.title}</PopoverTitle>
          <PopoverDescription>{t.hint}</PopoverDescription>
        </PopoverHeader>
        <div className="mt-3 grid gap-3">
          <RadioGroup value={to} onValueChange={(value) => setTo(value as "me" | "other")} className="gap-2">
            <FieldLabel htmlFor="test-me">
              <Field orientation="horizontal">
                <RadioGroupItem value="me" id="test-me" />
                <FieldContent>
                  <FieldTitle>{t.toMe}</FieldTitle>
                  <FieldDescription className="text-xs">{t.toMeHint(email)}</FieldDescription>
                </FieldContent>
              </Field>
            </FieldLabel>
            <FieldLabel htmlFor="test-other">
              <Field orientation="horizontal">
                <RadioGroupItem value="other" id="test-other" />
                <FieldContent>
                  <FieldTitle>{t.toOther}</FieldTitle>
                </FieldContent>
              </Field>
            </FieldLabel>
          </RadioGroup>
          {to === "other" ? (
            <Field data-invalid={invalid ? true : undefined}>
              <Input
                autoFocus
                value={other}
                placeholder={t.otherPlaceholder}
                aria-label={t.otherPlaceholder}
                aria-invalid={invalid ? true : undefined}
                onChange={(e) => {
                  setOther(e.target.value)
                  setInvalid(false)
                }}
                onKeyDown={(e) => e.key === "Enter" && void send()}
              />
              {invalid ? <FieldError>{t.otherInvalid}</FieldError> : null}
            </Field>
          ) : null}
          <Field orientation="horizontal" className="justify-between">
            <FieldLabel htmlFor="test-language" className="font-normal text-muted-foreground">
              {t.language}
            </FieldLabel>
            <OptionSelect
              id="test-language"
              label={t.language}
              value={language}
              options={LANGUAGES}
              labels={(l) => (l === THEIRS ? t.theirLanguage : localeName(l))}
              onChange={setLanguage}
              className="h-8 w-44"
            />
          </Field>
          {outcome ? (
            <p
              className={cn(
                "flex items-start gap-2 rounded-lg border px-3 py-2 text-sm",
                outcome.ok ? "border-positive/40 text-positive" : "border-destructive/40 text-destructive",
              )}
              role="status"
            >
              {outcome.ok ? (
                <CircleCheck className="mt-0.5 size-4 shrink-0" />
              ) : (
                <CircleAlert className="mt-0.5 size-4 shrink-0" />
              )}
              <span>{outcome.message}</span>
            </p>
          ) : null}
          <Button onClick={() => void send()} disabled={busy}>
            {busy ? <Spinner /> : <Smartphone />}
            {t.send}
          </Button>
        </div>
      </PopoverContent>
    </Popover>
  )
}
