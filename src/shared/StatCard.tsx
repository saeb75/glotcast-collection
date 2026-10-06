import { type LucideIcon } from "lucide-react"
import Link from "next/link"
import { type ReactNode } from "react"
import { Card, CardContent } from "@/components/ui/card"
import { Skeleton } from "@/components/ui/skeleton"
import { cn } from "@/lib/utils"

/** One number with its label; a skeleton until the value is known; a link to the page behind it when `to`. */
export function StatCard({
  label,
  value,
  hint,
  icon: Icon,
  loading = false,
  to,
}: {
  label: string
  value: ReactNode
  hint?: ReactNode
  icon?: LucideIcon
  loading?: boolean
  to?: string
}) {
  const card = (
    <Card size="sm" className={cn("h-full", to && "transition-colors hover:bg-muted/40")}>
      <CardContent className="space-y-1.5">
        <div className="flex items-center justify-between gap-2 text-sm text-muted-foreground">
          <span className="truncate">{label}</span>
          {Icon ? <Icon className="size-4 shrink-0" /> : null}
        </div>
        {loading ? (
          <Skeleton className="h-7 w-20" />
        ) : (
          <div className="truncate text-2xl font-semibold tracking-tight tabular-nums">{value}</div>
        )}
        {hint && !loading ? <div className="truncate text-xs text-muted-foreground">{hint}</div> : null}
      </CardContent>
    </Card>
  )
  return to ? (
    <Link href={to} className="rounded-xl outline-none focus-visible:ring-2 focus-visible:ring-ring/50">
      {card}
    </Link>
  ) : (
    card
  )
}
