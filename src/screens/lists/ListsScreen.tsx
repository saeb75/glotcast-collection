"use client"

import { ChevronRight, ListOrdered, Plus } from "lucide-react"
import Link from "next/link"
import { useRouter } from "next/navigation"
import { useEffect, useState } from "react"
import { Button } from "@/components/ui/button"
import { Skeleton } from "@/components/ui/skeleton"
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table"
import { ListsController } from "@/controllers/ListsController"
import { HOME } from "@/copy/home"
import { LISTS } from "@/copy/lists"
import { EmptyState } from "@/shared/EmptyState"
import { ErrorState } from "@/shared/ErrorState"
import { PageHeader } from "@/shared/PageHeader"
import { RefreshButton } from "@/shared/RefreshButton"
import { RelativeTime } from "@/shared/RelativeTime"
import { TableCard } from "@/shared/TableCard"
import { useListsStore } from "@/stores/useListsStore"
import { ListDialog } from "./ListDialog"

/** Every curated list; a row opens it. */
export function ListsScreen() {
  const router = useRouter()
  const entry = useListsStore((s) => s.entry)
  const lists = entry?.data
  const [creating, setCreating] = useState(false)
  const c = LISTS.columns

  useEffect(() => {
    void ListsController.load()
  }, [])

  const newButton = (
    <Button onClick={() => setCreating(true)}>
      <Plus />
      {LISTS.new}
    </Button>
  )

  return (
    <>
      <PageHeader
        title={LISTS.title}
        description={LISTS.subtitle}
        actions={
          <>
            <RefreshButton loading={entry?.loading} onRefresh={() => void ListsController.load(true)} />
            {newButton}
          </>
        }
      />
      <TableCard>
        {entry?.error && !lists ? (
          <div className="p-4">
            <ErrorState message={entry.error} onRetry={() => void ListsController.load(true)} />
          </div>
        ) : !lists ? (
          <div className="space-y-2 p-4">
            {[0, 1, 2, 3].map((i) => (
              <Skeleton key={i} className="h-11 w-full" />
            ))}
          </div>
        ) : lists.length === 0 ? (
          <EmptyState icon={ListOrdered} title={LISTS.emptyTitle} description={LISTS.emptyBody} action={newButton} />
        ) : (
          <Table>
            <TableHeader>
              <TableRow className="hover:bg-transparent">
                <TableHead className="pl-4">{c.list}</TableHead>
                <TableHead>{c.episodes}</TableHead>
                <TableHead className="hidden md:table-cell">{c.updated}</TableHead>
                <TableHead className="w-10 pr-4" />
              </TableRow>
            </TableHeader>
            <TableBody>
              {lists.map((list) => (
                <TableRow key={list.id} className="cursor-pointer" onClick={() => router.push(`/lists/${list.id}`)}>
                  <TableCell className="pl-4">
                    <Link
                      href={`/lists/${list.id}`}
                      onClick={(e) => e.stopPropagation()}
                      className="block max-w-96 truncate font-medium outline-none hover:underline focus-visible:underline"
                    >
                      {list.name}
                    </Link>
                    <div className="max-w-96 truncate text-xs text-muted-foreground">
                      <span className="font-mono">{list.slug}</span>
                      {list.description ? ` · ${list.description}` : ""}
                    </div>
                  </TableCell>
                  <TableCell className="text-muted-foreground tabular-nums">{HOME.episodesCount(list.episodeCount)}</TableCell>
                  <TableCell className="hidden text-muted-foreground md:table-cell">
                    <RelativeTime value={list.updatedAt} />
                  </TableCell>
                  <TableCell className="pr-4 text-muted-foreground">
                    <ChevronRight className="size-4" />
                  </TableCell>
                </TableRow>
              ))}
            </TableBody>
          </Table>
        )}
      </TableCard>
      {creating ? <ListDialog open onOpenChange={setCreating} /> : null}
    </>
  )
}
