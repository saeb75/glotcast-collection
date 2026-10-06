"use client"

import { Sheet, SheetContent, SheetDescription, SheetHeader, SheetTitle } from "@/components/ui/sheet"
import { COVERS } from "@/copy/covers"
import { type CoverAction, CoverGenerator, type CoverTextSource } from "./CoverGenerator"

/** The cover generator in a side panel (from an image field). */
export function CoverGeneratorSheet({
  open,
  onOpenChange,
  ...props
}: {
  open: boolean
  onOpenChange: (open: boolean) => void
  sessionKey: string
  podcastName: string
  title: string
  sources: CoverTextSource[]
  emptyHint: string
  hint?: string
  actions: CoverAction[]
}) {
  return (
    <Sheet open={open} onOpenChange={onOpenChange}>
      <SheetContent side="right" className="w-full overflow-y-auto sm:max-w-4xl">
        <SheetHeader className="sr-only">
          <SheetTitle>{COVERS.title}</SheetTitle>
          <SheetDescription>{props.hint ?? COVERS.hint}</SheetDescription>
        </SheetHeader>
        <div className="p-4">
          <CoverGenerator {...props} className="border-0 shadow-none ring-0" />
        </div>
      </SheetContent>
    </Sheet>
  )
}
