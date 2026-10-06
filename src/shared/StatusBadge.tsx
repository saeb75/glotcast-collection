import { CalendarClock, CircleCheck, CircleDashed } from "lucide-react"
import { Badge } from "@/components/ui/badge"
import { STATUS_LABELS } from "@/copy/status"
import { type PublishStatus } from "@/schemas/admin"

const ICONS = { draft: CircleDashed, scheduled: CalendarClock, published: CircleCheck } as const

/** Draft · Scheduled · Published. */
export function StatusBadge({ status }: { status: PublishStatus }) {
  const Icon = ICONS[status]
  return (
    <Badge
      variant={status === "published" ? "secondary" : "outline"}
      className={status === "published" ? "text-positive" : status === "scheduled" ? "text-warning" : undefined}
    >
      <Icon data-icon="inline-start" />
      {STATUS_LABELS[status]}
    </Badge>
  )
}
