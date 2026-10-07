"use client"

import { Plus } from "lucide-react"
import Link from "next/link"
import { useEffect } from "react"
import { Button } from "@/components/ui/button"
import { Tabs, TabsList, TabsTrigger } from "@/components/ui/tabs"
import { CampaignsController } from "@/controllers/CampaignsController"
import { PodcastsController } from "@/controllers/PodcastsController"
import { CAMPAIGNS } from "@/copy/campaigns"
import { COMMON } from "@/copy/common"
import {
  CAMPAIGN_STATUSES,
  type CampaignStatusFilter,
  campaignsKey,
  campaignsParams,
  PAGE_SIZE,
  parseCampaigns,
} from "@/domain/lists"
import { ErrorState } from "@/shared/ErrorState"
import { NotificationsStatusBanner } from "@/shared/NotificationsStatusBanner"
import { PageHeader } from "@/shared/PageHeader"
import { Pager } from "@/shared/Pager"
import { RefreshButton } from "@/shared/RefreshButton"
import { TableCard } from "@/shared/TableCard"
import { useUrlQuery } from "@/shared/useUrlQuery"
import { useCampaignsStore } from "@/stores/useCampaignsStore"
import { CampaignsTable } from "./CampaignsTable"

/** Every push campaign, newest first, by status; the filter lives in the URL. */
export function CampaignsScreen() {
  const [query, setQuery] = useUrlQuery(parseCampaigns, campaignsParams)
  const key = campaignsKey(query)
  const entry = useCampaignsStore((s) => s.pages[key])
  const shown = useCampaignsStore((s) => (s.shownKey ? s.pages[s.shownKey]?.data : undefined))
  const data = entry?.data ?? shown

  useEffect(() => {
    void CampaignsController.load(query)
  }, [key]) // eslint-disable-line react-hooks/exhaustive-deps -- the key is the query

  useEffect(() => {
    // The audience column names the followed podcasts.
    void PodcastsController.loadOptions()
  }, [])

  const filtered = query.status !== "all"
  const newButton = (
    <Button asChild>
      <Link href="/notifications/new">
        <Plus />
        {CAMPAIGNS.new}
      </Link>
    </Button>
  )

  return (
    <>
      <PageHeader
        title={CAMPAIGNS.title}
        description={CAMPAIGNS.subtitle}
        actions={
          <>
            <RefreshButton
              loading={entry?.loading}
              onRefresh={() => void CampaignsController.load(query, true)}
            />
            {newButton}
          </>
        }
      />
      <NotificationsStatusBanner />
      <TableCard
        toolbar={
          <Tabs
            value={query.status}
            onValueChange={(status) => setQuery({ status: status as CampaignStatusFilter, page: 1 })}
          >
            <div className="-mx-1 overflow-x-auto px-1">
              <TabsList>
                {CAMPAIGN_STATUSES.map((s) => (
                  <TabsTrigger key={s} value={s} className="px-2.5">
                    {CAMPAIGNS.statuses[s]}
                  </TabsTrigger>
                ))}
              </TabsList>
            </div>
          </Tabs>
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
            <ErrorState message={entry.error} onRetry={() => void CampaignsController.load(query, true)} />
          </div>
        ) : (
          <CampaignsTable
            campaigns={data?.items}
            stale={!entry?.data}
            filtered={filtered}
            emptyAction={
              filtered ? (
                <Button variant="outline" size="sm" onClick={() => setQuery({ status: "all", page: 1 })}>
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
