"use client"

import { type FormEvent, useState } from "react"
import { z } from "zod"
import { Button } from "@/components/ui/button"
import { Field, FieldDescription, FieldError, FieldGroup, FieldLabel } from "@/components/ui/field"
import { Input } from "@/components/ui/input"
import { Spinner } from "@/components/ui/spinner"
import { AuthController } from "@/controllers/AuthController"
import { AUTH, AUTH_ERRORS } from "@/copy/auth"
import { useLoginStore } from "@/stores/useLoginStore"

const emailSchema = z.email()

export function EmailForm() {
  const busy = useLoginStore((s) => s.busy)
  const error = useLoginStore((s) => s.error)
  const [email, setEmail] = useState(useLoginStore.getState().email)
  const valid = emailSchema.safeParse(email.trim()).success

  const submit = (e: FormEvent) => {
    e.preventDefault()
    if (valid) void AuthController.sendCode(email)
  }

  return (
    <form onSubmit={submit}>
      <FieldGroup>
        <div className="space-y-1">
          <h1 className="text-lg font-semibold">{AUTH.title}</h1>
          <FieldDescription>{AUTH.emailHint}</FieldDescription>
        </div>
        <Field data-invalid={error ? true : undefined}>
          <FieldLabel htmlFor="email">{AUTH.email}</FieldLabel>
          <Input
            id="email"
            type="email"
            autoComplete="email"
            autoFocus
            required
            placeholder={AUTH.emailPlaceholder}
            value={email}
            onChange={(e) => setEmail(e.target.value)}
            aria-invalid={error ? true : undefined}
          />
          {error ? <FieldError>{AUTH_ERRORS[error]}</FieldError> : null}
        </Field>
        <Button type="submit" disabled={busy || !valid}>
          {busy ? <Spinner /> : null}
          {AUTH.sendCode}
        </Button>
      </FieldGroup>
    </form>
  )
}
