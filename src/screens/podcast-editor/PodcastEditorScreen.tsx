"use client"

import { ArrowLeft } from "lucide-react"
import Link from "next/link"
import { useRouter } from "next/navigation"
import { useEffect } from "react"
import { Button } from "@/components/ui/button"
import { Skeleton } from "@/components/ui/skeleton"
import { PodcastsController } from "@/controllers/PodcastsController"
import { NAV_COPY } from "@/copy/nav"
import { PODCASTS } from "@/copy/podcasts"
import { ErrorState } from "@/shared/ErrorState"
import { PageHeader } from "@/shared/PageHeader"
import { StatusBadge } from "@/shared/StatusBadge"
import { usePodcastsStore } from "@/stores/usePodcastsStore"
import { PodcastFacts } from "./PodcastFacts"
import { PodcastForm } from "./PodcastForm"

/** A new podcast (`id` null) or an existing one: the form, and its facts beside it. */
export function PodcastEditorScreen({ id }: { id: string | null }) {
  const router = useRouter()
  const entry = usePodcastsStore((s) => (id ? s.details[id] : undefined))
  const podcast = entry?.data

  useEffect(() => {
    if (id) void PodcastsController.loadPodcast(id, true)
  }, [id])

  const back = (
    <Button variant="ghost" size="sm" asChild>
      <Link href="/podcasts">
        <ArrowLeft />
        {NAV_COPY.podcasts}
      </Link>
    </Button>
  )

  if (!id)
    return (
      <>
        <PageHeader title={PODCASTS.editor.newTitle} description={PODCASTS.editor.newSubtitle} actions={back} />
        <div className="max-w-3xl">
          <PodcastForm podcast={null} onSaved={(p) => router.replace(`/podcasts/${p.id}`)} />
        </div>
      </>
    )

  if (entry?.error && !podcast)
    return (
      <>
        <PageHeader title={PODCASTS.title} actions={back} />
        <ErrorState message={entry.error} onRetry={() => void PodcastsController.loadPodcast(id, true)} />
      </>
    )

  if (!podcast)
    return (
      <div className="space-y-6">
        <Skeleton className="h-9 w-64" />
        <div className="grid gap-6 lg:grid-cols-[minmax(0,1fr)_20rem]">
          <Skeleton className="h-[32rem] w-full rounded-xl" />
          <Skeleton className="h-72 w-full rounded-xl" />
        </div>
      </div>
    )

  return (
    <>
      <PageHeader
        title={
          <span className="flex items-center gap-3">
            <span className="truncate">{podcast.name}</span>
            <StatusBadge status={podcast.status} />
          </span>
        }
        description={PODCASTS.editor.editSubtitle}
        actions={back}
      />
      <div className="grid items-start gap-6 lg:grid-cols-[minmax(0,1fr)_20rem]">
        <PodcastForm key={podcast.updatedAt} podcast={podcast} onSaved={() => undefined} />
        <PodcastFacts podcast={podcast} />
      </div>
    </>
  )
}
