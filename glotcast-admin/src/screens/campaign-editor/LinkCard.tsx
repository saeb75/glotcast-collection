"use client"

import { ListPlus, Repeat } from "lucide-react"
import { useEffect, useState } from "react"
import { Button } from "@/components/ui/button"
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card"
import { Field, FieldDescription, FieldError, FieldGroup, FieldLabel } from "@/components/ui/field"
import { CampaignEditorController } from "@/controllers/CampaignEditorController"
import { CAMPAIGNS } from "@/copy/campaigns"
import { NOTIFY } from "@/copy/notifications"
import { LEVEL_LABELS } from "@/copy/status"
import { LINK_TYPES, linksEpisode } from "@/domain/campaign"
import { LEVELS, levelOf } from "@/domain/levels"
import { type Level } from "@/schemas/admin"
import { EpisodeCell } from "@/shared/EpisodeCell"
import { EpisodePickerDialog } from "@/shared/EpisodePickerDialog"
import { OptionSelect } from "@/shared/OptionSelect"
import { PodcastSelect } from "@/shared/PodcastSelect"
import { StatusBadge } from "@/shared/StatusBadge"
import { type CampaignEditor, useCampaignEditorStore } from "@/stores/useCampaignEditorStore"

const USER_LEVEL = "user"
const LEVEL_CHOICES = [USER_LEVEL, ...LEVELS] as const

/** What a tap opens: home, an episode (picked), the player at a level, a podcast, the paywall, review, words. */
export function LinkCard({ editorKey, editor }: { editorKey: string; editor: CampaignEditor }) {
  const [picking, setPicking] = useState(false)
  const link = editor.draft.link
  const error = editor.errors["link.id"]
  const episode = useCampaignEditorStore((s) => (link.id ? s.episodes[link.id] : undefined))
  const l = CAMPAIGNS.editor.link
  const showsEpisode = linksEpisode(link.type)

  useEffect(() => {
    if (showsEpisode && link.id) void CampaignEditorController.resolveEpisode(link.id)
  }, [showsEpisode, link.id])

  const levelLabel = (choice: (typeof LEVEL_CHOICES)[number]) =>
    choice === USER_LEVEL
      ? l.userLevel
      : episode && !levelOf(episode.levels, choice)
        ? `${LEVEL_LABELS[choice]} · ${l.noAudio}`
        : LEVEL_LABELS[choice]

  return (
    <Card>
      <CardHeader>
        <CardTitle>{l.title}</CardTitle>
        <CardDescription>{l.hint}</CardDescription>
      </CardHeader>
      <CardContent>
        <FieldGroup>
          <Field>
            <FieldLabel htmlFor="link-type">{l.type}</FieldLabel>
            <OptionSelect
              id="link-type"
              label={l.type}
              value={link.type}
              options={LINK_TYPES}
              labels={NOTIFY.linkTypes}
              onChange={(type) => CampaignEditorController.setLinkType(editorKey, type)}
              className="w-full sm:w-64"
            />
            <FieldDescription>{NOTIFY.linkHints[link.type]}</FieldDescription>
          </Field>

          {showsEpisode ? (
            <Field data-invalid={error ? true : undefined}>
              <FieldLabel>{l.episode}</FieldLabel>
              {link.id ? (
                <div className="flex items-center gap-3 rounded-lg border p-2.5">
                  <div className="min-w-0 flex-1">
                    {episode ? (
                      <EpisodeCell episode={episode} />
                    ) : episode === null ? (
                      <span className="text-sm text-muted-foreground">{l.unknownEpisode}</span>
                    ) : (
                      <span className="text-sm text-muted-foreground">…</span>
                    )}
                  </div>
                  {episode ? <StatusBadge status={episode.status} /> : null}
                  <Button type="button" variant="outline" size="sm" onClick={() => setPicking(true)}>
                    <Repeat />
                    {l.changeEpisode}
                  </Button>
                </div>
              ) : (
                <div>
                  <Button
                    type="button"
                    variant="outline"
                    aria-invalid={error ? true : undefined}
                    onClick={() => setPicking(true)}
                  >
                    <ListPlus />
                    {l.chooseEpisode}
                  </Button>
                </div>
              )}
              {error ? <FieldError>{error}</FieldError> : null}
            </Field>
          ) : null}

          {link.type === "player" ? (
            <Field>
              <FieldLabel htmlFor="link-level">{l.level}</FieldLabel>
              <OptionSelect
                id="link-level"
                label={l.level}
                value={link.level || USER_LEVEL}
                options={LEVEL_CHOICES}
                labels={levelLabel}
                onChange={(choice) =>
                  CampaignEditorController.setLink(editorKey, {
                    level: choice === USER_LEVEL ? "" : (choice as Level),
                  })
                }
                className="w-full sm:w-64"
              />
            </Field>
          ) : null}

          {link.type === "podcast" ? (
            <Field data-invalid={error ? true : undefined}>
              <FieldLabel htmlFor="link-podcast">{l.podcast}</FieldLabel>
              <PodcastSelect
                id="link-podcast"
                value={link.id}
                label={l.podcast}
                placeholder={l.choosePodcast}
                invalid={Boolean(error)}
                className="w-full sm:w-64"
                onChange={(id) => CampaignEditorController.setLink(editorKey, { id })}
              />
              {error ? <FieldError>{error}</FieldError> : null}
            </Field>
          ) : null}
        </FieldGroup>
      </CardContent>
      <EpisodePickerDialog
        open={picking}
        onOpenChange={setPicking}
        title={l.pickerTitle}
        selectedIds={link.id ? [link.id] : []}
        onAdd={(picked) => {
          CampaignEditorController.pickEpisode(editorKey, picked)
          setPicking(false)
        }}
        onRemove={() => CampaignEditorController.setLink(editorKey, { id: "" })}
      />
    </Card>
  )
}
