import { Headphones } from "lucide-react"
import Link from "next/link"
import { Skeleton } from "@/components/ui/skeleton"
import { DASHBOARD } from "@/copy/dashboard"
import { episodeLabel } from "@/domain/format"
import { type TopEpisode } from "@/schemas/admin"
import { CoverThumb } from "@/shared/CoverThumb"
import { EmptyState } from "@/shared/EmptyState"
import { TableCard } from "@/shared/TableCard"

/** The most listened episodes of the last 30 days, with a bar for their share. */
export function TopEpisodesCard({ episodes }: { episodes: TopEpisode[] | undefined }) {
  const max = Math.max(1, ...(episodes ?? []).map((e) => e.listeners))
  return (
    <TableCard title={DASHBOARD.top} description={DASHBOARD.topHint}>
      {!episodes ? (
        <div className="space-y-2 p-4">
          {[0, 1, 2, 3, 4].map((i) => (
            <Skeleton key={i} className="h-10 w-full" />
          ))}
        </div>
      ) : episodes.length === 0 ? (
        <EmptyState icon={Headphones} description={DASHBOARD.topEmpty} />
      ) : (
        <ol className="divide-y">
          {episodes.map(({ episode, listeners }, i) => (
            <li key={episode.id}>
              <Link
                href={`/episodes/${episode.id}`}
                className="flex items-center gap-3 px-4 py-2.5 outline-none hover:bg-muted/40 focus-visible:bg-muted/40"
              >
                <span className="w-4 text-right font-mono text-xs text-muted-foreground">{i + 1}</span>
                <CoverThumb
                  url={episode.coverUrl ?? episode.podcast.coverUrl}
                  alt=""
                  aspect="portrait"
                  className="w-8"
                />
                <div className="min-w-0 flex-1">
                  <div className="truncate text-sm font-medium">{episodeLabel(episode)}</div>
                  <div className="truncate text-xs text-muted-foreground">{episode.podcast.name}</div>
                  <div className="mt-1 h-1 rounded-full bg-muted">
                    <div
                      className="h-1 rounded-full bg-chart-1"
                      style={{ width: `${(listeners / max) * 100}%` }}
                    />
                  </div>
                </div>
                <span className="shrink-0 text-xs text-muted-foreground tabular-nums">
                  {DASHBOARD.listenersCount(listeners)}
                </span>
              </Link>
            </li>
          ))}
        </ol>
      )}
    </TableCard>
  )
}
