import { AudioLines, SearchX } from "lucide-react"
import { type ReactNode } from "react"
import { Skeleton } from "@/components/ui/skeleton"
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table"
import { EPISODES } from "@/copy/episodes"
import { cn } from "@/lib/utils"
import { type AdminEpisode } from "@/schemas/admin"
import { EmptyState } from "@/shared/EmptyState"
import { EpisodeRow } from "./EpisodeRow"

const SKELETON = Array.from({ length: 8 }, (_, i) => i)

export function EpisodesTable({
  episodes,
  stale,
  filtered,
  emptyAction,
}: {
  episodes: AdminEpisode[] | undefined
  stale: boolean
  filtered: boolean
  emptyAction: ReactNode
}) {
  if (episodes && episodes.length === 0)
    return (
      <EmptyState
        icon={filtered ? SearchX : AudioLines}
        title={EPISODES.emptyTitle}
        description={filtered ? EPISODES.emptyFiltered : EPISODES.emptyAll}
        action={emptyAction}
      />
    )

  const c = EPISODES.columns
  return (
    <Table className={cn("transition-opacity", stale && episodes && "opacity-60")}>
      <TableHeader>
        <TableRow className="hover:bg-transparent">
          <TableHead className="pl-4">{c.episode}</TableHead>
          <TableHead className="hidden sm:table-cell">{c.levels}</TableHead>
          <TableHead>{c.status}</TableHead>
          <TableHead className="hidden lg:table-cell">{c.access}</TableHead>
          <TableHead className="hidden md:table-cell">{c.updated}</TableHead>
          <TableHead className="w-10 pr-4" />
        </TableRow>
      </TableHeader>
      <TableBody>
        {episodes
          ? episodes.map((e) => <EpisodeRow key={e.id} episode={e} />)
          : SKELETON.map((i) => (
              <TableRow key={i} className="hover:bg-transparent">
                <TableCell className="pl-4">
                  <div className="flex items-center gap-3">
                    <Skeleton className="h-11 w-8 rounded-md" />
                    <div className="space-y-1.5">
                      <Skeleton className="h-4 w-56" />
                      <Skeleton className="h-3 w-28" />
                    </div>
                  </div>
                </TableCell>
                <TableCell className="hidden sm:table-cell">
                  <Skeleton className="h-5 w-24" />
                </TableCell>
                <TableCell>
                  <Skeleton className="h-5 w-20 rounded-full" />
                </TableCell>
                <TableCell className="hidden lg:table-cell">
                  <Skeleton className="h-5 w-12 rounded-full" />
                </TableCell>
                <TableCell className="hidden md:table-cell">
                  <Skeleton className="h-4 w-20" />
                </TableCell>
                <TableCell className="pr-4" />
              </TableRow>
            ))}
      </TableBody>
    </Table>
  )
}
