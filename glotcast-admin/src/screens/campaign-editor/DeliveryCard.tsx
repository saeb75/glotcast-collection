"use client"

import { Moon, TriangleAlert } from "lucide-react"
import { useEffect } from "react"
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card"
import {
  Field,
  FieldContent,
  FieldDescription,
  FieldError,
  FieldGroup,
  FieldLabel,
  FieldTitle,
} from "@/components/ui/field"
import { Input } from "@/components/ui/input"
import { RadioGroup, RadioGroupItem } from "@/components/ui/radio-group"
import { Switch } from "@/components/ui/switch"
import { AutomationsController } from "@/controllers/AutomationsController"
import { CampaignEditorController } from "@/controllers/CampaignEditorController"
import { CAMPAIGNS } from "@/copy/campaigns"
import { inQuietHours } from "@/domain/automations"
import {
  DELIVERY_MODES,
  type DeliveryMode,
  deliveryIsLateToday,
  deliveryProblem,
  HM_RE,
  localDateOf,
} from "@/domain/campaign"
import { viewerTimeZone } from "@/domain/datetime"
import { type CampaignEditor } from "@/stores/useCampaignEditorStore"
import { useAutomationsStore } from "@/stores/useAutomationsStore"

const DEFAULT_QUIET = { from: "22:00", to: "08:00" }

/** Now, at a set time, or at each user's local time on a date — and whether quiet hours hold it back. */
export function DeliveryCard({ editorKey, editor }: { editorKey: string; editor: CampaignEditor }) {
  const quiet = useAutomationsStore((s) => s.entry?.data?.settings.quietHours) ?? DEFAULT_QUIET
  const { delivery, draft } = editor
  const d = CAMPAIGNS.editor.delivery
  const now = new Date()
  const live = deliveryProblem(delivery, now)
  const problem = editor.errors.delivery ?? (live ? d.problems[live] : undefined)
  const set = (patch: Partial<typeof delivery>) => CampaignEditorController.setDelivery(editorKey, patch)

  useEffect(() => {
    // The quiet hours the hints quote.
    void AutomationsController.load()
  }, [])

  return (
    <Card>
      <CardHeader>
        <CardTitle>{d.title}</CardTitle>
        <CardDescription>{d.hint}</CardDescription>
      </CardHeader>
      <CardContent>
        <FieldGroup>
          <RadioGroup
            value={delivery.mode}
            onValueChange={(mode) => set({ mode: mode as DeliveryMode })}
            className="grid gap-2 md:grid-cols-3"
          >
            {DELIVERY_MODES.map((mode) => (
              <FieldLabel key={mode} htmlFor={`delivery-${mode}`}>
                <Field orientation="horizontal">
                  <RadioGroupItem value={mode} id={`delivery-${mode}`} />
                  <FieldContent>
                    <FieldTitle>{d.modes[mode]}</FieldTitle>
                    <FieldDescription className="text-xs">{d.modeHints[mode]}</FieldDescription>
                  </FieldContent>
                </Field>
              </FieldLabel>
            ))}
          </RadioGroup>

          {delivery.mode === "at" ? (
            <Field data-invalid={problem ? true : undefined} className="max-w-xs">
              <FieldLabel htmlFor="delivery-at">{d.at}</FieldLabel>
              <Input
                id="delivery-at"
                type="datetime-local"
                value={delivery.at}
                aria-invalid={problem ? true : undefined}
                onChange={(e) => set({ at: e.target.value })}
              />
              {problem ? (
                <FieldError>{problem}</FieldError>
              ) : (
                <FieldDescription>{d.atHint(viewerTimeZone())}</FieldDescription>
              )}
            </Field>
          ) : null}

          {delivery.mode === "local" ? (
            <Field data-invalid={problem ? true : undefined}>
              <div className="grid max-w-md grid-cols-2 gap-3">
                <div className="grid gap-2">
                  <FieldLabel htmlFor="delivery-date">{d.date}</FieldLabel>
                  <Input
                    id="delivery-date"
                    type="date"
                    min={localDateOf(now)}
                    value={delivery.date}
                    aria-invalid={problem ? true : undefined}
                    onChange={(e) => set({ date: e.target.value })}
                  />
                </div>
                <div className="grid gap-2">
                  <FieldLabel htmlFor="delivery-time">{d.time}</FieldLabel>
                  <Input
                    id="delivery-time"
                    type="time"
                    value={delivery.time}
                    aria-invalid={problem ? true : undefined}
                    onChange={(e) => set({ time: e.target.value })}
                  />
                </div>
              </div>
              {problem ? <FieldError>{problem}</FieldError> : null}
              {!problem && deliveryIsLateToday(delivery, now) ? (
                <FieldDescription className="flex items-center gap-1.5 text-warning">
                  <TriangleAlert className="size-3.5 shrink-0" />
                  {d.lateToday}
                </FieldDescription>
              ) : null}
              {!problem &&
              draft.respectQuietHours &&
              HM_RE.test(delivery.time) &&
              inQuietHours(delivery.time, quiet) ? (
                <FieldDescription className="flex items-center gap-1.5 text-warning">
                  <Moon className="size-3.5 shrink-0" />
                  {d.localInQuiet(delivery.time, quiet.to)}
                </FieldDescription>
              ) : null}
            </Field>
          ) : null}

          <Field orientation="horizontal" className="rounded-lg border px-3 py-2.5">
            <FieldContent>
              <FieldLabel htmlFor="delivery-quiet">{d.quiet}</FieldLabel>
              <FieldDescription>
                {draft.respectQuietHours ? d.quietHint(quiet.from, quiet.to) : d.quietOff}
              </FieldDescription>
            </FieldContent>
            <Switch
              id="delivery-quiet"
              checked={draft.respectQuietHours}
              onCheckedChange={(on) => CampaignEditorController.setRespectQuietHours(editorKey, on)}
            />
          </Field>
        </FieldGroup>
      </CardContent>
    </Card>
  )
}
