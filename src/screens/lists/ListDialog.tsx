"use client"

import { useRouter } from "next/navigation"
import { type FormEvent, useState } from "react"
import { Button } from "@/components/ui/button"
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog"
import { Field, FieldDescription, FieldError, FieldGroup, FieldLabel } from "@/components/ui/field"
import { Input } from "@/components/ui/input"
import { Spinner } from "@/components/ui/spinner"
import { Textarea } from "@/components/ui/textarea"
import { ListsController } from "@/controllers/ListsController"
import { COMMON } from "@/copy/common"
import { LISTS } from "@/copy/lists"
import { blankToNull, fieldErrors } from "@/domain/forms"
import { slugify } from "@/domain/slug"
import { listFormSchema } from "@/schemas/forms"

/** A new list; then its page opens to pick the episodes. */
export function ListDialog({ open, onOpenChange }: { open: boolean; onOpenChange: (open: boolean) => void }) {
  const router = useRouter()
  const [name, setName] = useState("")
  const [slug, setSlug] = useState("")
  const [description, setDescription] = useState("")
  const [errors, setErrors] = useState<Record<string, string>>({})
  const [saving, setSaving] = useState(false)

  const submit = async (event: FormEvent) => {
    event.preventDefault()
    const parsed = listFormSchema.safeParse({ name, slug, description })
    if (!parsed.success) return setErrors(fieldErrors(parsed.error))
    setSaving(true)
    const list = await ListsController.create({
      name: parsed.data.name,
      description: blankToNull(parsed.data.description),
      ...(parsed.data.slug ? { slug: parsed.data.slug } : {}),
    })
    setSaving(false)
    if (list) {
      onOpenChange(false)
      router.push(`/lists/${list.id}`)
    }
  }

  return (
    <Dialog open={open} onOpenChange={(next) => !saving && onOpenChange(next)}>
      <DialogContent className="sm:max-w-lg">
        <form onSubmit={(event) => void submit(event)} noValidate className="grid gap-4">
          <DialogHeader>
            <DialogTitle>{LISTS.createTitle}</DialogTitle>
            <DialogDescription>{LISTS.subtitle}</DialogDescription>
          </DialogHeader>
          <FieldGroup>
            <Field data-invalid={errors.name ? true : undefined}>
              <FieldLabel htmlFor="list-name">{LISTS.name}</FieldLabel>
              <Input
                id="list-name"
                autoFocus
                value={name}
                maxLength={120}
                aria-invalid={errors.name ? true : undefined}
                onChange={(e) => setName(e.target.value)}
              />
              {errors.name ? <FieldError>{errors.name}</FieldError> : null}
            </Field>
            <Field data-invalid={errors.slug ? true : undefined}>
              <FieldLabel htmlFor="list-slug">
                {LISTS.slug} <span className="font-normal text-muted-foreground">({COMMON.optional})</span>
              </FieldLabel>
              <Input
                id="list-slug"
                className="font-mono"
                value={slug}
                placeholder={slugify(name)}
                aria-invalid={errors.slug ? true : undefined}
                onChange={(e) => setSlug(e.target.value.toLowerCase())}
              />
              {errors.slug ? (
                <FieldError>{errors.slug}</FieldError>
              ) : (
                <FieldDescription>{LISTS.slugHint(slugify(name))}</FieldDescription>
              )}
            </Field>
            <Field>
              <FieldLabel htmlFor="list-description">{LISTS.description}</FieldLabel>
              <Textarea
                id="list-description"
                rows={3}
                maxLength={2000}
                value={description}
                onChange={(e) => setDescription(e.target.value)}
              />
            </Field>
          </FieldGroup>
          <DialogFooter>
            <Button type="button" variant="outline" disabled={saving} onClick={() => onOpenChange(false)}>
              {COMMON.cancel}
            </Button>
            <Button type="submit" disabled={saving}>
              {saving ? <Spinner /> : null}
              {COMMON.create}
            </Button>
          </DialogFooter>
        </form>
      </DialogContent>
    </Dialog>
  )
}
