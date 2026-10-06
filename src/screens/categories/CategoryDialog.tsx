"use client"

import { type FormEvent, useState } from "react"
import { Button } from "@/components/ui/button"
import { Dialog, DialogContent, DialogDescription, DialogFooter, DialogHeader, DialogTitle } from "@/components/ui/dialog"
import { Field, FieldDescription, FieldError, FieldGroup, FieldLabel } from "@/components/ui/field"
import { Input } from "@/components/ui/input"
import { Spinner } from "@/components/ui/spinner"
import { Textarea } from "@/components/ui/textarea"
import { CategoriesController } from "@/controllers/CategoriesController"
import { CATEGORIES } from "@/copy/categories"
import { COMMON } from "@/copy/common"
import { blankToNull, fieldErrors, numberOrNull } from "@/domain/forms"
import { slugify } from "@/domain/slug"
import { type AdminCategory, type CategoryInput } from "@/schemas/admin"
import { categoryFormSchema } from "@/schemas/forms"
import { ImageField } from "@/shared/ImageField"

/** Create (no category) or edit a category. */
export function CategoryDialog({
  category,
  nextPosition,
  open,
  onOpenChange,
}: {
  category: AdminCategory | null
  nextPosition: number
  open: boolean
  onOpenChange: (open: boolean) => void
}) {
  const [name, setName] = useState(category?.name ?? "")
  const [slug, setSlug] = useState(category?.slug ?? "")
  const [description, setDescription] = useState(category?.description ?? "")
  const [coverUrl, setCoverUrl] = useState<string | null>(category?.coverUrl ?? null)
  const [position, setPosition] = useState(String(category?.position ?? nextPosition))
  const [errors, setErrors] = useState<Record<string, string>>({})
  const [saving, setSaving] = useState(false)
  const c = CATEGORIES

  const submit = async (event: FormEvent) => {
    event.preventDefault()
    const parsed = categoryFormSchema.safeParse({ name, slug, description, coverUrl, position: numberOrNull(position) })
    if (!parsed.success) return setErrors(fieldErrors(parsed.error))
    const v = parsed.data
    const input: CategoryInput & { name: string } = {
      name: v.name,
      description: blankToNull(v.description),
      coverUrl: v.coverUrl,
    }
    if (v.slug && v.slug !== category?.slug) input.slug = v.slug
    if (v.position !== null) input.position = v.position
    setSaving(true)
    const saved = await CategoriesController.save(category?.id ?? null, input)
    setSaving(false)
    if (saved) onOpenChange(false)
  }

  return (
    <Dialog open={open} onOpenChange={(next) => !saving && onOpenChange(next)}>
      <DialogContent className="sm:max-w-lg">
        <form onSubmit={(event) => void submit(event)} noValidate className="grid gap-4">
          <DialogHeader>
            <DialogTitle>{category ? c.editTitle : c.createTitle}</DialogTitle>
            <DialogDescription>{c.subtitle}</DialogDescription>
          </DialogHeader>
          <FieldGroup>
            <Field data-invalid={errors.name ? true : undefined}>
              <FieldLabel htmlFor="category-name">{c.name}</FieldLabel>
              <Input
                id="category-name"
                autoFocus
                value={name}
                maxLength={120}
                aria-invalid={errors.name ? true : undefined}
                onChange={(e) => setName(e.target.value)}
              />
              {errors.name ? <FieldError>{errors.name}</FieldError> : null}
            </Field>
            <div className="grid gap-4 sm:grid-cols-[minmax(0,1fr)_6rem]">
              <Field data-invalid={errors.slug ? true : undefined}>
                <FieldLabel htmlFor="category-slug">
                  {c.slug} <span className="font-normal text-muted-foreground">({COMMON.optional})</span>
                </FieldLabel>
                <Input
                  id="category-slug"
                  className="font-mono"
                  value={slug}
                  placeholder={slugify(name)}
                  aria-invalid={errors.slug ? true : undefined}
                  onChange={(e) => setSlug(e.target.value.toLowerCase())}
                />
                {errors.slug ? <FieldError>{errors.slug}</FieldError> : <FieldDescription>{c.slugHint(slugify(name))}</FieldDescription>}
              </Field>
              <Field data-invalid={errors.position ? true : undefined}>
                <FieldLabel htmlFor="category-position">{c.position}</FieldLabel>
                <Input
                  id="category-position"
                  inputMode="numeric"
                  value={position}
                  aria-invalid={errors.position ? true : undefined}
                  onChange={(e) => setPosition(e.target.value.replace(/[^\d]/g, ""))}
                />
                {errors.position ? <FieldError>{errors.position}</FieldError> : null}
              </Field>
            </div>
            <Field>
              <FieldLabel htmlFor="category-description">{c.description}</FieldLabel>
              <Textarea
                id="category-description"
                rows={3}
                maxLength={2000}
                value={description}
                onChange={(e) => setDescription(e.target.value)}
              />
            </Field>
            <Field data-invalid={errors.coverUrl ? true : undefined}>
              <FieldLabel htmlFor="category-cover">{c.cover}</FieldLabel>
              <ImageField id="category-cover" value={coverUrl} onChange={setCoverUrl} disabled={saving} />
              {errors.coverUrl ? <FieldError>{errors.coverUrl}</FieldError> : null}
            </Field>
          </FieldGroup>
          <DialogFooter>
            <Button type="button" variant="outline" disabled={saving} onClick={() => onOpenChange(false)}>
              {COMMON.cancel}
            </Button>
            <Button type="submit" disabled={saving}>
              {saving ? <Spinner /> : null}
              {category ? COMMON.save : COMMON.create}
            </Button>
          </DialogFooter>
        </form>
      </DialogContent>
    </Dialog>
  )
}
