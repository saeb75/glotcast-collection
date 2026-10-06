"use client"

import { type FormEvent, useState } from "react"
import { Button } from "@/components/ui/button"
import { Card, CardContent, CardDescription, CardFooter, CardHeader, CardTitle } from "@/components/ui/card"
import {
  Field,
  FieldContent,
  FieldDescription,
  FieldError,
  FieldGroup,
  FieldLabel,
} from "@/components/ui/field"
import { Input } from "@/components/ui/input"
import { Spinner } from "@/components/ui/spinner"
import { Switch } from "@/components/ui/switch"
import { Textarea } from "@/components/ui/textarea"
import { EpisodesController } from "@/controllers/EpisodesController"
import { COMMON } from "@/copy/common"
import { EPISODES } from "@/copy/episodes"
import { blankToNull, fieldErrors, numberOrNull } from "@/domain/forms"
import { type AdminEpisodeDetail, type EpisodeInput } from "@/schemas/admin"
import { episodeFormSchema } from "@/schemas/forms"
import { ImageField } from "@/shared/ImageField"
import { PodcastSelect } from "@/shared/PodcastSelect"
import { useSaveShortcut } from "@/shared/useSaveShortcut"
import { useUnsavedGuard } from "@/shared/useUnsavedGuard"

interface Values {
  podcastId: string
  title: string
  number: string
  description: string
  coverUrl: string | null
  bannerUrl: string | null
  isPro: boolean
}

const initialValues = (e: AdminEpisodeDetail | null, podcastId: string): Values => ({
  podcastId: e?.podcast.id ?? podcastId,
  title: e?.title ?? "",
  number: e?.number != null ? String(e.number) : "",
  description: e?.description ?? "",
  coverUrl: e?.coverUrl ?? null,
  bannerUrl: e?.bannerUrl ?? null,
  isPro: e?.isPro ?? true,
})

/** The episode's details: podcast, title, number, description, Pro, cover and banner. ⌘S saves. */
export function EpisodeForm({
  episode,
  defaultPodcastId = "",
  onSaved,
  onGenerate,
}: {
  episode: AdminEpisodeDetail | null
  defaultPodcastId?: string
  onSaved: (episode: AdminEpisodeDetail) => void
  /** Opens the cover generator (the editor's Cover art tab). */
  onGenerate?: () => void
}) {
  const [initial] = useState(() => initialValues(episode, defaultPodcastId))
  const [values, setValues] = useState(initial)
  const [errors, setErrors] = useState<Record<string, string>>({})
  const [saving, setSaving] = useState(false)
  const dirty = JSON.stringify(values) !== JSON.stringify(initial)
  const f = EPISODES.form

  useUnsavedGuard(dirty)

  const set = <K extends keyof Values>(key: K, value: Values[K]) => {
    setValues((v) => ({ ...v, [key]: value }))
    setErrors((errs) => {
      const { [key]: _gone, ...rest } = errs
      return rest
    })
  }

  const save = async (event?: FormEvent) => {
    event?.preventDefault()
    if (saving || (episode && !dirty)) return
    const parsed = episodeFormSchema.safeParse({ ...values, number: numberOrNull(values.number) })
    if (!parsed.success) return setErrors(fieldErrors(parsed.error))
    const v = parsed.data
    const all = {
      podcastId: v.podcastId,
      title: v.title,
      number: v.number,
      description: blankToNull(v.description),
      coverUrl: v.coverUrl,
      bannerUrl: v.bannerUrl,
      isPro: v.isPro,
    }
    setSaving(true)
    let saved: AdminEpisodeDetail | undefined
    if (!episode) saved = await EpisodesController.create(all)
    else {
      // Only what changed (the audit log records the fields sent).
      const before = initialValues(episode, "")
      const changes: EpisodeInput = {}
      if (all.podcastId !== before.podcastId) changes.podcastId = all.podcastId
      if (all.title !== before.title) changes.title = all.title
      if (values.number !== before.number) changes.number = all.number
      if (values.description !== before.description) changes.description = all.description
      if (all.coverUrl !== before.coverUrl) changes.coverUrl = all.coverUrl
      if (all.bannerUrl !== before.bannerUrl) changes.bannerUrl = all.bannerUrl
      if (all.isPro !== before.isPro) changes.isPro = all.isPro
      saved = await EpisodesController.update(episode.id, changes)
    }
    setSaving(false)
    if (saved) onSaved(saved)
  }

  useSaveShortcut(() => void save(), dirty)

  return (
    <form onSubmit={(event) => void save(event)} noValidate>
      <Card>
        <CardHeader>
          <CardTitle>{f.details}</CardTitle>
          <CardDescription>{f.detailsHint}</CardDescription>
        </CardHeader>
        <CardContent>
          <FieldGroup>
            <Field data-invalid={errors.podcastId ? true : undefined}>
              <FieldLabel htmlFor="episode-podcast">{f.podcast}</FieldLabel>
              <PodcastSelect
                id="episode-podcast"
                value={values.podcastId}
                onChange={(id) => set("podcastId", id)}
                label={f.podcast}
                placeholder={f.pickPodcast}
                className="w-full"
                invalid={Boolean(errors.podcastId)}
              />
              {errors.podcastId ? <FieldError>{errors.podcastId}</FieldError> : null}
            </Field>
            <div className="grid gap-4 sm:grid-cols-[minmax(0,1fr)_8rem]">
              <Field data-invalid={errors.title ? true : undefined}>
                <FieldLabel htmlFor="episode-title">{f.title}</FieldLabel>
                <Input
                  id="episode-title"
                  value={values.title}
                  maxLength={300}
                  autoFocus={!episode}
                  aria-invalid={errors.title ? true : undefined}
                  onChange={(e) => set("title", e.target.value)}
                />
                {errors.title ? <FieldError>{errors.title}</FieldError> : null}
              </Field>
              <Field data-invalid={errors.number ? true : undefined}>
                <FieldLabel htmlFor="episode-number">
                  {f.number} <span className="font-normal text-muted-foreground">({COMMON.optional})</span>
                </FieldLabel>
                <Input
                  id="episode-number"
                  inputMode="numeric"
                  value={values.number}
                  aria-invalid={errors.number ? true : undefined}
                  onChange={(e) => set("number", e.target.value.replace(/[^\d]/g, ""))}
                />
                {errors.number ? <FieldError>{errors.number}</FieldError> : null}
              </Field>
            </div>
            <Field>
              <FieldLabel htmlFor="episode-description">{f.description}</FieldLabel>
              <Textarea
                id="episode-description"
                rows={4}
                maxLength={5000}
                value={values.description}
                onChange={(e) => set("description", e.target.value)}
              />
            </Field>
            <Field orientation="horizontal">
              <FieldContent>
                <FieldLabel htmlFor="episode-pro">{f.isPro}</FieldLabel>
                <FieldDescription>{f.isProHint}</FieldDescription>
              </FieldContent>
              <Switch id="episode-pro" checked={values.isPro} onCheckedChange={(v) => set("isPro", v)} />
            </Field>
          </FieldGroup>
        </CardContent>
        <CardHeader className="border-t pt-4">
          <CardTitle>{f.images}</CardTitle>
          <CardDescription>{f.imagesHint}</CardDescription>
        </CardHeader>
        <CardContent>
          <FieldGroup>
            <Field data-invalid={errors.coverUrl ? true : undefined}>
              <FieldLabel htmlFor="episode-cover">{f.cover}</FieldLabel>
              <ImageField
                id="episode-cover"
                aspect="portrait"
                value={values.coverUrl}
                onChange={(url) => set("coverUrl", url)}
                onGenerate={onGenerate}
                invalid={Boolean(errors.coverUrl)}
                disabled={saving}
              />
              {errors.coverUrl ? <FieldError>{errors.coverUrl}</FieldError> : null}
            </Field>
            <Field data-invalid={errors.bannerUrl ? true : undefined}>
              <FieldLabel htmlFor="episode-banner">{f.banner}</FieldLabel>
              <ImageField
                id="episode-banner"
                aspect="landscape"
                value={values.bannerUrl}
                onChange={(url) => set("bannerUrl", url)}
                onGenerate={onGenerate}
                invalid={Boolean(errors.bannerUrl)}
                disabled={saving}
              />
              {errors.bannerUrl ? <FieldError>{errors.bannerUrl}</FieldError> : null}
            </Field>
          </FieldGroup>
        </CardContent>
        <CardFooter className="justify-end gap-2 border-t">
          {episode && dirty ? (
            <Button type="button" variant="ghost" disabled={saving} onClick={() => setValues(initial)}>
              {COMMON.discard}
            </Button>
          ) : null}
          <Button type="submit" disabled={saving || (episode !== null && !dirty)}>
            {saving ? <Spinner /> : null}
            {episode ? COMMON.save : EPISODES.create.submit}
          </Button>
        </CardFooter>
      </Card>
    </form>
  )
}
