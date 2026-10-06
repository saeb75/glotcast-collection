"use client"

import { Crosshair, Minus, Plus } from "lucide-react"
import { formatTimestamp } from "@/domain/format"
import { parseTimestamp } from "@/domain/transcript"
import { LEVEL } from "@/copy/levels"

const STEP = 0.1
const BIG_STEP = 1

const iconButton =
  "inline-flex size-6 items-center justify-center rounded text-muted-foreground outline-none hover:bg-muted hover:text-foreground focus-visible:ring-2 focus-visible:ring-ring/50"

/** A line's start or end: type it, nudge it (±0.1 s, Shift ±1 s), or set it to where the player is. */
export function TimeControl({
  label,
  value,
  onChange,
  onPlayhead,
  playheadLabel,
}: {
  label: string
  value: number
  onChange: (seconds: number) => void
  onPlayhead: () => void
  playheadLabel: string
}) {
  const commit = (text: string) => {
    const seconds = parseTimestamp(text)
    if (seconds !== null && Math.abs(seconds - value) >= 0.005) onChange(seconds)
  }

  return (
    <div className="inline-flex items-center">
      <button
        type="button"
        className={iconButton}
        title={`${LEVEL.editor.minus(String(STEP))} (Shift ${LEVEL.editor.minus(String(BIG_STEP))})`}
        aria-label={`${label} ${LEVEL.editor.minus(String(STEP))}`}
        onClick={(e) => onChange(value - (e.shiftKey ? BIG_STEP : STEP))}
      >
        <Minus className="size-3" />
      </button>
      <input
        key={value}
        defaultValue={formatTimestamp(value)}
        aria-label={label}
        spellCheck={false}
        className="h-6 w-[4.75rem] rounded border border-transparent bg-transparent px-1 text-center font-mono text-xs tabular-nums outline-none hover:border-input focus-visible:border-ring focus-visible:ring-2 focus-visible:ring-ring/30"
        onBlur={(e) => commit(e.target.value)}
        onKeyDown={(e) => {
          if (e.key === "Enter") {
            e.preventDefault()
            commit(e.currentTarget.value)
          } else if (e.key === "ArrowUp" || e.key === "ArrowDown") {
            e.preventDefault()
            onChange(value + (e.key === "ArrowUp" ? 1 : -1) * (e.shiftKey ? BIG_STEP : STEP))
          }
        }}
      />
      <button
        type="button"
        className={iconButton}
        title={`${LEVEL.editor.plus(String(STEP))} (Shift ${LEVEL.editor.plus(String(BIG_STEP))})`}
        aria-label={`${label} ${LEVEL.editor.plus(String(STEP))}`}
        onClick={(e) => onChange(value + (e.shiftKey ? BIG_STEP : STEP))}
      >
        <Plus className="size-3" />
      </button>
      <button type="button" className={iconButton} title={playheadLabel} aria-label={playheadLabel} onClick={onPlayhead}>
        <Crosshair className="size-3" />
      </button>
    </div>
  )
}
