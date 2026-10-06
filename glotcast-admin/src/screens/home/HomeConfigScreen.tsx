"use client"

import { useEffect } from "react"
import { Button } from "@/components/ui/button"
import { Skeleton } from "@/components/ui/skeleton"
import { Spinner } from "@/components/ui/spinner"
import { HomeConfigController, isHomeDirty } from "@/controllers/HomeConfigController"
import { HOME } from "@/copy/home"
import { ErrorState } from "@/shared/ErrorState"
import { PageHeader } from "@/shared/PageHeader"
import { RefreshButton } from "@/shared/RefreshButton"
import { useSaveShortcut } from "@/shared/useSaveShortcut"
import { useUnsavedGuard } from "@/shared/useUnsavedGuard"
import { useHomeConfigStore } from "@/stores/useHomeConfigStore"
import { useListsStore } from "@/stores/useListsStore"
import { OrderedEpisodes } from "./OrderedEpisodes"
import { OrderedLists } from "./OrderedLists"

/** The app's first screens: the slider, the home lists, the discover lists — reordered, then saved at once. */
export function HomeConfigScreen() {
  const entry = useHomeConfigStore((s) => s.entry)
  const draft = useHomeConfigStore((s) => s.draft)
  const episodes = useHomeConfigStore((s) => s.episodes)
  const saving = useHomeConfigStore((s) => s.saving)
  const lists = useListsStore((s) => s.entry?.data)
  const dirty = isHomeDirty(draft, entry?.data)

  useUnsavedGuard(dirty)
  useSaveShortcut(() => void HomeConfigController.save(), dirty && !saving)

  useEffect(() => {
    void HomeConfigController.load()
  }, [])

  const actions = (
    <>
      {dirty ? (
        <Button variant="ghost" disabled={saving} onClick={() => HomeConfigController.discard()}>
          {HOME.discard}
        </Button>
      ) : (
        <RefreshButton loading={entry?.loading} onRefresh={() => void HomeConfigController.load(true)} />
      )}
      <Button disabled={!dirty || saving} onClick={() => void HomeConfigController.save()}>
        {saving ? <Spinner /> : null}
        {HOME.save}
      </Button>
    </>
  )

  return (
    <>
      <PageHeader title={HOME.title} description={HOME.subtitle} actions={actions} />
      {dirty ? (
        <div className="sticky top-16 z-10 rounded-lg border border-warning/40 bg-background/95 px-4 py-2 text-sm text-warning backdrop-blur">
          {HOME.unsaved}
        </div>
      ) : null}
      {entry?.error && !draft ? (
        <ErrorState message={entry.error} onRetry={() => void HomeConfigController.load(true)} />
      ) : !draft ? (
        <div className="grid gap-4 lg:grid-cols-2">
          <Skeleton className="h-80 w-full rounded-xl lg:col-span-2" />
          <Skeleton className="h-64 w-full rounded-xl" />
          <Skeleton className="h-64 w-full rounded-xl" />
        </div>
      ) : (
        <div className="grid items-start gap-4 lg:grid-cols-2">
          <div className="lg:col-span-2">
            <OrderedEpisodes ids={draft.sliderEpisodeIds} episodes={episodes} />
          </div>
          <OrderedLists
            section="homeListIds"
            title={HOME.homeLists}
            description={HOME.homeListsHint}
            ids={draft.homeListIds}
            lists={lists}
          />
          <OrderedLists
            section="exploreListIds"
            title={HOME.exploreLists}
            description={HOME.exploreListsHint}
            ids={draft.exploreListIds}
            lists={lists}
          />
        </div>
      )}
    </>
  )
}
