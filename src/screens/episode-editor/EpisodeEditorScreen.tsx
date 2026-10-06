"use client"

import { ArrowLeft, Info } from "lucide-react"
import Link from "next/link"
import { usePathname, useRouter, useSearchParams } from "next/navigation"
import { useEffect } from "react"
import { Alert, AlertDescription } from "@/components/ui/alert"
import { Button } from "@/components/ui/button"
import { Skeleton } from "@/components/ui/skeleton"
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs"
import { Tooltip, TooltipContent, TooltipTrigger } from "@/components/ui/tooltip"
import { EpisodesController } from "@/controllers/EpisodesController"
import { PodcastsController } from "@/controllers/PodcastsController"
import { COMMON, ERRORS } from "@/copy/common"
import { EPISODES } from "@/copy/episodes"
import { LEVEL_LABELS, LEVEL_SHORT } from "@/copy/status"
import { episodeLabel, formatDateTime } from "@/domain/format"
import { draftKey, isDirty } from "@/domain/levelDraft"
import { LEVELS, levelOf } from "@/domain/levels"
import { pickEnum } from "@/domain/query"
import { cn } from "@/lib/utils"
import { ErrorState } from "@/shared/ErrorState"
import { PageHeader } from "@/shared/PageHeader"
import { StatusBadge } from "@/shared/StatusBadge"
import { useUnsavedGuard } from "@/shared/useUnsavedGuard"
import { useEpisodesStore } from "@/stores/useEpisodesStore"
import { useLevelEditorStore } from "@/stores/useLevelEditorStore"
import { usePodcastsStore } from "@/stores/usePodcastsStore"
import { CoverTab } from "./CoverTab"
import { EpisodeFacts } from "./EpisodeFacts"
import { EpisodeForm } from "./EpisodeForm"
import { LevelPanel } from "./LevelPanel"
import { PublishActions } from "./PublishActions"

const TABS = ["details", "bg", "in", "ad", "cover"] as const

/** One episode: details and publishing, a tab per level (audio → transcript → save), the cover generator. */
export function EpisodeEditorScreen({ id }: { id: string }) {
  const router = useRouter()
  const pathname = usePathname()
  const tab = pickEnum(useSearchParams().get("tab"), TABS, "details")
  const entry = useEpisodesStore((s) => s.details[id])
  const episode = entry?.data
  const drafts = useLevelEditorStore((s) => s.drafts)
  const podcast = usePodcastsStore((s) => s.options?.data?.find((p) => p.id === episode?.podcast.id))
  const dirtyLevels = LEVELS.filter((level) => {
    const d = drafts[draftKey(id, level)]
    return d ? isDirty(d) : false
  })
  const e = EPISODES.editor

  useUnsavedGuard(dirtyLevels.length > 0)

  useEffect(() => {
    void EpisodesController.loadEpisode(id)
    void PodcastsController.loadOptions()
  }, [id])

  const setTab = (next: string) => router.replace(`${pathname}?tab=${next}`, { scroll: false })

  const back = (
    <Button variant="ghost" size="sm" asChild>
      <Link href="/episodes">
        <ArrowLeft />
        {e.back}
      </Link>
    </Button>
  )

  if (entry?.error && !episode)
    return (
      <>
        <PageHeader title={EPISODES.title} actions={back} />
        <ErrorState
          message={entry.error === ERRORS.not_found ? e.notFound : entry.error}
          onRetry={() => void EpisodesController.loadEpisode(id, true)}
        />
      </>
    )

  if (!episode)
    return (
      <div className="space-y-6">
        <div className="space-y-2">
          <Skeleton className="h-9 w-80" />
          <Skeleton className="h-4 w-56" />
        </div>
        <Skeleton className="h-9 w-96" />
        <Skeleton className="h-[30rem] w-full rounded-xl" />
      </div>
    )

  const statusLine =
    episode.status === "draft"
      ? e.statusLine.draft
      : episode.status === "scheduled"
        ? e.statusLine.scheduled(formatDateTime(episode.publishedAt))
        : e.statusLine.published(formatDateTime(episode.publishedAt))

  return (
    <>
      <PageHeader
        title={
          <span className="flex min-w-0 items-center gap-3">
            <span className="truncate">{episodeLabel(episode)}</span>
            <StatusBadge status={episode.status} />
          </span>
        }
        description={
          <span>
            <Link href={`/podcasts/${episode.podcast.id}`} className="font-medium text-foreground hover:underline">
              {episode.podcast.name}
            </Link>{" "}
            · {statusLine}
          </span>
        }
        actions={<PublishActions episode={episode} />}
      />
      {podcast?.status === "draft" ? (
        <Alert>
          <Info />
          <AlertDescription>{e.podcastDraft}</AlertDescription>
        </Alert>
      ) : null}
      <Tabs value={tab} onValueChange={setTab} className="gap-4">
        <TabsList className="w-full justify-start overflow-x-auto sm:w-auto">
          <TabsTrigger value="details">{e.tabs.details}</TabsTrigger>
          {LEVELS.map((level) => {
            const saved = Boolean(levelOf(episode.levels, level))
            const dirty = dirtyLevels.includes(level)
            return (
              <Tooltip key={level}>
                <TooltipTrigger asChild>
                  <TabsTrigger value={level} className="gap-1.5">
                    <span
                      aria-hidden
                      className={cn(
                        "size-1.5 rounded-full",
                        dirty ? "bg-warning" : saved ? "bg-positive" : "border border-muted-foreground/50",
                      )}
                    />
                    {LEVEL_SHORT[level]}
                  </TabsTrigger>
                </TooltipTrigger>
                <TooltipContent>
                  {LEVEL_LABELS[level]}
                  {dirty ? ` · ${COMMON.unsaved}` : saved ? ` · ${e.hasLevel}` : ""}
                </TooltipContent>
              </Tooltip>
            )
          })}
          <TabsTrigger value="cover">{e.tabs.cover}</TabsTrigger>
        </TabsList>
        <TabsContent value="details">
          <div className="grid items-start gap-6 lg:grid-cols-[minmax(0,1fr)_20rem]">
            <EpisodeForm key={episode.updatedAt} episode={episode} onSaved={() => undefined} onGenerate={() => setTab("cover")} />
            <EpisodeFacts episode={episode} />
          </div>
        </TabsContent>
        {LEVELS.map((level) => (
          <TabsContent key={level} value={level}>
            <LevelPanel episodeId={episode.id} level={level} />
          </TabsContent>
        ))}
        <TabsContent value="cover">
          <CoverTab episode={episode} />
        </TabsContent>
      </Tabs>
    </>
  )
}
