"use client"

import { Merge, Play, Scissors, Trash2 } from "lucide-react"
import { memo, useRef } from "react"
import { LevelEditorController } from "@/controllers/LevelEditorController"
import { PlayerController } from "@/controllers/PlayerController"
import { LEVEL } from "@/copy/levels"
import {
  type Issue,
  mergeWithNext,
  nextSpeaker,
  removeAt,
  replaceAt,
  splitAt,
  withSpeaker,
  withText,
  withTime,
} from "@/domain/transcript"
import { cn } from "@/lib/utils"
import { type TranscriptChunk } from "@/schemas/admin"
import { TimeControl } from "./TimeControl"

const actionButton =
  "inline-flex size-7 items-center justify-center rounded-md text-muted-foreground outline-none hover:bg-muted hover:text-foreground focus-visible:ring-2 focus-visible:ring-ring/50 disabled:pointer-events-none disabled:opacity-40"

/**
 * One line of the transcript: play from it, its speaker, start and end, its text (committed on blur; ⌘↵
 * splits at the cursor, Esc leaves), split / merge with the next / delete. Every change is one undo step.
 */
export const TranscriptLine = memo(function TranscriptLine({
  draftKey,
  index,
  chunk,
  active,
  issues,
  speakers,
  last,
  duration,
}: {
  draftKey: string
  index: number
  chunk: TranscriptChunk
  active: boolean
  issues: Issue[] | undefined
  /** The transcript's speakers, comma-joined (a stable prop). */
  speakers: string
  last: boolean
  duration: number | null
}) {
  const textRef = useRef<HTMLTextAreaElement>(null)
  const e = LEVEL.editor
  const known = speakers ? speakers.split(",") : []
  const fresh = nextSpeaker(known)
  const blocking = issues?.some((i) => i.blocking)

  const edit = (change: (chunks: TranscriptChunk[]) => TranscriptChunk[]) => LevelEditorController.edit(draftKey, change)

  /** The textarea's text, if it differs from the line (typed, not committed yet). */
  const typed = () => {
    const value = textRef.current?.value
    return value !== undefined && value !== chunk.text ? value : null
  }

  const commitText = () => {
    const value = typed()
    if (value !== null) edit((chunks) => replaceAt(chunks, index, withText(chunk, value)))
  }

  const split = () => {
    const value = typed()
    const caret = textRef.current?.selectionStart
    edit((chunks) => {
      const current = value !== null ? replaceAt(chunks, index, withText(chunk, value)) : chunks
      return splitAt(current, index, caret === undefined || caret === null || caret === 0 ? undefined : caret)
    })
  }

  const setTime = (edge: "start" | "end", seconds: number) =>
    edit((chunks) => replaceAt(chunks, index, withTime(chunk, edge, seconds, duration)))

  return (
    <div
      data-line={index}
      className={cn(
        "group/line rounded-lg border bg-card px-2.5 py-2 transition-colors [contain-intrinsic-size:auto_6.5rem] [content-visibility:auto]",
        active && "border-brand/60 bg-brand/5 ring-1 ring-brand/30",
        blocking && "border-destructive/60",
      )}
    >
      <div className="flex flex-wrap items-center gap-x-2 gap-y-1">
        <button
          type="button"
          className="inline-flex h-7 items-center gap-1.5 rounded-md px-1.5 font-mono text-xs text-muted-foreground outline-none hover:bg-muted hover:text-foreground focus-visible:ring-2 focus-visible:ring-ring/50"
          title={e.play}
          onClick={() => PlayerController.playFrom(chunk.start)}
        >
          <Play className={cn("size-3", active && "fill-current text-brand")} />
          {index + 1}
        </button>
        <select
          aria-label={e.speaker}
          value={chunk.speaker ?? ""}
          onChange={(ev) => edit((chunks) => replaceAt(chunks, index, withSpeaker(chunk, ev.target.value || null)))}
          className="h-7 rounded-md border border-input bg-transparent px-1.5 text-xs outline-none focus-visible:ring-2 focus-visible:ring-ring/50 dark:bg-input/30"
        >
          <option value="">{e.noSpeaker}</option>
          {known.map((s) => (
            <option key={s} value={s}>
              {s}
            </option>
          ))}
          <option value={fresh}>{e.newSpeaker(fresh)}</option>
        </select>
        <TimeControl
          label={e.start}
          value={chunk.start}
          onChange={(s) => setTime("start", s)}
          onPlayhead={() => setTime("start", PlayerController.now())}
          playheadLabel={e.setStart}
        />
        <span className="text-xs text-muted-foreground">→</span>
        <TimeControl
          label={e.end}
          value={chunk.end}
          onChange={(s) => setTime("end", s)}
          onPlayhead={() => setTime("end", PlayerController.now())}
          playheadLabel={e.setEnd}
        />
        <span className="hidden text-[11px] text-muted-foreground tabular-nums sm:inline">
          {(chunk.end - chunk.start).toFixed(1)} s
        </span>
        {chunk.words?.length ? (
          <span className="hidden rounded bg-muted px-1.5 py-0.5 text-[10px] text-muted-foreground md:inline">{e.words}</span>
        ) : null}
        {issues?.map((issue) => (
          <span
            key={issue.kind}
            className={cn(
              "rounded px-1.5 py-0.5 text-[10px] font-medium",
              issue.blocking ? "bg-destructive/10 text-destructive" : "bg-warning/15 text-warning",
            )}
          >
            {LEVEL.issues[issue.kind]}
          </span>
        ))}
        <div className="ml-auto flex items-center gap-0.5 opacity-50 transition-opacity group-focus-within/line:opacity-100 group-hover/line:opacity-100">
          <button type="button" className={actionButton} title={`${e.split} (⌘↵)`} aria-label={e.split} onClick={split}>
            <Scissors className="size-3.5" />
          </button>
          <button
            type="button"
            className={actionButton}
            title={e.merge}
            aria-label={e.merge}
            disabled={last}
            onClick={() => {
              commitText()
              edit((chunks) => mergeWithNext(chunks, index))
            }}
          >
            <Merge className="size-3.5" />
          </button>
          <button
            type="button"
            className={cn(actionButton, "hover:text-destructive")}
            title={e.remove}
            aria-label={e.remove}
            onClick={() => edit((chunks) => removeAt(chunks, index))}
          >
            <Trash2 className="size-3.5" />
          </button>
        </div>
      </div>
      <textarea
        ref={textRef}
        key={chunk.text}
        defaultValue={chunk.text}
        rows={1}
        spellCheck
        aria-label={`${index + 1}`}
        className="mt-1 block w-full resize-none rounded-md border border-transparent bg-transparent px-1.5 py-1 text-sm leading-relaxed outline-none [field-sizing:content] hover:border-input focus-visible:border-ring focus-visible:ring-2 focus-visible:ring-ring/30"
        onBlur={commitText}
        onKeyDown={(ev) => {
          if (ev.key === "Enter" && (ev.metaKey || ev.ctrlKey)) {
            ev.preventDefault()
            split()
          } else if (ev.key === "Escape") {
            ev.currentTarget.blur()
          }
        }}
      />
    </div>
  )
})
