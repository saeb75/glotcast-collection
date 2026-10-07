"use client"

import { BellRing } from "lucide-react"
import { Checkbox } from "@/components/ui/checkbox"
import { Field, FieldContent, FieldDescription, FieldLabel } from "@/components/ui/field"
import { EPISODES } from "@/copy/episodes"
import { formatDateTime } from "@/domain/format"

/** "Notify followers" in the publish and schedule dialogs; read-only once they were notified (it happens once). */
export function NotifyFollowersField({
  id,
  checked,
  onChange,
  notifiedAt,
  disabled,
}: {
  id: string
  checked: boolean
  onChange: (checked: boolean) => void
  notifiedAt: string | null
  disabled?: boolean
}) {
  const e = EPISODES.editor
  if (notifiedAt)
    return (
      <p className="flex items-start gap-2 rounded-lg border bg-muted/40 px-3 py-2.5 text-sm text-muted-foreground">
        <BellRing className="mt-0.5 size-4 shrink-0" />
        {e.alreadyNotified(formatDateTime(notifiedAt))}
      </p>
    )
  return (
    <Field orientation="horizontal" className="rounded-lg border px-3 py-2.5">
      <Checkbox
        id={id}
        checked={checked}
        disabled={disabled}
        onCheckedChange={(value) => onChange(value === true)}
      />
      <FieldContent>
        <FieldLabel htmlFor={id}>{e.notifyFollowers}</FieldLabel>
        <FieldDescription>{e.notifyFollowersHint}</FieldDescription>
      </FieldContent>
    </Field>
  )
}
