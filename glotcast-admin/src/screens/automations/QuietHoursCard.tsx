"use client"

import { Moon } from "lucide-react"
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card"
import { Field, FieldError, FieldLabel } from "@/components/ui/field"
import { Input } from "@/components/ui/input"
import { AutomationsController } from "@/controllers/AutomationsController"
import { AUTOMATIONS } from "@/copy/automations"
import { type AutomationsForm } from "@/domain/automations"

/** The window without automated pushes, in each user's own time. */
export function QuietHoursCard({
  draft,
  errors,
}: {
  draft: AutomationsForm
  errors: Record<string, string>
}) {
  const q = AUTOMATIONS.quiet
  const { from, to } = draft.quietHours

  return (
    <Card>
      <CardHeader>
        <CardTitle className="flex items-center gap-2">
          <Moon className="size-4 text-brand" />
          {q.title}
        </CardTitle>
        <CardDescription>{q.hint}</CardDescription>
      </CardHeader>
      <CardContent className="space-y-2">
        <div className="grid max-w-sm grid-cols-2 gap-3">
          <Field data-invalid={errors["quietHours.from"] ? true : undefined}>
            <FieldLabel htmlFor="quiet-from">{q.from}</FieldLabel>
            <Input
              id="quiet-from"
              type="time"
              value={from}
              aria-invalid={errors["quietHours.from"] ? true : undefined}
              onChange={(e) => AutomationsController.update("quietHours", { from: e.target.value })}
            />
            {errors["quietHours.from"] ? <FieldError>{errors["quietHours.from"]}</FieldError> : null}
          </Field>
          <Field data-invalid={errors["quietHours.to"] ? true : undefined}>
            <FieldLabel htmlFor="quiet-to">{q.to}</FieldLabel>
            <Input
              id="quiet-to"
              type="time"
              value={to}
              aria-invalid={errors["quietHours.to"] ? true : undefined}
              onChange={(e) => AutomationsController.update("quietHours", { to: e.target.value })}
            />
            {errors["quietHours.to"] ? <FieldError>{errors["quietHours.to"]}</FieldError> : null}
          </Field>
        </div>
        {from && from === to ? <p className="text-sm text-muted-foreground">{q.none}</p> : null}
      </CardContent>
    </Card>
  )
}
