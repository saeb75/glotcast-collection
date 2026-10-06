"use client"

import { ArrowLeft, Trash2 } from "lucide-react"
import Link from "next/link"
import { useRouter } from "next/navigation"
import { useEffect } from "react"
import { Button } from "@/components/ui/button"
import { Skeleton } from "@/components/ui/skeleton"
import { ListsController } from "@/controllers/ListsController"
import { COMMON, ERRORS } from "@/copy/common"
import { LISTS } from "@/copy/lists"
import { NAV_COPY } from "@/copy/nav"
import { ConfirmDialog } from "@/shared/ConfirmDialog"
import { ErrorState } from "@/shared/ErrorState"
import { PageHeader } from "@/shared/PageHeader"
import { useListsStore } from "@/stores/useListsStore"
import { ListDetailsForm } from "./ListDetailsForm"
import { ListEpisodesCard } from "./ListEpisodesCard"

/** One list: its details and its ordered episodes. */
export function ListDetailScreen({ id }: { id: string }) {
  const router = useRouter()
  const entry = useListsStore((s) => s.details[id])
  const list = entry?.data

  useEffect(() => {
    void ListsController.loadList(id, true)
  }, [id])

  const back = (
    <Button variant="ghost" size="sm" asChild>
      <Link href="/lists">
        <ArrowLeft />
        {NAV_COPY.lists}
      </Link>
    </Button>
  )

  if (entry?.error && !list)
    return (
      <>
        <PageHeader title={LISTS.title} actions={back} />
        <ErrorState
          message={entry.error === ERRORS.not_found ? LISTS.notFound : entry.error}
          onRetry={() => void ListsController.loadList(id, true)}
        />
      </>
    )

  if (!list)
    return (
      <div className="space-y-6">
        <Skeleton className="h-9 w-64" />
        <div className="grid gap-6 lg:grid-cols-[20rem_minmax(0,1fr)]">
          <Skeleton className="h-80 w-full rounded-xl" />
          <Skeleton className="h-96 w-full rounded-xl" />
        </div>
      </div>
    )

  return (
    <>
      <PageHeader
        title={list.name}
        description={<span className="font-mono">{list.slug}</span>}
        actions={
          <>
            {back}
            <ConfirmDialog
              trigger={
                <Button variant="outline" className="text-destructive hover:text-destructive">
                  <Trash2 />
                  {COMMON.delete}
                </Button>
              }
              title={LISTS.deleteTitle}
              description={LISTS.deleteBody(list.name)}
              onConfirm={async () => {
                const done = await ListsController.remove(list.id)
                if (done) router.replace("/lists")
                return done
              }}
            />
          </>
        }
      />
      <div className="grid items-start gap-6 lg:grid-cols-[20rem_minmax(0,1fr)]">
        <ListDetailsForm key={`${list.name}|${list.slug}|${list.description ?? ""}`} list={list} />
        <ListEpisodesCard key={list.episodes.map((e) => e.id).join(",")} list={list} />
      </div>
    </>
  )
}
