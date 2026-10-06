"use client"

import { Search } from "lucide-react"
import { Button } from "@/components/ui/button"
import { Kbd, KbdGroup } from "@/components/ui/kbd"
import { CommandController } from "@/controllers/CommandController"
import { NAV_COPY } from "@/copy/nav"

/** Opens the ⌘K menu; shows the shortcut on wider screens. */
export function SearchButton() {
  return (
    <Button
      variant="outline"
      size="sm"
      className="w-9 justify-center px-0 text-muted-foreground sm:w-56 sm:justify-between sm:px-2.5"
      onClick={() => CommandController.setOpen(true)}
      aria-label={NAV_COPY.search}
    >
      <span className="flex items-center gap-2">
        <Search />
        <span className="hidden sm:inline">{NAV_COPY.search}…</span>
      </span>
      <KbdGroup className="hidden sm:inline-flex">
        <Kbd>⌘</Kbd>
        <Kbd>K</Kbd>
      </KbdGroup>
    </Button>
  )
}
