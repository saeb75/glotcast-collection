"use client"

import { Plus } from "lucide-react"
import Link from "next/link"
import { useEffect, useState } from "react"
import { Button } from "@/components/ui/button"
import { EpisodesController } from "@/controllers/EpisodesController"
import { COMMON } from "@/copy/common"
import { EPISODES } from "@/copy/episodes"
import { type EpisodesQuery, episodesKey, episodesParams, PAGE_SIZE, parseEpisodes } from "@/domain/lists"
import { ErrorState } from "@/shared/ErrorState"
import { PageHeader } from "@/shared/PageHeader"
import { Pager } from "@/shared/Pager"
import { RefreshButton } from "@/shared/RefreshButton"
import { TableCard } from "@/shared/TableCard"
import { useUrlQuery } from "@/shared/useUrlQuery"
import { useEpisodesStore } from "@/stores/useEpisodesStore"
import { EpisodesTable } from "./EpisodesTable"
import { EpisodesToolbar } from "./EpisodesToolbar"

/** Every episode, filtered by podcast and status, searchable; the filters live in the URL. */
export function EpisodesScreen() {
  const [query, setQuery] = useUrlQuery(parseEpisodes, episodesParams)
  const key = episodesKey(query)
  const entry = useEpisodesStore((s) => s.pages[key])
  const shown = useEpisodesStore((s) => (s.shownKey ? s.pages[s.shownKey]?.data : undefined))
  const data = entry?.data ?? shown
  const [searchReset, setSearchReset] = useState(0)

  useEffect(() => {
    void EpisodesController.load(query)
  }, [key]) // eslint-disable-line react-hooks/exhaustive-deps -- the key is the query

  const filtered = query.q !== "" || query.podcast !== "all" || query.status !== "all"
  const setFilters = (patch: Partial<EpisodesQuery>) => setQuery({ ...query, ...patch, page: 1 })
  const newHref = query.podcast !== "all" ? `/episodes/new?podcast=${query.podcast}` : "/episodes/new"
  const newButton = (
    <Button asChild>
      <Link href={newHref}>
        <Plus />
        {EPISODES.new}
      </Link>
    </Button>
  )

  return (
    <>
      <PageHeader
        title={EPISODES.title}
        description={EPISODES.subtitle}
        actions={
          <>
            <RefreshButton
              loading={entry?.loading}
              onRefresh={() => void EpisodesController.load(query, true)}
            />
            {newButton}
          </>
        }
      />
      <TableCard
        toolbar={<EpisodesToolbar query={query} searchReset={searchReset} onChange={setFilters} />}
        footer={
          data && data.total > 0 ? (
            <Pager
              page={query.page}
              pageSize={PAGE_SIZE}
              total={data.total}
              onPage={(page) => setQuery({ ...query, page })}
            />
          ) : undefined
        }
      >
        {entry?.error && !entry.data ? (
          <div className="p-4">
            <ErrorState message={entry.error} onRetry={() => void EpisodesController.load(query, true)} />
          </div>
        ) : (
          <EpisodesTable
            episodes={data?.items}
            stale={!entry?.data}
            filtered={filtered}
            emptyAction={
              filtered ? (
                <Button
                  variant="outline"
                  size="sm"
                  onClick={() => {
                    setSearchReset((n) => n + 1)
                    setQuery({ q: "", podcast: "all", status: "all", page: 1 })
                  }}
                >
                  {COMMON.clearFilters}
                </Button>
              ) : (
                newButton
              )
            }
          />
        )}
      </TableCard>
    </>
  )
}
