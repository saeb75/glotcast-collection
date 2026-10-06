"use client"

import { ImageOff, ListPlus } from "lucide-react"
import { useState } from "react"
import { Button } from "@/components/ui/button"
import { HomeConfigController } from "@/controllers/HomeConfigController"
import { HOME } from "@/copy/home"
import { episodeLabel } from "@/domain/format"
import { type AdminEpisode } from "@/schemas/admin"
import { CoverThumb } from "@/shared/CoverThumb"
import { EpisodePickerDialog } from "@/shared/EpisodePickerDialog"
import { SortableList } from "@/shared/SortableList"
import { StatusBadge } from "@/shared/StatusBadge"
import { TableCard } from "@/shared/TableCard"

const MAX = 30

/** The home slider: episodes in order, shown with their banner. */
export function OrderedEpisodes({ ids, episodes }: { ids: string[]; episodes: Record<string, AdminEpisode> }) {
  const [picking, setPicking] = useState(false)

  return (
    <TableCard
      title={HOME.slider}
      description={`${HOME.sliderHint} ${HOME.max(MAX)}`}
      actions={
        <Button variant="outline" size="sm" disabled={ids.length >= MAX} onClick={() => setPicking(true)}>
          <ListPlus />
          {HOME.addEpisode}
        </Button>
      }
    >
      {ids.length === 0 ? (
        <p className="p-6 text-center text-sm text-muted-foreground">{HOME.empty}</p>
      ) : (
        <SortableList
          items={ids}
          getId={(id) => id}
          onReorder={(next) => HomeConfigController.setOrder("sliderEpisodeIds", next)}
          onRemove={(id) => HomeConfigController.remove("sliderEpisodeIds", id)}
          renderItem={(id) => {
            const e = episodes[id]
            if (!e)
              return (
                <div className="text-sm text-muted-foreground">
                  {HOME.unknownEpisode} <span className="font-mono text-xs">{id.slice(0, 8)}</span>
                </div>
              )
            return (
              <div className="flex items-center gap-3">
                <CoverThumb url={e.bannerUrl} alt="" aspect="landscape" className="w-16" />
                <div className="min-w-0 flex-1">
                  <div className="truncate text-sm font-medium">{episodeLabel(e)}</div>
                  <div className="truncate text-xs text-muted-foreground">
                    {e.podcast.name}
                    {e.bannerUrl ? null : (
                      <span className="ml-2 inline-flex items-center gap-1 text-warning">
                        <ImageOff className="size-3" />
                        {HOME.noBanner}
                      </span>
                    )}
                  </div>
                </div>
                <StatusBadge status={e.status} />
              </div>
            )
          }}
        />
      )}
      <EpisodePickerDialog
        open={picking}
        onOpenChange={setPicking}
        selectedIds={ids}
        onAdd={(e) => ids.length < MAX && HomeConfigController.addEpisode(e)}
        onRemove={(id) => HomeConfigController.remove("sliderEpisodeIds", id)}
      />
    </TableCard>
  )
}
