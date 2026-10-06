"use client"

import { Pencil, Trash2 } from "lucide-react"
import { Button } from "@/components/ui/button"
import { TableCell, TableRow } from "@/components/ui/table"
import { CategoriesController } from "@/controllers/CategoriesController"
import { CATEGORIES } from "@/copy/categories"
import { COMMON } from "@/copy/common"
import { type AdminCategory } from "@/schemas/admin"
import { ConfirmDialog } from "@/shared/ConfirmDialog"
import { CoverThumb } from "@/shared/CoverThumb"
import { RelativeTime } from "@/shared/RelativeTime"

/** One category; the row opens the edit dialog. */
export function CategoryRow({ category: c, onEdit }: { category: AdminCategory; onEdit: () => void }) {
  return (
    <TableRow className="cursor-pointer" onClick={onEdit}>
      <TableCell className="w-16 pl-4 font-mono text-xs text-muted-foreground tabular-nums">
        {c.position}
      </TableCell>
      <TableCell>
        <div className="flex items-center gap-3">
          <CoverThumb url={c.coverUrl} alt="" className="w-9" />
          <div className="min-w-0">
            <div className="truncate font-medium">{c.name}</div>
            <div className="truncate font-mono text-xs text-muted-foreground">{c.slug}</div>
          </div>
        </div>
      </TableCell>
      <TableCell className="hidden text-muted-foreground tabular-nums sm:table-cell">
        {c.podcastCount}
      </TableCell>
      <TableCell className="hidden text-muted-foreground md:table-cell">
        <RelativeTime value={c.updatedAt} />
      </TableCell>
      <TableCell className="pr-4" onClick={(e) => e.stopPropagation()}>
        <div className="flex justify-end gap-1">
          <Button variant="ghost" size="icon-sm" aria-label={COMMON.edit} onClick={onEdit}>
            <Pencil />
          </Button>
          <ConfirmDialog
            trigger={
              <Button
                variant="ghost"
                size="icon-sm"
                aria-label={COMMON.delete}
                className="hover:text-destructive"
              >
                <Trash2 />
              </Button>
            }
            title={CATEGORIES.deleteTitle}
            description={CATEGORIES.deleteBody(c.name, c.podcastCount)}
            onConfirm={() => CategoriesController.remove(c.id)}
          />
        </div>
      </TableCell>
    </TableRow>
  )
}
