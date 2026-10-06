"use client"

import { Plus } from "lucide-react"
import Link from "next/link"
import { useEffect, useState } from "react"
import { Button } from "@/components/ui/button"
import { PodcastsController } from "@/controllers/PodcastsController"
import { COMMON } from "@/copy/common"
import { PODCASTS } from "@/copy/podcasts"
import { PAGE_SIZE, parsePodcasts, podcastsKey, podcastsParams } from "@/domain/lists"
import { ErrorState } from "@/shared/ErrorState"
import { PageHeader } from "@/shared/PageHeader"
import { Pager } from "@/shared/Pager"
import { RefreshButton } from "@/shared/RefreshButton"
import { SearchField } from "@/shared/SearchField"
import { TableCard } from "@/shared/TableCard"
import { useUrlQuery } from "@/shared/useUrlQuery"
import { usePodcastsStore } from "@/stores/usePodcastsStore"
import { PodcastsTable } from "./PodcastsTable"

/** Every podcast, drafts included; the search and the page live in the URL. */
export function PodcastsScreen() {
  const [query, setQuery] = useUrlQuery(parsePodcasts, podcastsParams)
  const key = podcastsKey(query)
  const entry = usePodcastsStore((s) => s.pages[key])
  const shown = usePodcastsStore((s) => (s.shownKey ? s.pages[s.shownKey]?.data : undefined))
  const data = entry?.data ?? shown
  const [searchReset, setSearchReset] = useState(0)

  useEffect(() => {
    void PodcastsController.load(query)
  }, [key]) // eslint-disable-line react-hooks/exhaustive-deps -- the key is the query

  const newButton = (
    <Button asChild>
      <Link href="/podcasts/new">
        <Plus />
        {PODCASTS.new}
      </Link>
    </Button>
  )

  return (
    <>
      <PageHeader
        title={PODCASTS.title}
        description={PODCASTS.subtitle}
        actions={
          <>
            <RefreshButton
              loading={entry?.loading}
              onRefresh={() => void PodcastsController.load(query, true)}
            />
            {newButton}
          </>
        }
      />
      <TableCard
        toolbar={
          <SearchField
            key={searchReset}
            initial={query.q}
            placeholder={PODCASTS.searchPlaceholder}
            onSearch={(q) => setQuery({ q, page: 1 })}
          />
        }
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
            <ErrorState message={entry.error} onRetry={() => void PodcastsController.load(query, true)} />
          </div>
        ) : (
          <PodcastsTable
            podcasts={data?.items}
            stale={!entry?.data}
            filtered={query.q !== ""}
            emptyAction={
              query.q !== "" ? (
                <Button
                  variant="outline"
                  size="sm"
                  onClick={() => {
                    setSearchReset((n) => n + 1)
                    setQuery({ q: "", page: 1 })
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
