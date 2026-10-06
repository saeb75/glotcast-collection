"use client"

import { Tabs, TabsList, TabsTrigger } from "@/components/ui/tabs"
import { EPISODES } from "@/copy/episodes"
import { EPISODE_STATUSES, type EpisodesQuery, type EpisodeStatusFilter } from "@/domain/lists"
import { PodcastSelect } from "@/shared/PodcastSelect"
import { SearchField } from "@/shared/SearchField"

type Filters = Pick<EpisodesQuery, "q" | "podcast" | "status">

/** Search · podcast · status. */
export function EpisodesToolbar({
  query,
  searchReset,
  onChange,
}: {
  query: EpisodesQuery
  searchReset: number
  onChange: (patch: Partial<Filters>) => void
}) {
  return (
    <div className="flex flex-col gap-3 lg:flex-row lg:items-center lg:justify-between">
      <SearchField
        key={searchReset}
        initial={query.q}
        placeholder={EPISODES.searchPlaceholder}
        onSearch={(q) => onChange({ q })}
      />
      <div className="flex flex-wrap items-center gap-2">
        <PodcastSelect
          value={query.podcast}
          onChange={(podcast) => onChange({ podcast })}
          label={EPISODES.podcastLabel}
          allLabel={EPISODES.allPodcasts}
        />
        <Tabs value={query.status} onValueChange={(status) => onChange({ status: status as EpisodeStatusFilter })}>
          <TabsList>
            {EPISODE_STATUSES.map((s) => (
              <TabsTrigger key={s} value={s}>
                {EPISODES.statuses[s]}
              </TabsTrigger>
            ))}
          </TabsList>
        </Tabs>
      </div>
    </div>
  )
}
