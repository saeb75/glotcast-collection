import { Podcast, SearchX } from "lucide-react"
import { type ReactNode } from "react"
import { Skeleton } from "@/components/ui/skeleton"
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table"
import { PODCASTS } from "@/copy/podcasts"
import { cn } from "@/lib/utils"
import { type AdminPodcast } from "@/schemas/admin"
import { EmptyState } from "@/shared/EmptyState"
import { PodcastRow } from "./PodcastRow"

const SKELETON = Array.from({ length: 8 }, (_, i) => i)

/** The list itself; `stale` = the previous query's rows while this one loads. */
export function PodcastsTable({
  podcasts,
  stale,
  filtered,
  emptyAction,
}: {
  podcasts: AdminPodcast[] | undefined
  stale: boolean
  filtered: boolean
  emptyAction: ReactNode
}) {
  if (podcasts && podcasts.length === 0)
    return (
      <EmptyState
        icon={filtered ? SearchX : Podcast}
        title={PODCASTS.emptyTitle}
        description={filtered ? PODCASTS.emptyFiltered : PODCASTS.emptyAll}
        action={emptyAction}
      />
    )

  const c = PODCASTS.columns
  return (
    <Table className={cn("transition-opacity", stale && podcasts && "opacity-60")}>
      <TableHeader>
        <TableRow className="hover:bg-transparent">
          <TableHead className="pl-4">{c.podcast}</TableHead>
          <TableHead className="hidden lg:table-cell">{c.categories}</TableHead>
          <TableHead className="hidden sm:table-cell">{c.episodes}</TableHead>
          <TableHead>{c.status}</TableHead>
          <TableHead className="hidden md:table-cell">{c.updated}</TableHead>
          <TableHead className="w-10 pr-4" />
        </TableRow>
      </TableHeader>
      <TableBody>
        {podcasts
          ? podcasts.map((p) => <PodcastRow key={p.id} podcast={p} />)
          : SKELETON.map((i) => (
              <TableRow key={i} className="hover:bg-transparent">
                <TableCell className="pl-4">
                  <div className="flex items-center gap-3">
                    <Skeleton className="size-10 rounded-md" />
                    <div className="space-y-1.5">
                      <Skeleton className="h-4 w-44" />
                      <Skeleton className="h-3 w-24" />
                    </div>
                  </div>
                </TableCell>
                <TableCell className="hidden lg:table-cell">
                  <Skeleton className="h-5 w-24 rounded-full" />
                </TableCell>
                <TableCell className="hidden sm:table-cell">
                  <Skeleton className="h-4 w-20" />
                </TableCell>
                <TableCell>
                  <Skeleton className="h-5 w-20 rounded-full" />
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
