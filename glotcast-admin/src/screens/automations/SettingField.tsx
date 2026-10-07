"use client"

import { Field, FieldDescription, FieldError, FieldLabel } from "@/components/ui/field"
import { Input } from "@/components/ui/input"
import { InputGroup, InputGroupAddon, InputGroupInput, InputGroupText } from "@/components/ui/input-group"

/** A time ("HH:mm") or a whole number (with its unit) of an automation, with its hint or its error. */
export function SettingField({
  id,
  label,
  hint,
  error,
  value,
  onChange,
  type,
  unit,
}: {
  id: string
  label: string
  hint?: string
  error?: string
  value: string
  onChange: (value: string) => void
  type: "time" | "number"
  unit?: string
}) {
  return (
    <Field data-invalid={error ? true : undefined}>
      <FieldLabel htmlFor={id}>{label}</FieldLabel>
      {type === "time" ? (
        <Input
          id={id}
          type="time"
          className="max-w-40"
          value={value}
          aria-invalid={error ? true : undefined}
          onChange={(e) => onChange(e.target.value)}
        />
      ) : (
        <InputGroup className="max-w-40">
          <InputGroupInput
            id={id}
            inputMode="numeric"
            value={value}
            aria-invalid={error ? true : undefined}
            onChange={(e) => onChange(e.target.value.replace(/[^\d]/g, "").slice(0, 5))}
          />
          {unit ? (
            <InputGroupAddon align="inline-end">
              <InputGroupText>{unit}</InputGroupText>
            </InputGroupAddon>
          ) : null}
        </InputGroup>
      )}
      {error ? <FieldError>{error}</FieldError> : hint ? <FieldDescription>{hint}</FieldDescription> : null}
    </Field>
  )
}
