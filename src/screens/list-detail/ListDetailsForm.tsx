"use client"

import { type FormEvent, useState } from "react"
import { Button } from "@/components/ui/button"
import { Card, CardContent, CardDescription, CardFooter, CardHeader, CardTitle } from "@/components/ui/card"
import { Field, FieldError, FieldGroup, FieldLabel } from "@/components/ui/field"
import { Input } from "@/components/ui/input"
import { Spinner } from "@/components/ui/spinner"
import { Textarea } from "@/components/ui/textarea"
import { ListsController } from "@/controllers/ListsController"
import { COMMON } from "@/copy/common"
import { LISTS } from "@/copy/lists"
import { blankToNull, fieldErrors } from "@/domain/forms"
import { type AdminListDetail, type ListInput } from "@/schemas/admin"
import { listFormSchema } from "@/schemas/forms"

/** The list's name, slug and description. */
export function ListDetailsForm({ list }: { list: AdminListDetail }) {
  const initial = { name: list.name, slug: list.slug, description: list.description ?? "" }
  const [values, setValues] = useState(initial)
  const [errors, setErrors] = useState<Record<string, string>>({})
  const [saving, setSaving] = useState(false)
  const dirty = JSON.stringify(values) !== JSON.stringify(initial)

  const submit = async (event: FormEvent) => {
    event.preventDefault()
    const parsed = listFormSchema.safeParse(values)
    if (!parsed.success) return setErrors(fieldErrors(parsed.error))
    const input: ListInput = {}
    if (parsed.data.name !== list.name) input.name = parsed.data.name
    if (parsed.data.slug && parsed.data.slug !== list.slug) input.slug = parsed.data.slug
    if (values.description !== initial.description) input.description = blankToNull(parsed.data.description)
    setSaving(true)
    await ListsController.update(list.id, input)
    setSaving(false)
  }

  return (
    <form onSubmit={(event) => void submit(event)} noValidate>
      <Card>
        <CardHeader>
          <CardTitle>{LISTS.detailsTitle}</CardTitle>
          <CardDescription>{LISTS.detailsHint}</CardDescription>
        </CardHeader>
        <CardContent>
          <FieldGroup>
            <Field data-invalid={errors.name ? true : undefined}>
              <FieldLabel htmlFor="list-name">{LISTS.name}</FieldLabel>
              <Input
                id="list-name"
                value={values.name}
                maxLength={120}
                aria-invalid={errors.name ? true : undefined}
                onChange={(e) => setValues((v) => ({ ...v, name: e.target.value }))}
              />
              {errors.name ? <FieldError>{errors.name}</FieldError> : null}
            </Field>
            <Field data-invalid={errors.slug ? true : undefined}>
              <FieldLabel htmlFor="list-slug">{LISTS.slug}</FieldLabel>
              <Input
                id="list-slug"
                className="font-mono"
                value={values.slug}
                aria-invalid={errors.slug ? true : undefined}
                onChange={(e) => setValues((v) => ({ ...v, slug: e.target.value.toLowerCase() }))}
              />
              {errors.slug ? <FieldError>{errors.slug}</FieldError> : null}
            </Field>
            <Field>
              <FieldLabel htmlFor="list-description">{LISTS.description}</FieldLabel>
              <Textarea
                id="list-description"
                rows={3}
                maxLength={2000}
                value={values.description}
                onChange={(e) => setValues((v) => ({ ...v, description: e.target.value }))}
              />
            </Field>
          </FieldGroup>
        </CardContent>
        <CardFooter className="justify-end gap-2 border-t">
          {dirty ? (
            <Button type="button" variant="ghost" disabled={saving} onClick={() => setValues(initial)}>
              {COMMON.discard}
            </Button>
          ) : null}
          <Button type="submit" disabled={!dirty || saving}>
            {saving ? <Spinner /> : null}
            {COMMON.save}
          </Button>
        </CardFooter>
      </Card>
    </form>
  )
}
