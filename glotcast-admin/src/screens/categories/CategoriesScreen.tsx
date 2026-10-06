"use client"

import { Plus, Tags } from "lucide-react"
import { useEffect, useState } from "react"
import { Button } from "@/components/ui/button"
import { Skeleton } from "@/components/ui/skeleton"
import { Table, TableBody, TableHead, TableHeader, TableRow } from "@/components/ui/table"
import { CategoriesController } from "@/controllers/CategoriesController"
import { CATEGORIES } from "@/copy/categories"
import { type AdminCategory } from "@/schemas/admin"
import { EmptyState } from "@/shared/EmptyState"
import { ErrorState } from "@/shared/ErrorState"
import { PageHeader } from "@/shared/PageHeader"
import { RefreshButton } from "@/shared/RefreshButton"
import { TableCard } from "@/shared/TableCard"
import { useCategoriesStore } from "@/stores/useCategoriesStore"
import { CategoryDialog } from "./CategoryDialog"
import { CategoryRow } from "./CategoryRow"

/** Every category, in display order: create, edit, delete. */
export function CategoriesScreen() {
  const entry = useCategoriesStore((s) => s.entry)
  const categories = entry?.data
  // undefined = closed, null = a new one.
  const [editing, setEditing] = useState<AdminCategory | null | undefined>(undefined)
  const c = CATEGORIES.columns

  useEffect(() => {
    void CategoriesController.load()
  }, [])

  const nextPosition = Math.max(-1, ...(categories ?? []).map((cat) => cat.position)) + 1
  const newButton = (
    <Button onClick={() => setEditing(null)}>
      <Plus />
      {CATEGORIES.new}
    </Button>
  )

  return (
    <>
      <PageHeader
        title={CATEGORIES.title}
        description={CATEGORIES.subtitle}
        actions={
          <>
            <RefreshButton loading={entry?.loading} onRefresh={() => void CategoriesController.load(true)} />
            {newButton}
          </>
        }
      />
      <TableCard>
        {entry?.error && !categories ? (
          <div className="p-4">
            <ErrorState message={entry.error} onRetry={() => void CategoriesController.load(true)} />
          </div>
        ) : !categories ? (
          <div className="space-y-2 p-4">
            {[0, 1, 2, 3, 4].map((i) => (
              <Skeleton key={i} className="h-11 w-full" />
            ))}
          </div>
        ) : categories.length === 0 ? (
          <EmptyState
            icon={Tags}
            title={CATEGORIES.emptyTitle}
            description={CATEGORIES.emptyBody}
            action={newButton}
          />
        ) : (
          <Table>
            <TableHeader>
              <TableRow className="hover:bg-transparent">
                <TableHead className="pl-4">{c.position}</TableHead>
                <TableHead>{c.category}</TableHead>
                <TableHead className="hidden sm:table-cell">{c.podcasts}</TableHead>
                <TableHead className="hidden md:table-cell">{c.updated}</TableHead>
                <TableHead className="w-24 pr-4" />
              </TableRow>
            </TableHeader>
            <TableBody>
              {categories.map((cat) => (
                <CategoryRow key={cat.id} category={cat} onEdit={() => setEditing(cat)} />
              ))}
            </TableBody>
          </Table>
        )}
      </TableCard>
      {editing !== undefined ? (
        <CategoryDialog
          key={editing?.id ?? "new"}
          category={editing}
          nextPosition={nextPosition}
          open
          onOpenChange={(open) => !open && setEditing(undefined)}
        />
      ) : null}
    </>
  )
}
