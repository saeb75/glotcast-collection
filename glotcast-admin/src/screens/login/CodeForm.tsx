"use client"

import { type FormEvent, useState } from "react"
import { Button } from "@/components/ui/button"
import { Field, FieldDescription, FieldError, FieldGroup, FieldLabel } from "@/components/ui/field"
import { Input } from "@/components/ui/input"
import { Spinner } from "@/components/ui/spinner"
import { AuthController } from "@/controllers/AuthController"
import { AUTH, AUTH_ERRORS } from "@/copy/auth"
import { useLoginStore } from "@/stores/useLoginStore"

/** The emailed code: 6–10 digits depending on the Supabase project's setting. */
export function CodeForm() {
  const email = useLoginStore((s) => s.email)
  const busy = useLoginStore((s) => s.busy)
  const error = useLoginStore((s) => s.error)
  const [code, setCode] = useState("")

  const submit = (e: FormEvent) => {
    e.preventDefault()
    if (code.length >= 6) void AuthController.verifyCode(code)
  }

  return (
    <form onSubmit={submit}>
      <FieldGroup>
        <div className="space-y-1">
          <h1 className="text-lg font-semibold">{AUTH.codeTitle}</h1>
          <FieldDescription>{AUTH.codeHint(email)}</FieldDescription>
        </div>
        <Field data-invalid={error ? true : undefined}>
          <FieldLabel htmlFor="code">{AUTH.code}</FieldLabel>
          <Input
            id="code"
            inputMode="numeric"
            autoComplete="one-time-code"
            autoFocus
            maxLength={10}
            className="font-mono tracking-[0.3em]"
            value={code}
            onChange={(e) => setCode(e.target.value.replace(/\D/g, ""))}
            aria-invalid={error ? true : undefined}
          />
          {error ? <FieldError>{AUTH_ERRORS[error]}</FieldError> : null}
        </Field>
        <Button type="submit" disabled={busy || code.length < 6}>
          {busy ? <Spinner /> : null}
          {AUTH.verify}
        </Button>
        <div className="flex items-center justify-between">
          <Button
            type="button"
            variant="link"
            size="sm"
            className="px-0"
            onClick={() => AuthController.changeEmail()}
          >
            {AUTH.otherEmail}
          </Button>
          <Button
            type="button"
            variant="link"
            size="sm"
            className="px-0"
            disabled={busy}
            onClick={() => void AuthController.sendCode(email)}
          >
            {AUTH.resend}
          </Button>
        </div>
      </FieldGroup>
    </form>
  )
}
