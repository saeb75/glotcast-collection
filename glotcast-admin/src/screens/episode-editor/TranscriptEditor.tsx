"use client"

import { FileText, TriangleAlert } from "lucide-react"
import { useEffect, useMemo, useRef } from "react"
import { Button } from "@/components/ui/button"
import { Card, CardDescription, CardHeader, CardTitle } from "@/components/ui/card"
import { LEVEL } from "@/copy/levels"
import { draftKey } from "@/domain/levelDraft"
import { activeIndex, type Issue, speakersOf, transcriptIssues } from "@/domain/transcript"
import { type Level, type TranscriptChunk } from "@/schemas/admin"
import { EmptyState } from "@/shared/EmptyState"
import { useLevelEditorStore } from "@/stores/useLevelEditorStore"
import { usePlayerStore } from "@/stores/usePlayerStore"
import { PlayerBar } from "./PlayerBar"
import { TranscriptLine } from "./TranscriptLine"
import { useTranscriptShortcuts } from "./useTranscriptShortcuts"

const NONE: TranscriptChunk[] = []

/** The synced preview over the editable lines; the playing line is highlighted and (when following) kept in view. */
export function TranscriptEditor({ episodeId, level }: { episodeId: string; level: Level }) {
  const key = draftKey(episodeId, level)
  const chunks = useLevelEditorStore((s) => s.drafts[key]?.chunks) ?? NONE
  const duration = useLevelEditorStore((s) => s.drafts[key]?.durationSec ?? null)
  const active = usePlayerStore((s) => (s.key === key ? activeIndex(chunks, s.time) : -1))
  const follow = usePlayerStore((s) => s.follow)
  const playing = usePlayerStore((s) => s.playing)
  const listRef = useRef<HTMLDivElement>(null)

  useTranscriptShortcuts(key)

  const issues = useMemo(() => transcriptIssues(chunks, duration), [chunks, duration])
  const byLine = useMemo(() => {
    const map = new Map<number, Issue[]>()
    for (const issue of issues) map.set(issue.index, [...(map.get(issue.index) ?? []), issue])
    return map
  }, [issues])
  const speakers = useMemo(() => speakersOf(chunks).join(","), [chunks])
  const firstProblem = issues.find((i) => i.blocking) ?? issues[0]

  useEffect(() => {
    if (!follow || !playing || active < 0) return
    listRef.current
      ?.querySelector(`[data-line="${active}"]`)
      ?.scrollIntoView({ block: "center", behavior: "smooth" })
  }, [active, follow, playing])

  const show = (index: number) => {
    const el = listRef.current?.querySelector<HTMLElement>(`[data-line="${index}"]`)
    el?.scrollIntoView({ block: "center", behavior: "smooth" })
    el?.querySelector("textarea")?.focus({ preventScroll: true })
  }

  return (
    <Card className="gap-0 overflow-visible py-0">
      <PlayerBar episodeId={episodeId} level={level} />
      <CardHeader className="border-b py-3">
        <CardTitle className="flex items-center gap-2">
          {LEVEL.editor.title}
          <span className="text-sm font-normal text-muted-foreground">
            {LEVEL.transcribe.lines(chunks.length)}
          </span>
        </CardTitle>
        <CardDescription>{LEVEL.editor.hint}</CardDescription>
        <p className="text-[11px] text-muted-foreground">{LEVEL.editor.shortcuts}</p>
        {firstProblem ? (
          <div className="mt-1 flex items-center gap-2 text-xs text-warning">
            <TriangleAlert className="size-3.5" />
            {LEVEL.editor.issues(new Set(issues.map((i) => i.index)).size)}
            <Button
              variant="link"
              size="xs"
              className="h-auto px-0 text-xs"
              onClick={() => show(firstProblem.index)}
            >
              {LEVEL.editor.jump}
            </Button>
          </div>
        ) : null}
      </CardHeader>
      {chunks.length === 0 ? (
        <EmptyState icon={FileText} description={LEVEL.editor.empty} />
      ) : (
        <div ref={listRef} className="space-y-1.5 p-2 sm:p-3">
          {chunks.map((chunk, index) => (
            <TranscriptLine
              key={index}
              draftKey={key}
              index={index}
              chunk={chunk}
              active={index === active}
              issues={byLine.get(index)}
              speakers={speakers}
              last={index === chunks.length - 1}
              duration={duration}
            />
          ))}
        </div>
      )}
    </Card>
  )
}
