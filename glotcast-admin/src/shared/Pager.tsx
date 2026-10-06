import { ChevronLeft, ChevronRight } from "lucide-react"
import { Button } from "@/components/ui/button"
import { COMMON } from "@/copy/common"

/** "1–20 of 312" with Previous / Next. */
export function Pager({
  page,
  pageSize,
  total,
  onPage,
}: {
  page: number
  pageSize: number
  total: number
  onPage: (page: number) => void
}) {
  const from = Math.min(total, (page - 1) * pageSize + 1)
  const to = Math.min(total, page * pageSize)
  const last = Math.max(1, Math.ceil(total / pageSize))

  return (
    <div className="flex items-center justify-between gap-2 px-4 py-3 text-sm text-muted-foreground">
      <span className="tabular-nums">{COMMON.range(from, to, total)}</span>
      <div className="flex items-center gap-1">
        <Button variant="outline" size="sm" disabled={page <= 1} onClick={() => onPage(page - 1)}>
          <ChevronLeft />
          {COMMON.previous}
        </Button>
        <Button variant="outline" size="sm" disabled={page >= last} onClick={() => onPage(page + 1)}>
          {COMMON.next}
          <ChevronRight />
        </Button>
      </div>
    </div>
  )
}
