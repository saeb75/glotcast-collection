"use client"

import { useEffect, useRef } from "react"

/** ⌘S / Ctrl S runs `save` (instead of the browser's "save page") while `enabled`. */
export function useSaveShortcut(save: () => void, enabled: boolean): void {
  const latest = useRef(save)
  useEffect(() => {
    latest.current = save
  })
  useEffect(() => {
    if (!enabled) return
    const onKey = (e: KeyboardEvent) => {
      if (e.key.toLowerCase() === "s" && (e.metaKey || e.ctrlKey) && !e.shiftKey && !e.altKey) {
        e.preventDefault()
        latest.current()
      }
    }
    window.addEventListener("keydown", onKey)
    return () => window.removeEventListener("keydown", onKey)
  }, [enabled])
}
