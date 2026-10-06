"use client"

import { ArrowLeft, Podcast } from "lucide-react"
import Link from "next/link"
import { useRouter, useSearchParams } from "next/navigation"
import { useEffect } from "react"
import { Button } from "@/components/ui/button"
import { Skeleton } from "@/components/ui/skeleton"
import { PodcastsController } from "@/controllers/PodcastsController"
import { EPISODES } from "@/copy/episodes"
import { NAV_COPY } from "@/copy/nav"
import { EpisodeForm } from "@/screens/episode-editor/EpisodeForm"
import { EmptyState } from "@/shared/EmptyState"
import { ErrorState } from "@/shared/ErrorState"
import { PageHeader } from "@/shared/PageHeader"
import { usePodcastsStore } from "@/stores/usePodcastsStore"

/** A new episode's details; then the editor opens on its first level. */
export function NewEpisodeScreen() {
  const router = useRouter()
  const podcastId = useSearchParams().get("podcast") ?? ""
  const options = usePodcastsStore((s) => s.options)

  useEffect(() => {
    void PodcastsController.loadOptions()
  }, [])

  return (
    <>
      <PageHeader
        title={EPISODES.create.title}
        description={EPISODES.create.subtitle}
        actions={
          <Button variant="ghost" size="sm" asChild>
            <Link href="/episodes">
              <ArrowLeft />
              {NAV_COPY.episodes}
            </Link>
          </Button>
        }
      />
      <div className="max-w-3xl">
        {options?.error && !options.data ? (
          <ErrorState message={options.error} onRetry={() => void PodcastsController.loadOptions(true)} />
        ) : !options?.data ? (
          <Skeleton className="h-[36rem] w-full rounded-xl" />
        ) : options.data.length === 0 ? (
          <EmptyState
            icon={Podcast}
            description={EPISODES.create.noPodcasts}
            action={
              <Button asChild>
                <Link href="/podcasts/new">{NAV_COPY.newPodcast}</Link>
              </Button>
            }
          />
        ) : (
          <EpisodeForm
            episode={null}
            defaultPodcastId={podcastId}
            onSaved={(episode) => router.replace(`/episodes/${episode.id}?tab=bg`)}
          />
        )}
      </div>
    </>
  )
}
