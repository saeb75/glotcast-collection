"use client"

import { CircleAlert, UsersRound } from "lucide-react"
import { useEffect } from "react"
import { Skeleton } from "@/components/ui/skeleton"
import { Spinner } from "@/components/ui/spinner"
import { CampaignEditorController } from "@/controllers/CampaignEditorController"
import { CAMPAIGNS } from "@/copy/campaigns"
import { audienceKey, localeName } from "@/domain/campaign"
import { formatCount } from "@/domain/format"
import { cn } from "@/lib/utils"
import { type Audience } from "@/schemas/admin"
import { useCampaignEditorStore } from "@/stores/useCampaignEditorStore"

const TOP = 4

/** How many users the audience matches and how many will get it, by language; counted 500 ms after a change. */
export function ReachSummary({ audience }: { audience: Audience }) {
  const key = audienceKey(audience)
  const entry = useCampaignEditorStore((s) => s.reach[key])
  const shown = useCampaignEditorStore((s) => (s.reachShownKey ? s.reach[s.reachShownKey]?.data : undefined))
  const reach = entry?.data ?? shown
  const r = CAMPAIGNS.editor.reach

  useEffect(() => {
    const timer = window.setTimeout(
      () => void CampaignEditorController.reach(JSON.parse(key) as Audience),
      500,
    )
    return () => window.clearTimeout(timer)
  }, [key])

  if (entry?.error && !entry.data)
    return (
      <p className="flex items-center gap-2 text-sm text-destructive">
        <CircleAlert className="size-4" />
        {r.failed} {entry.error}
      </p>
    )

  if (!reach)
    return (
      <div className="flex w-full flex-wrap gap-6">
        <Skeleton className="h-10 w-28" />
        <Skeleton className="h-10 w-28" />
        <Skeleton className="h-10 w-56" />
      </div>
    )

  const top = reach.byLanguage.slice(0, TOP)
  const rest = reach.byLanguage.length - top.length
  return (
    <div
      className={cn(
        "flex w-full flex-wrap items-start gap-x-8 gap-y-3 transition-opacity",
        !entry?.data && "opacity-60",
      )}
      aria-live="polite"
    >
      <div>
        <div className="text-xs text-muted-foreground">{r.matched}</div>
        <div className="text-xl font-semibold tabular-nums">{formatCount(reach.matched)}</div>
      </div>
      <div>
        <div className="flex items-center gap-1.5 text-xs text-muted-foreground">
          {r.reachable}
          {entry?.loading ? <Spinner className="size-3" /> : null}
        </div>
        <div className="flex items-center gap-1.5 text-xl font-semibold text-brand tabular-nums">
          <UsersRound className="size-4" />
          {formatCount(reach.reachable)}
        </div>
        <div className="text-xs text-muted-foreground">{r.reachableHint}</div>
      </div>
      <div className="min-w-0 flex-1">
        <div className="text-xs text-muted-foreground">{r.languages}</div>
        {reach.reachable === 0 ? (
          <p className="mt-1 text-sm text-warning">{r.nobody}</p>
        ) : (
          <ul className="mt-1 flex flex-wrap gap-x-3 gap-y-1 text-sm">
            {top.map((l) => (
              <li key={l.language}>
                {localeName(l.language)}{" "}
                <span className="text-muted-foreground tabular-nums">{formatCount(l.reachable)}</span>
              </li>
            ))}
            {rest > 0 ? <li className="text-muted-foreground">{r.more(rest)}</li> : null}
          </ul>
        )}
      </div>
    </div>
  )
}
