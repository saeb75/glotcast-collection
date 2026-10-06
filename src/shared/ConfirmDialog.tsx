"use client"

import { type ReactNode, useState } from "react"
import {
  AlertDialog,
  AlertDialogCancel,
  AlertDialogContent,
  AlertDialogDescription,
  AlertDialogFooter,
  AlertDialogHeader,
  AlertDialogTitle,
  AlertDialogTrigger,
} from "@/components/ui/alert-dialog"
import { Button } from "@/components/ui/button"
import { Spinner } from "@/components/ui/spinner"
import { COMMON } from "@/copy/common"

/**
 * "Are you sure?" before anything destructive. Stays open (spinner) while `onConfirm` runs; closes when it
 * answers anything but `false`.
 */
export function ConfirmDialog({
  trigger,
  open: controlledOpen,
  onOpenChange,
  title,
  description,
  confirmLabel = COMMON.delete,
  destructive = true,
  onConfirm,
  children,
}: {
  trigger?: ReactNode
  open?: boolean
  onOpenChange?: (open: boolean) => void
  title: string
  description: ReactNode
  confirmLabel?: string
  destructive?: boolean
  onConfirm: () => unknown
  /** Extra content under the description (a warning). */
  children?: ReactNode
}) {
  const [innerOpen, setInnerOpen] = useState(false)
  const [busy, setBusy] = useState(false)
  const open = controlledOpen ?? innerOpen
  const setOpen = (next: boolean) => {
    if (busy) return
    setInnerOpen(next)
    onOpenChange?.(next)
  }

  const confirm = async () => {
    setBusy(true)
    try {
      const result = await onConfirm()
      if (result !== false) {
        setInnerOpen(false)
        onOpenChange?.(false)
      }
    } finally {
      setBusy(false)
    }
  }

  return (
    <AlertDialog open={open} onOpenChange={setOpen}>
      {trigger ? <AlertDialogTrigger asChild>{trigger}</AlertDialogTrigger> : null}
      <AlertDialogContent>
        <AlertDialogHeader>
          <AlertDialogTitle>{title}</AlertDialogTitle>
          <AlertDialogDescription>{description}</AlertDialogDescription>
        </AlertDialogHeader>
        {children}
        <AlertDialogFooter>
          <AlertDialogCancel disabled={busy}>{COMMON.cancel}</AlertDialogCancel>
          <Button variant={destructive ? "destructive" : "default"} disabled={busy} onClick={() => void confirm()}>
            {busy ? <Spinner /> : null}
            {confirmLabel}
          </Button>
        </AlertDialogFooter>
      </AlertDialogContent>
    </AlertDialog>
  )
}
