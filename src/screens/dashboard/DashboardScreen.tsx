"use client"

import { useEffect } from "react"
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card"
import { Skeleton } from "@/components/ui/skeleton"
import { DashboardController } from "@/controllers/DashboardController"
import { DASHBOARD } from "@/copy/dashboard"
import { LISTENERS } from "@/shared/chartConfigs"
import { DailyBarChart } from "@/shared/DailyBarChart"
import { ErrorState } from "@/shared/ErrorState"
import { PageHeader } from "@/shared/PageHeader"
import { RefreshButton } from "@/shared/RefreshButton"
import { useDashboardStore } from "@/stores/useDashboardStore"
import { ContentCard } from "./ContentCard"
import { DashboardStats } from "./DashboardStats"
import { TopEpisodesCard } from "./TopEpisodesCard"

/** The home page: people, daily listeners, what is published, the most listened episodes. */
export function DashboardScreen() {
  const entry = useDashboardStore((s) => s.entry)
  const data = entry?.data

  useEffect(() => {
    void DashboardController.load()
  }, [])

  return (
    <>
      <PageHeader
        title={DASHBOARD.title}
        description={DASHBOARD.subtitle}
        actions={<RefreshButton loading={entry?.loading} onRefresh={() => void DashboardController.load(true)} />}
      />
      {entry?.error && !data ? (
        <ErrorState message={entry.error} onRetry={() => void DashboardController.load(true)} />
      ) : (
        <>
          <DashboardStats dashboard={data} />
          <div className="grid items-start gap-4 lg:grid-cols-[2fr_1fr]">
            <Card>
              <CardHeader>
                <CardTitle>{DASHBOARD.dau}</CardTitle>
                <CardDescription>{DASHBOARD.dauHint}</CardDescription>
              </CardHeader>
              <CardContent>
                {data ? <DailyBarChart data={data.dau} config={LISTENERS} /> : <Skeleton className="h-52 w-full" />}
              </CardContent>
            </Card>
            <ContentCard episodes={data?.episodes} />
          </div>
          <TopEpisodesCard episodes={data?.topEpisodes} />
        </>
      )}
    </>
  )
}
