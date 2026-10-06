"use client"

import { useEffect } from "react"
import { LevelEditorController } from "@/controllers/LevelEditorController"
import { PlayerController } from "@/controllers/PlayerController"

const TYPING = "input, textarea, select, [contenteditable='true']"
const INTERACTIVE = `${TYPING}, button, a, [role='button'], [role='tab'], [role='switch'], [role='checkbox'], [role='slider'], [role='menuitem'], [role='option'], audio`

/** Space play/pause · ←/→ 5 s · ⌘Z / ⌘⇧Z (⌘Y) undo / redo — when focus isn't in a field. */
export function useTranscriptShortcuts(draftKey: string): void {
  useEffect(() => {
    const onKey = (e: KeyboardEvent) => {
      if (e.defaultPrevented) return
      const target = e.target instanceof HTMLElement ? e.target : null
      const typing = Boolean(target?.closest(TYPING))
      const mod = e.metaKey || e.ctrlKey
      const key = e.key.toLowerCase()
      if (mod && !typing && (key === "z" || key === "y")) {
        e.preventDefault()
        if (key === "y" || e.shiftKey) LevelEditorController.redo(draftKey)
        else LevelEditorController.undo(draftKey)
        return
      }
      if (mod || e.altKey || target?.closest(INTERACTIVE)) return
      if (e.key === " ") {
        e.preventDefault()
        PlayerController.toggle()
      } else if (e.key === "ArrowLeft") {
        e.preventDefault()
        PlayerController.seekBy(-5)
      } else if (e.key === "ArrowRight") {
        e.preventDefault()
        PlayerController.seekBy(5)
      }
    }
    window.addEventListener("keydown", onKey)
    return () => window.removeEventListener("keydown", onKey)
  }, [draftKey])
}
