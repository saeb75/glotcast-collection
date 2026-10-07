"use client"

import { ListChecks, SearchX } from "lucide-react"
import { useEffect, useState } from "react"
import { Button } from "@/components/ui/button"
import { Skeleton } from "@/components/ui/skeleton"
import { Table, TableBody, TableHead, TableHeader, TableRow } from "@/components/ui/table"
import { CampaignsController } from "@/controllers/CampaignsController"
import { SendLogController } from "@/controllers/SendLogController"
import { COMMON } from "@/copy/common"
import { SEND_LOG } from "@/copy/sendLog"
import { parseSendLog, type SendLogQuery, sendLogKey, sendLogParams } from "@/domain/lists"
import { EmptyState } from "@/shared/EmptyState"
import { ErrorState } from "@/shared/ErrorState"
import { LoadMoreFooter } from "@/shared/LoadMoreFooter"
import { NotificationsStatusBanner } from "@/shared/NotificationsStatusBanner"
import { PageHeader } from "@/shared/PageHeader"
import { RefreshButton } from "@/shared/RefreshButton"
import { TableCard } from "@/shared/TableCard"
import { useUrlQuery } from "@/shared/useUrlQuery"
import { useCampaignsStore } from "@/stores/useCampaignsStore"
import { useSendLogStore } from "@/stores/useSendLogStore"
import { SendLogRow } from "./SendLogRow"
import { SendLogToolbar } from "./SendLogToolbar"

const CLEAR: SendLogQuery = { kind: "all", status: "all", campaign: "all", user: "" }

/** Every planned push, newest first: filter by kind, status, campaign or user; older ones by cursor. */
export function SendLogScreen() {
  const [query, setQuery] = useUrlQuery(parseSendLog, sendLogParams)
  const key = sendLogKey(query)
  const entry = useSendLogStore((s) => s.logs[key])
  const loadingMore = useSendLogStore((s) => s.loadingMore[key] ?? false)
  const campaigns = useCampaignsStore((s) => s.options?.data)
  const [userReset, setUserReset] = useState(0)
  const log = entry?.data
  const c = SEND_LOG.columns
  const filtered = sendLogKey(query) !== sendLogKey(CLEAR)

  useEffect(() => {
    void SendLogController.load(query)
  }, [key]) // eslint-disable-line react-hooks/exhaustive-deps -- the key is the query

  useEffect(() => {
    void CampaignsController.loadOptions()
  }, [])

  const campaignName = (id: string | null) => (id ? campaigns?.find((x) => x.id === id)?.name : undefined)
  const clear = () => {
    setUserReset((n) => n + 1)
    setQuery(CLEAR)
  }

  return (
    <>
      <PageHeader
        title={SEND_LOG.title}
        description={SEND_LOG.subtitle}
        actions={
          <RefreshButton
            loading={entry?.loading}
            onRefresh={() => void SendLogController.load(query, true)}
          />
        }
      />
      <NotificationsStatusBanner />
      <TableCard
        toolbar={
          <SendLogToolbar
            query={query}
            campaigns={campaigns}
            userReset={userReset}
            onChange={(patch) => setQuery({ ...query, ...patch })}
            onClear={filtered ? clear : undefined}
          />
        }
        footer={
          log?.nextBefore !== undefined ? (
            <LoadMoreFooter loading={loadingMore} onLoadMore={() => void SendLogController.loadMore(query)} />
          ) : undefined
        }
      >
        {entry?.error && !log ? (
          <div className="p-4">
            <ErrorState message={entry.error} onRetry={() => void SendLogController.load(query, true)} />
          </div>
        ) : !log ? (
          <div className="space-y-2 p-4">
            {[0, 1, 2, 3, 4, 5].map((i) => (
              <Skeleton key={i} className="h-12 w-full" />
            ))}
          </div>
        ) : log.items.length === 0 ? (
          <EmptyState
            icon={filtered ? SearchX : ListChecks}
            title={SEND_LOG.emptyTitle}
            description={filtered ? SEND_LOG.emptyFiltered : SEND_LOG.emptyAll}
            action={
              filtered ? (
                <Button variant="outline" size="sm" onClick={clear}>
                  {COMMON.clearFilters}
                </Button>
              ) : undefined
            }
          />
        ) : (
          <Table>
            <TableHeader>
              <TableRow className="hover:bg-transparent">
                <TableHead className="pl-4">{c.when}</TableHead>
                <TableHead>{c.user}</TableHead>
                <TableHead>{c.kind}</TableHead>
                <TableHead>{c.status}</TableHead>
                <TableHead className="hidden md:table-cell">{c.language}</TableHead>
                <TableHead className="hidden lg:table-cell">{c.message}</TableHead>
                <TableHead className="pr-4">{c.opened}</TableHead>
              </TableRow>
            </TableHeader>
            <TableBody>
              {log.items.map((row) => (
                <SendLogRow
                  key={row.id}
                  row={row}
                  campaignName={campaignName(row.campaignId)}
                  onFilterUser={(user) => {
                    setUserReset((n) => n + 1)
                    setQuery({ ...query, user })
                  }}
                  onFilterCampaign={(campaign) => setQuery({ ...query, campaign })}
                />
              ))}
            </TableBody>
          </Table>
        )}
      </TableCard>
    </>
  )
}
