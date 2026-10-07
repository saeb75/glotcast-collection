"use client"

import { Circle, CircleAlert, CircleCheck } from "lucide-react"
import { useMemo } from "react"
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card"
import { CAMPAIGNS } from "@/copy/campaigns"
import {
  audienceInput,
  audienceKey,
  linkNeedsId,
  LOCALES,
  localeName,
  messageProblem,
  readyLocales,
} from "@/domain/campaign"
import { formatCount } from "@/domain/format"
import { cn } from "@/lib/utils"
import { type CampaignEditor, useCampaignEditorStore } from "@/stores/useCampaignEditorStore"

type State = "done" | "todo" | "warn"

const ICONS = { done: CircleCheck, todo: Circle, warn: CircleAlert } as const

/** What the campaign still needs before it can go out (and what is merely incomplete). */
export function ChecklistCard({ editor }: { editor: CampaignEditor }) {
  const { draft } = editor
  const key = useMemo(() => audienceKey(audienceInput(draft.audience)), [draft.audience])
  const reach = useCampaignEditorStore((s) => s.reach[key]?.data)
  const c = CAMPAIGNS.editor.checklist
  const ready = readyLocales(draft.messages).length

  const items: { label: string; state: State }[] = [
    { label: c.name, state: draft.name.trim() ? "done" : "todo" },
    {
      label: c.source(localeName(draft.sourceLanguage)),
      state: messageProblem(draft.messages[draft.sourceLanguage]) === null ? "done" : "todo",
    },
    { label: c.translations(ready, LOCALES.length), state: ready === LOCALES.length ? "done" : "warn" },
    { label: c.link, state: !linkNeedsId(draft.link.type) || draft.link.id ? "done" : "todo" },
    {
      label: reach ? c.reach(formatCount(reach.reachable)) : c.reachUnknown,
      state: !reach ? "todo" : reach.reachable > 0 ? "done" : "warn",
    },
  ]

  return (
    <Card size="sm">
      <CardHeader>
        <CardTitle>{c.title}</CardTitle>
      </CardHeader>
      <CardContent>
        <ul className="grid gap-2 text-sm">
          {items.map((item) => {
            const Icon = ICONS[item.state]
            return (
              <li key={item.label} className="flex items-center gap-2">
                <Icon
                  className={cn(
                    "size-4 shrink-0",
                    item.state === "done"
                      ? "text-positive"
                      : item.state === "warn"
                        ? "text-warning"
                        : "text-muted-foreground",
                  )}
                />
                <span className={cn(item.state === "todo" && "text-muted-foreground")}>{item.label}</span>
              </li>
            )
          })}
        </ul>
      </CardContent>
    </Card>
  )
}
