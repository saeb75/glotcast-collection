"use client"

import { ArrowLeft } from "lucide-react"
import Link from "next/link"
import { useEffect } from "react"
import { Badge } from "@/components/ui/badge"
import { Button } from "@/components/ui/button"
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card"
import { Skeleton } from "@/components/ui/skeleton"
import { UsersController } from "@/controllers/UsersController"
import { ERRORS } from "@/copy/common"
import { LEVEL_LABELS } from "@/copy/status"
import { USERS } from "@/copy/users"
import { formatWeekday } from "@/domain/format"
import { MINUTES } from "@/shared/chartConfigs"
import { DailyBarChart } from "@/shared/DailyBarChart"
import { ErrorState } from "@/shared/ErrorState"
import { PageHeader } from "@/shared/PageHeader"
import { RefreshButton } from "@/shared/RefreshButton"
import { UserAvatar } from "@/shared/UserAvatar"
import { useUsersStore } from "@/stores/useUsersStore"
import { FeatureAccessCard } from "./FeatureAccessCard"
import { ProfileCard } from "./ProfileCard"
import { UserStats } from "./UserStats"

/** One user: stats, the week's listening, the profile, backend Pro. */
export function UserDetailScreen({ id }: { id: string }) {
  const entry = useUsersStore((s) => s.details[id])
  const data = entry?.data
  const d = USERS.detail

  useEffect(() => {
    void UsersController.loadUser(id)
  }, [id])

  const back = (
    <Button variant="ghost" size="sm" asChild>
      <Link href="/users">
        <ArrowLeft />
        {d.back}
      </Link>
    </Button>
  )

  if (entry?.error && !data)
    return (
      <>
        <PageHeader title={USERS.title} actions={back} />
        <ErrorState
          message={entry.error === ERRORS.not_found ? d.notFound : entry.error}
          onRetry={() => void UsersController.loadUser(id, true)}
        />
      </>
    )

  if (!data)
    return (
      <div className="space-y-6">
        <Skeleton className="h-12 w-72" />
        <div className="grid grid-cols-2 gap-3 xl:grid-cols-4">
          {[0, 1, 2, 3].map((i) => (
            <Skeleton key={i} className="h-24 rounded-xl" />
          ))}
        </div>
        <Skeleton className="h-96 w-full rounded-xl" />
      </div>
    )

  const { user, stats } = data
  const week = stats.last7Days.map((day) => ({ date: day.date, minutes: Math.round(day.seconds / 60) }))

  return (
    <>
      <PageHeader
        title={
          <span className="flex items-center gap-3">
            <UserAvatar name={user.isAnonymous ? null : (user.name ?? user.email)} imageUrl={user.avatarUrl} size="lg" />
            <span className="min-w-0 truncate">{user.email ?? user.name ?? USERS.guest}</span>
          </span>
        }
        description={
          <span className="flex flex-wrap items-center gap-2">
            {user.isAnonymous ? <Badge variant="secondary">{USERS.guest}</Badge> : null}
            {user.featureAccess ? <Badge>{USERS.pro}</Badge> : null}
            <span>{LEVEL_LABELS[user.level]}</span>
            <span className="text-xs">· {d.auditNote}</span>
          </span>
        }
        actions={
          <>
            {back}
            <RefreshButton loading={entry?.loading} onRefresh={() => void UsersController.loadUser(id, true)} />
          </>
        }
      />
      <UserStats stats={stats} />
      <div className="grid items-start gap-4 lg:grid-cols-[minmax(0,1fr)_22rem]">
        <div className="space-y-4">
          <Card>
            <CardHeader>
              <CardTitle>{d.week}</CardTitle>
              <CardDescription>{d.weekHint}</CardDescription>
            </CardHeader>
            <CardContent>
              <DailyBarChart data={week} config={MINUTES} tickFormatter={formatWeekday} className="h-44" />
            </CardContent>
          </Card>
          <ProfileCard user={user} />
        </div>
        <FeatureAccessCard user={user} />
      </div>
    </>
  )
}
