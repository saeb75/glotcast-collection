"use client"

import { TriangleAlert, X } from "lucide-react"
import { useMemo } from "react"
import { Badge } from "@/components/ui/badge"
import { Card, CardContent, CardDescription, CardFooter, CardHeader, CardTitle } from "@/components/ui/card"
import { Checkbox } from "@/components/ui/checkbox"
import {
  Field,
  FieldContent,
  FieldDescription,
  FieldError,
  FieldGroup,
  FieldLabel,
  FieldTitle,
} from "@/components/ui/field"
import { InputGroup, InputGroupAddon, InputGroupInput, InputGroupText } from "@/components/ui/input-group"
import { RadioGroup, RadioGroupItem } from "@/components/ui/radio-group"
import { CampaignEditorController } from "@/controllers/CampaignEditorController"
import { CAMPAIGNS } from "@/copy/campaigns"
import { NOTIFY } from "@/copy/notifications"
import { LEVEL_LABELS } from "@/copy/status"
import { type AudienceDraft, audienceContradicts, audienceInput, SEGMENTS } from "@/domain/campaign"
import { LEVELS } from "@/domain/levels"
import { addUnique, without } from "@/domain/order"
import { type AudienceSegment } from "@/schemas/admin"
import { PodcastSelect } from "@/shared/PodcastSelect"
import { type CampaignEditor } from "@/stores/useCampaignEditorStore"
import { usePodcastsStore } from "@/stores/usePodcastsStore"
import { LanguagePicker } from "./LanguagePicker"
import { ReachSummary } from "./ReachSummary"

/** Who gets it: a segment, then optional filters (levels, app languages, activity, followed podcasts). */
export function AudienceCard({ editorKey, editor }: { editorKey: string; editor: CampaignEditor }) {
  const audience = editor.draft.audience
  const errors = editor.errors
  const podcasts = usePodcastsStore((s) => s.options?.data)
  const a = CAMPAIGNS.editor.audience
  const input = useMemo(() => audienceInput(audience), [audience])
  const set = (patch: Partial<AudienceDraft>) => CampaignEditorController.setAudience(editorKey, patch)
  const days = (value: string) => value.replace(/[^\d]/g, "").slice(0, 4)

  return (
    <Card className="pb-0">
      <CardHeader>
        <CardTitle>{a.title}</CardTitle>
        <CardDescription>{a.hint}</CardDescription>
      </CardHeader>
      <CardContent>
        <FieldGroup>
          <Field>
            <FieldLabel>{a.segment}</FieldLabel>
            <RadioGroup
              value={audience.segment}
              onValueChange={(segment) => set({ segment: segment as AudienceSegment })}
              className="grid gap-2 sm:grid-cols-2 xl:grid-cols-3"
            >
              {SEGMENTS.map((segment) => (
                <FieldLabel key={segment} htmlFor={`segment-${segment}`}>
                  <Field orientation="horizontal">
                    <RadioGroupItem value={segment} id={`segment-${segment}`} />
                    <FieldContent>
                      <FieldTitle>{NOTIFY.segments[segment]}</FieldTitle>
                      <FieldDescription className="text-xs">{NOTIFY.segmentHints[segment]}</FieldDescription>
                    </FieldContent>
                  </Field>
                </FieldLabel>
              ))}
            </RadioGroup>
          </Field>

          <div className="grid gap-5 md:grid-cols-2">
            <Field>
              <FieldLabel>{a.levels}</FieldLabel>
              <div className="flex flex-wrap gap-x-5 gap-y-2">
                {LEVELS.map((level) => (
                  <Field key={level} orientation="horizontal" className="w-auto">
                    <Checkbox
                      id={`level-${level}`}
                      checked={audience.levels.includes(level)}
                      onCheckedChange={(checked) =>
                        set({
                          levels:
                            checked === true
                              ? addUnique(audience.levels, level)
                              : without(audience.levels, level),
                        })
                      }
                    />
                    <FieldLabel htmlFor={`level-${level}`} className="font-normal">
                      {LEVEL_LABELS[level]}
                    </FieldLabel>
                  </Field>
                ))}
              </div>
              <FieldDescription>{a.levelsHint}</FieldDescription>
            </Field>
            <Field>
              <FieldLabel>{a.languages}</FieldLabel>
              <LanguagePicker value={audience.languages} onChange={(languages) => set({ languages })} />
            </Field>
          </div>

          <div className="grid gap-5 sm:grid-cols-2">
            <Field data-invalid={errors["audience.inactiveDays"] ? true : undefined}>
              <FieldLabel htmlFor="audience-inactive">{a.inactive}</FieldLabel>
              <InputGroup>
                <InputGroupInput
                  id="audience-inactive"
                  inputMode="numeric"
                  value={audience.inactiveDays}
                  aria-invalid={errors["audience.inactiveDays"] ? true : undefined}
                  onChange={(e) => set({ inactiveDays: days(e.target.value) })}
                />
                <InputGroupAddon align="inline-end">
                  <InputGroupText>{a.days}</InputGroupText>
                </InputGroupAddon>
              </InputGroup>
              {errors["audience.inactiveDays"] ? (
                <FieldError>{errors["audience.inactiveDays"]}</FieldError>
              ) : (
                <FieldDescription>{a.daysHint}</FieldDescription>
              )}
            </Field>
            <Field data-invalid={errors["audience.activeWithinDays"] ? true : undefined}>
              <FieldLabel htmlFor="audience-active">{a.active}</FieldLabel>
              <InputGroup>
                <InputGroupInput
                  id="audience-active"
                  inputMode="numeric"
                  value={audience.activeWithinDays}
                  aria-invalid={errors["audience.activeWithinDays"] ? true : undefined}
                  onChange={(e) => set({ activeWithinDays: days(e.target.value) })}
                />
                <InputGroupAddon align="inline-end">
                  <InputGroupText>{a.days}</InputGroupText>
                </InputGroupAddon>
              </InputGroup>
              {errors["audience.activeWithinDays"] ? (
                <FieldError>{errors["audience.activeWithinDays"]}</FieldError>
              ) : (
                <FieldDescription>{a.daysHint}</FieldDescription>
              )}
            </Field>
          </div>
          {audienceContradicts(input) ? (
            <p className="-mt-2 flex items-center gap-1.5 text-sm text-warning">
              <TriangleAlert className="size-4 shrink-0" />
              {a.contradiction}
            </p>
          ) : null}

          <Field data-invalid={errors["audience.podcastIds"] ? true : undefined}>
            <FieldLabel htmlFor="audience-podcast">{a.podcasts}</FieldLabel>
            <div className="flex flex-wrap items-center gap-2">
              <PodcastSelect
                key={audience.podcastIds.join(",")}
                id="audience-podcast"
                value=""
                placeholder={a.addPodcast}
                label={a.addPodcast}
                className="w-56"
                onChange={(id) => id && set({ podcastIds: addUnique(audience.podcastIds, id) })}
              />
              {audience.podcastIds.map((id) => (
                <Badge key={id} variant="secondary" className="h-6 gap-1 pr-1">
                  <span className="max-w-48 truncate">{podcasts?.find((p) => p.id === id)?.name ?? "…"}</span>
                  <button
                    type="button"
                    aria-label={a.removePodcast}
                    className="rounded-sm p-0.5 hover:bg-foreground/10"
                    onClick={() => set({ podcastIds: without(audience.podcastIds, id) })}
                  >
                    <X className="size-3" />
                  </button>
                </Badge>
              ))}
            </div>
            {errors["audience.podcastIds"] ? (
              <FieldError>{errors["audience.podcastIds"]}</FieldError>
            ) : (
              <FieldDescription>{a.podcastsHint}</FieldDescription>
            )}
          </Field>
        </FieldGroup>
      </CardContent>
      <CardFooter className="border-t bg-muted/30 py-4">
        <ReachSummary audience={input} />
      </CardFooter>
    </Card>
  )
}
