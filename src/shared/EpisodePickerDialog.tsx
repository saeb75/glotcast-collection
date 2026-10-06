"use client"

import { Check, Plus, SearchX } from "lucide-react"
import { useEffect, useState } from "react"
import { Button } from "@/components/ui/button"
import { Dialog, DialogContent, DialogDescription, DialogFooter, DialogHeader, DialogTitle } from "@/components/ui/dialog"
import { Skeleton } from "@/components/ui/skeleton"
import { Spinner } from "@/components/ui/spinner"
import { PICKER_PAGE, PickerController, pickerKey } from "@/controllers/PickerController"
import { PICKER } from "@/copy/picker"
import { cn } from "@/lib/utils"
import { type AdminEpisode } from "@/schemas/admin"
import { usePickerStore } from "@/stores/usePickerStore"
import { EmptyState } from "./EmptyState"
import { EpisodeCell } from "./EpisodeCell"
import { ErrorState } from "./ErrorState"
import { PodcastSelect } from "./PodcastSelect"
import { SearchField } from "./SearchField"
import { StatusBadge } from "./StatusBadge"

/** Find episodes by title (drafts too) and add or remove them; the caller owns the selection. */
export function EpisodePickerDialog({
  open,
  onOpenChange,
  selectedIds,
  onAdd,
  onRemove,
  title = PICKER.title,
}: {
  open: boolean
  onOpenChange: (open: boolean) => void
  selectedIds: string[]
  onAdd: (episode: AdminEpisode) => void
  onRemove: (id: string) => void
  title?: string
}) {
  const [q, setQ] = useState("")
  const [podcast, setPodcast] = useState("all")
  const [pageSize, setPageSize] = useState(PICKER_PAGE)
  const key = pickerKey(q, podcast, pageSize)
  const entry = usePickerStore((s) => s.results[key])
  const shown = usePickerStore((s) => (s.shownKey ? s.results[s.shownKey]?.data : undefined))
  const data = entry?.data ?? shown

  useEffect(() => {
    if (open) void PickerController.search(q, podcast, pageSize)
  }, [open, q, podcast, pageSize])

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="flex max-h-[85svh] flex-col gap-0 p-0 sm:max-w-2xl">
        <DialogHeader className="p-4 pb-3">
          <DialogTitle>{title}</DialogTitle>
          <DialogDescription>{PICKER.hint}</DialogDescription>
        </DialogHeader>
        <div className="flex flex-col gap-2 px-4 pb-3 sm:flex-row">
          <SearchField
            initial=""
            autoFocus
            placeholder={PICKER.placeholder}
            className="sm:max-w-none"
            onSearch={(value) => {
              setQ(value)
              setPageSize(PICKER_PAGE)
            }}
          />
          <PodcastSelect
            value={podcast}
            onChange={(value) => {
              setPodcast(value)
              setPageSize(PICKER_PAGE)
            }}
            label={PICKER.podcast}
            allLabel={PICKER.allPodcasts}
            className="sm:w-52"
          />
        </div>
        <div className="min-h-48 flex-1 overflow-y-auto border-t">
          {entry?.error && !data ? (
            <div className="p-4">
              <ErrorState message={entry.error} onRetry={() => void PickerController.search(q, podcast, pageSize)} />
            </div>
          ) : !data ? (
            <div className="space-y-2 p-4">
              {[0, 1, 2, 3, 4].map((i) => (
                <Skeleton key={i} className="h-11 w-full" />
              ))}
            </div>
          ) : data.items.length === 0 ? (
            <EmptyState icon={SearchX} description={PICKER.empty} />
          ) : (
            <ul className={cn("divide-y transition-opacity", !entry?.data && "opacity-60")}>
              {data.items.map((episode) => {
                const added = selectedIds.includes(episode.id)
                return (
                  <li key={episode.id}>
                    <button
                      type="button"
                      aria-pressed={added}
                      onClick={() => (added ? onRemove(episode.id) : onAdd(episode))}
                      className="flex w-full items-center gap-3 px-4 py-2 text-left outline-none hover:bg-muted/50 focus-visible:bg-muted/50"
                    >
                      <div className="min-w-0 flex-1">
                        <EpisodeCell episode={episode} link={false} />
                      </div>
                      <StatusBadge status={episode.status} />
                      <span
                        className={cn(
                          "flex size-7 shrink-0 items-center justify-center rounded-md border",
                          added ? "border-transparent bg-foreground text-background" : "text-muted-foreground",
                        )}
                        aria-label={added ? PICKER.added : undefined}
                      >
                        {added ? <Check className="size-4" /> : <Plus className="size-4" />}
                      </span>
                    </button>
                  </li>
                )
              })}
            </ul>
          )}
          {data?.hasMore && pageSize < 50 ? (
            <div className="border-t p-2 text-center">
              <Button variant="ghost" size="sm" disabled={entry?.loading} onClick={() => setPageSize(50)}>
                {entry?.loading ? <Spinner /> : null}
                {PICKER.more}
              </Button>
            </div>
          ) : null}
        </div>
        <DialogFooter className="m-0 border-t p-3">
          <Button onClick={() => onOpenChange(false)}>{PICKER.done}</Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  )
}
