"use client"

import { ListPlus, ListOrdered } from "lucide-react"
import { useState } from "react"
import { Button } from "@/components/ui/button"
import { Spinner } from "@/components/ui/spinner"
import { ListsController } from "@/controllers/ListsController"
import { COMMON } from "@/copy/common"
import { LISTS } from "@/copy/lists"
import { sameOrder } from "@/domain/order"
import { type AdminEpisodeRef, type AdminListDetail } from "@/schemas/admin"
import { EmptyState } from "@/shared/EmptyState"
import { EpisodeCell } from "@/shared/EpisodeCell"
import { EpisodePickerDialog } from "@/shared/EpisodePickerDialog"
import { SortableList } from "@/shared/SortableList"
import { StatusBadge } from "@/shared/StatusBadge"
import { TableCard } from "@/shared/TableCard"
import { useSaveShortcut } from "@/shared/useSaveShortcut"
import { useUnsavedGuard } from "@/shared/useUnsavedGuard"

/** The list's episodes in order: drag to reorder, add with the picker, remove; saved with one PUT. */
export function ListEpisodesCard({ list }: { list: AdminListDetail }) {
  const [episodes, setEpisodes] = useState<AdminEpisodeRef[]>(list.episodes)
  const [picking, setPicking] = useState(false)
  const [saving, setSaving] = useState(false)
  const ids = episodes.map((e) => e.id)
  const dirty = !sameOrder(
    ids,
    list.episodes.map((e) => e.id),
  )

  useUnsavedGuard(dirty)

  const save = async () => {
    if (!dirty || saving) return
    setSaving(true)
    await ListsController.setEpisodes(list.id, ids)
    setSaving(false)
  }
  useSaveShortcut(() => void save(), dirty)

  return (
    <TableCard
      title={LISTS.episodes}
      description={dirty ? <span className="text-warning">{LISTS.unsavedOrder}</span> : LISTS.episodesHint}
      actions={
        <Button variant="outline" size="sm" onClick={() => setPicking(true)}>
          <ListPlus />
          {LISTS.addEpisodes}
        </Button>
      }
      footer={
        dirty ? (
          <div className="flex justify-end gap-2 p-3">
            <Button variant="ghost" disabled={saving} onClick={() => setEpisodes(list.episodes)}>
              {COMMON.discard}
            </Button>
            <Button disabled={saving} onClick={() => void save()}>
              {saving ? <Spinner /> : null}
              {LISTS.saveOrder}
            </Button>
          </div>
        ) : undefined
      }
    >
      {episodes.length === 0 ? (
        <EmptyState icon={ListOrdered} description={LISTS.noEpisodes} />
      ) : (
        <SortableList
          items={episodes}
          getId={(e) => e.id}
          onReorder={setEpisodes}
          onRemove={(e) => setEpisodes((list) => list.filter((x) => x.id !== e.id))}
          disabled={saving}
          renderItem={(e) => (
            <div className="flex items-center gap-3">
              <div className="min-w-0 flex-1">
                <EpisodeCell episode={e} />
              </div>
              <StatusBadge status={e.status} />
            </div>
          )}
        />
      )}
      <EpisodePickerDialog
        open={picking}
        onOpenChange={setPicking}
        selectedIds={ids}
        onAdd={(e) =>
          setEpisodes((list) => [
            ...list,
            {
              id: e.id,
              title: e.title,
              number: e.number,
              podcast: e.podcast,
              coverUrl: e.coverUrl,
              status: e.status,
              publishedAt: e.publishedAt,
            },
          ])
        }
        onRemove={(id) => setEpisodes((list) => list.filter((x) => x.id !== id))}
      />
    </TableCard>
  )
}
