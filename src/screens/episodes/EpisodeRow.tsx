"use client"

import { ChevronRight, Crown } from "lucide-react"
import { useRouter } from "next/navigation"
import { Badge } from "@/components/ui/badge"
import { TableCell, TableRow } from "@/components/ui/table"
import { EPISODES } from "@/copy/episodes"
import { type AdminEpisode } from "@/schemas/admin"
import { EpisodeCell } from "@/shared/EpisodeCell"
import { LevelBadges } from "@/shared/LevelBadges"
import { RelativeTime } from "@/shared/RelativeTime"
import { StatusBadge } from "@/shared/StatusBadge"

/** One episode; the whole row opens the editor. */
export function EpisodeRow({ episode: e }: { episode: AdminEpisode }) {
  const router = useRouter()
  return (
    <TableRow className="cursor-pointer" onClick={() => router.push(`/episodes/${e.id}`)}>
      <TableCell className="max-w-96 pl-4">
        <EpisodeCell episode={e} />
      </TableCell>
      <TableCell className="hidden sm:table-cell">
        <LevelBadges levels={e.levels} />
      </TableCell>
      <TableCell>
        <StatusBadge status={e.status} />
      </TableCell>
      <TableCell className="hidden lg:table-cell">
        {e.isPro ? (
          <Badge variant="outline">
            <Crown data-icon="inline-start" />
            {EPISODES.pro}
          </Badge>
        ) : (
          <span className="text-sm text-muted-foreground">{EPISODES.free}</span>
        )}
      </TableCell>
      <TableCell className="hidden text-muted-foreground md:table-cell">
        <RelativeTime value={e.updatedAt} />
      </TableCell>
      <TableCell className="pr-4 text-muted-foreground">
        <ChevronRight className="size-4" />
      </TableCell>
    </TableRow>
  )
}
