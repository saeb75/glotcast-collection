"use client"

import { SearchX, Users } from "lucide-react"
import { useEffect, useState } from "react"
import { Button } from "@/components/ui/button"
import { Skeleton } from "@/components/ui/skeleton"
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table"
import { UsersController } from "@/controllers/UsersController"
import { COMMON } from "@/copy/common"
import { USERS } from "@/copy/users"
import { PAGE_SIZE, parseUsers, usersKey, usersParams } from "@/domain/lists"
import { cn } from "@/lib/utils"
import { EmptyState } from "@/shared/EmptyState"
import { ErrorState } from "@/shared/ErrorState"
import { PageHeader } from "@/shared/PageHeader"
import { Pager } from "@/shared/Pager"
import { RefreshButton } from "@/shared/RefreshButton"
import { SearchField } from "@/shared/SearchField"
import { TableCard } from "@/shared/TableCard"
import { useUrlQuery } from "@/shared/useUrlQuery"
import { useUsersStore } from "@/stores/useUsersStore"
import { UserRow } from "./UserRow"

const SKELETON = Array.from({ length: 8 }, (_, i) => i)

/** Everyone, newest first; search by email, name or id (searches are audited). */
export function UsersScreen() {
  const [query, setQuery] = useUrlQuery(parseUsers, usersParams)
  const key = usersKey(query)
  const entry = useUsersStore((s) => s.pages[key])
  const shown = useUsersStore((s) => (s.shownKey ? s.pages[s.shownKey]?.data : undefined))
  const data = entry?.data ?? shown
  const [searchReset, setSearchReset] = useState(0)
  const c = USERS.columns

  useEffect(() => {
    void UsersController.load(query)
  }, [key]) // eslint-disable-line react-hooks/exhaustive-deps -- the key is the query

  const users = data?.items
  return (
    <>
      <PageHeader
        title={USERS.title}
        description={USERS.subtitle}
        actions={
          <RefreshButton loading={entry?.loading} onRefresh={() => void UsersController.load(query, true)} />
        }
      />
      <TableCard
        toolbar={
          <SearchField
            key={searchReset}
            initial={query.q}
            placeholder={USERS.searchPlaceholder}
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
            <ErrorState message={entry.error} onRetry={() => void UsersController.load(query, true)} />
          </div>
        ) : users && users.length === 0 ? (
          <EmptyState
            icon={query.q ? SearchX : Users}
            title={USERS.emptyTitle}
            description={query.q ? USERS.emptyFiltered : USERS.emptyAll}
            action={
              query.q ? (
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
              ) : undefined
            }
          />
        ) : (
          <Table className={cn("transition-opacity", !entry?.data && users && "opacity-60")}>
            <TableHeader>
              <TableRow className="hover:bg-transparent">
                <TableHead className="pl-4">{c.user}</TableHead>
                <TableHead className="hidden sm:table-cell">{c.level}</TableHead>
                <TableHead>{c.access}</TableHead>
                <TableHead className="hidden lg:table-cell">{c.created}</TableHead>
                <TableHead className="hidden md:table-cell">{c.seen}</TableHead>
                <TableHead className="w-10 pr-4" />
              </TableRow>
            </TableHeader>
            <TableBody>
              {users
                ? users.map((u) => <UserRow key={u.id} user={u} />)
                : SKELETON.map((i) => (
                    <TableRow key={i} className="hover:bg-transparent">
                      <TableCell className="pl-4">
                        <div className="flex items-center gap-3">
                          <Skeleton className="size-8 rounded-full" />
                          <div className="space-y-1.5">
                            <Skeleton className="h-4 w-44" />
                            <Skeleton className="h-3 w-16" />
                          </div>
                        </div>
                      </TableCell>
                      <TableCell className="hidden sm:table-cell">
                        <Skeleton className="h-4 w-20" />
                      </TableCell>
                      <TableCell>
                        <Skeleton className="h-5 w-12 rounded-full" />
                      </TableCell>
                      <TableCell className="hidden lg:table-cell">
                        <Skeleton className="h-4 w-20" />
                      </TableCell>
                      <TableCell className="hidden md:table-cell">
                        <Skeleton className="h-4 w-20" />
                      </TableCell>
                      <TableCell className="pr-4" />
                    </TableRow>
                  ))}
            </TableBody>
          </Table>
        )}
      </TableCard>
    </>
  )
}
