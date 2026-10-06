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
import { PodcastsController } from "@/controllers/PodcastsController"
import { COMMON } from "@/copy/common"
import { COVERS } from "@/copy/covers"
import { PODCASTS } from "@/copy/podcasts"
import { blankToNull, fieldErrors } from "@/domain/forms"
import { slugify } from "@/domain/slug"
import { type AdminPodcast, type PodcastInput } from "@/schemas/admin"
import { type PodcastForm as Values, podcastFormSchema } from "@/schemas/forms"
import { CoverGeneratorSheet } from "@/shared/CoverGeneratorSheet"
import { ImageField } from "@/shared/ImageField"
import { useSaveShortcut } from "@/shared/useSaveShortcut"
import { useUnsavedGuard } from "@/shared/useUnsavedGuard"
import { CategoryPicker } from "./CategoryPicker"

const initialValues = (p: AdminPodcast | null): Values => ({
  name: p?.name ?? "",
  slug: p?.slug ?? "",
  description: p?.description ?? "",
  coverUrl: p?.coverUrl ?? null,
  categoryIds: p?.categories.map((c) => c.id) ?? [],
  published: p ? p.status !== "draft" : false,
})

/** Create or edit a podcast: name, slug, description, categories, cover, published. ⌘S saves. */
export function PodcastForm({
  podcast,
  onSaved,
}: {
  podcast: AdminPodcast | null
  onSaved: (p: AdminPodcast) => void
}) {
  const [initial] = useState(() => initialValues(podcast))
  const [values, setValues] = useState(initial)
  const [errors, setErrors] = useState<Record<string, string>>({})
  const [saving, setSaving] = useState(false)
  const [generator, setGenerator] = useState(false)
  const dirty = JSON.stringify(values) !== JSON.stringify(initial)
  const e = PODCASTS.editor

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
    if (saving || (podcast && !dirty)) return
    const parsed = podcastFormSchema.safeParse(values)
    if (!parsed.success) return setErrors(fieldErrors(parsed.error))
    const v = parsed.data
    const input: PodcastInput & { name: string } = {
      name: v.name,
      description: blankToNull(v.description),
      coverUrl: v.coverUrl,
      categoryIds: v.categoryIds,
    }
    if (v.slug && v.slug !== podcast?.slug) input.slug = v.slug
    const wasPublished = podcast ? podcast.status !== "draft" : false
    if (v.published !== wasPublished) input.published = v.published
    setSaving(true)
    const saved = await PodcastsController.save(podcast?.id ?? null, input)
    setSaving(false)
    if (saved) onSaved(saved)
  }

  useSaveShortcut(() => void save(), dirty)

  return (
    <form onSubmit={(event) => void save(event)} noValidate>
      <Card>
        <CardHeader>
          <CardTitle>{e.details}</CardTitle>
          <CardDescription>{e.detailsHint}</CardDescription>
        </CardHeader>
        <CardContent>
          <FieldGroup>
            <Field data-invalid={errors.name ? true : undefined}>
              <FieldLabel htmlFor="podcast-name">{e.name}</FieldLabel>
              <Input
                id="podcast-name"
                value={values.name}
                autoFocus={!podcast}
                maxLength={200}
                aria-invalid={errors.name ? true : undefined}
                onChange={(ev) => set("name", ev.target.value)}
              />
              {errors.name ? <FieldError>{errors.name}</FieldError> : null}
            </Field>
            <Field data-invalid={errors.slug ? true : undefined}>
              <FieldLabel htmlFor="podcast-slug">
                {e.slug} <span className="font-normal text-muted-foreground">({COMMON.optional})</span>
              </FieldLabel>
              <Input
                id="podcast-slug"
                className="font-mono"
                value={values.slug}
                placeholder={slugify(values.name)}
                maxLength={80}
                aria-invalid={errors.slug ? true : undefined}
                onChange={(ev) => set("slug", ev.target.value.toLowerCase())}
              />
              {errors.slug ? (
                <FieldError>{errors.slug}</FieldError>
              ) : (
                <FieldDescription>{e.slugHint(slugify(values.name))}</FieldDescription>
              )}
            </Field>
            <Field>
              <FieldLabel htmlFor="podcast-description">{e.description}</FieldLabel>
              <Textarea
                id="podcast-description"
                rows={4}
                maxLength={5000}
                value={values.description}
                onChange={(ev) => set("description", ev.target.value)}
              />
            </Field>
            <Field>
              <FieldLabel>{e.categories}</FieldLabel>
              <FieldDescription>{e.categoriesHint}</FieldDescription>
              <CategoryPicker
                value={values.categoryIds}
                onChange={(ids) => set("categoryIds", ids)}
                known={podcast?.categories ?? []}
                disabled={saving}
              />
            </Field>
            <Field data-invalid={errors.coverUrl ? true : undefined}>
              <FieldLabel htmlFor="podcast-cover">{e.cover}</FieldLabel>
              <FieldDescription>{e.coverHint}</FieldDescription>
              <ImageField
                id="podcast-cover"
                value={values.coverUrl}
                onChange={(url) => set("coverUrl", url)}
                onGenerate={() => setGenerator(true)}
                invalid={Boolean(errors.coverUrl)}
                disabled={saving}
              />
              {errors.coverUrl ? <FieldError>{errors.coverUrl}</FieldError> : null}
            </Field>
            <Field orientation="horizontal">
              <FieldContent>
                <FieldLabel htmlFor="podcast-published">{e.published}</FieldLabel>
                <FieldDescription>{values.published ? e.publishedHint : e.draftHint}</FieldDescription>
              </FieldContent>
              <Switch
                id="podcast-published"
                checked={values.published}
                onCheckedChange={(checked) => set("published", checked)}
                disabled={saving}
              />
            </Field>
          </FieldGroup>
        </CardContent>
        <CardFooter className="justify-end gap-2 border-t">
          {podcast && dirty ? (
            <Button type="button" variant="ghost" disabled={saving} onClick={() => setValues(initial)}>
              {COMMON.discard}
            </Button>
          ) : null}
          <Button type="submit" disabled={saving || (podcast !== null && !dirty)}>
            {saving ? <Spinner /> : null}
            {podcast ? COMMON.save : COMMON.create}
          </Button>
        </CardFooter>
      </Card>
      <CoverGeneratorSheet
        open={generator}
        onOpenChange={setGenerator}
        sessionKey={`podcast:${podcast?.id ?? "new"}`}
        podcastName={values.name}
        title={values.name}
        hint={COVERS.podcastHint}
        sources={
          values.description.trim()
            ? [{ id: "description", label: e.description, text: values.description }]
            : []
        }
        emptyHint={COVERS.noDescription}
        actions={[
          {
            label: COVERS.useAsCover,
            onUse: (url) => {
              set("coverUrl", url)
              setGenerator(false)
            },
          },
        ]}
      />
    </form>
  )
}
