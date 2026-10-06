"use client"

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
import { Field, FieldError, FieldLabel } from "@/components/ui/field"
import { Input } from "@/components/ui/input"
import { Spinner } from "@/components/ui/spinner"
import { EpisodesController } from "@/controllers/EpisodesController"
import { COMMON } from "@/copy/common"
import { EPISODES } from "@/copy/episodes"
import { fromLocalInput, toLocalInput } from "@/domain/datetime"

/** Picks the moment the episode goes live (PATCH publishedAt). */
export function ScheduleDialog({
  episodeId,
  current,
  open,
  onOpenChange,
}: {
  episodeId: string
  current: string | null
  open: boolean
  onOpenChange: (open: boolean) => void
}) {
  const [value, setValue] = useState(() => toLocalInput(current))
  const [error, setError] = useState<string | null>(null)
  const [busy, setBusy] = useState(false)
  const e = EPISODES.editor

  const submit = async (event: FormEvent) => {
    event.preventDefault()
    const iso = fromLocalInput(value)
    if (!iso || new Date(iso).getTime() <= Date.now()) return setError(e.schedulePast)
    setBusy(true)
    const saved = await EpisodesController.schedule(episodeId, iso)
    setBusy(false)
    if (saved) onOpenChange(false)
  }

  return (
    <Dialog open={open} onOpenChange={(next) => !busy && onOpenChange(next)}>
      <DialogContent>
        <form onSubmit={(event) => void submit(event)} className="grid gap-4">
          <DialogHeader>
            <DialogTitle>{e.scheduleTitle}</DialogTitle>
            <DialogDescription>{e.scheduleBody}</DialogDescription>
          </DialogHeader>
          <Field data-invalid={error ? true : undefined}>
            <FieldLabel htmlFor="schedule-at">{e.scheduleField}</FieldLabel>
            <Input
              id="schedule-at"
              type="datetime-local"
              value={value}
              aria-invalid={error ? true : undefined}
              onChange={(ev) => {
                setValue(ev.target.value)
                setError(null)
              }}
            />
            {error ? <FieldError>{error}</FieldError> : null}
          </Field>
          <DialogFooter>
            <Button type="button" variant="outline" disabled={busy} onClick={() => onOpenChange(false)}>
              {COMMON.cancel}
            </Button>
            <Button type="submit" disabled={busy || !value}>
              {busy ? <Spinner /> : null}
              {e.scheduleSubmit}
            </Button>
          </DialogFooter>
        </form>
      </DialogContent>
    </Dialog>
  )
}
