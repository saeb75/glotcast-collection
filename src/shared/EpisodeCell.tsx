import Link from "next/link"
import { episodeLabel } from "@/domain/format"
import { CoverThumb } from "./CoverThumb"

/** An episode in a row: its cover, "#12 · Title" (linked to the editor), its podcast. */
export function EpisodeCell({
  episode,
  link = true,
}: {
  episode: { id: string; number: number | null; title: string; coverUrl: string | null; podcast: { name: string } }
  link?: boolean
}) {
  const label = episodeLabel(episode)
  return (
    <div className="flex min-w-0 items-center gap-3">
      <CoverThumb url={episode.coverUrl} alt="" aspect="portrait" className="w-8" />
      <div className="min-w-0">
        {link ? (
          <Link
            href={`/episodes/${episode.id}`}
            onClick={(e) => e.stopPropagation()}
            className="block truncate font-medium outline-none hover:underline focus-visible:underline"
          >
            {label}
          </Link>
        ) : (
          <div className="truncate font-medium">{label}</div>
        )}
        <div className="truncate text-xs text-muted-foreground">{episode.podcast.name}</div>
      </div>
    </div>
  )
}
