"use client"

import { ChevronRight } from "lucide-react"
import Link from "next/link"
import { useRouter } from "next/navigation"
import { Badge } from "@/components/ui/badge"
import { TableCell, TableRow } from "@/components/ui/table"
import { PODCASTS } from "@/copy/podcasts"
import { type AdminPodcast } from "@/schemas/admin"
import { CoverThumb } from "@/shared/CoverThumb"
import { RelativeTime } from "@/shared/RelativeTime"
import { StatusBadge } from "@/shared/StatusBadge"

/** One podcast; the whole row opens the editor (the name is the keyboard link). */
export function PodcastRow({ podcast: p }: { podcast: AdminPodcast }) {
  const router = useRouter()
  const to = `/podcasts/${p.id}`

  return (
    <TableRow className="cursor-pointer" onClick={() => router.push(to)}>
      <TableCell className="pl-4">
        <div className="flex items-center gap-3">
          <CoverThumb url={p.coverUrl} alt="" />
          <div className="min-w-0">
            <Link
              href={to}
              onClick={(e) => e.stopPropagation()}
              className="block max-w-72 truncate font-medium outline-none hover:underline focus-visible:underline"
            >
              {p.name}
            </Link>
            <div className="max-w-72 truncate font-mono text-xs text-muted-foreground">{p.slug}</div>
          </div>
        </div>
      </TableCell>
      <TableCell className="hidden lg:table-cell">
        <div className="flex max-w-64 flex-wrap gap-1">
          {p.categories.map((c) => (
            <Badge key={c.id} variant="secondary" className="font-normal">
              {c.name}
            </Badge>
          ))}
        </div>
      </TableCell>
      <TableCell className="hidden text-muted-foreground tabular-nums sm:table-cell">
        {PODCASTS.episodes(p.publishedEpisodeCount, p.episodeCount)}
      </TableCell>
      <TableCell>
        <StatusBadge status={p.status} />
      </TableCell>
      <TableCell className="hidden text-muted-foreground md:table-cell">
        <RelativeTime value={p.updatedAt} />
      </TableCell>
      <TableCell className="pr-4 text-muted-foreground">
        <ChevronRight className="size-4" />
      </TableCell>
    </TableRow>
  )
}
