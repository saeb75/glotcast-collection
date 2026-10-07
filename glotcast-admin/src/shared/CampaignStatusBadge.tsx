import { CalendarClock, CircleCheck, CircleDashed, CircleSlash, CircleX, Send } from "lucide-react"
import { Badge } from "@/components/ui/badge"
import { NOTIFY } from "@/copy/notifications"
import { cn } from "@/lib/utils"
import { type CampaignStatus } from "@/schemas/admin"

const ICONS = {
  draft: CircleDashed,
  scheduled: CalendarClock,
  sending: Send,
  sent: CircleCheck,
  canceled: CircleSlash,
  failed: CircleX,
} as const

const TONES: Record<CampaignStatus, string | undefined> = {
  draft: undefined,
  scheduled: "text-warning",
  sending: "text-brand",
  sent: "text-positive",
  canceled: "text-muted-foreground",
  failed: "text-destructive",
}

/** Draft · Scheduled · Sending · Sent · Canceled · Failed. */
export function CampaignStatusBadge({ status }: { status: CampaignStatus }) {
  const Icon = ICONS[status]
  return (
    <Badge variant={status === "sent" ? "secondary" : "outline"} className={cn(TONES[status])}>
      <Icon data-icon="inline-start" className={cn(status === "sending" && "animate-pulse")} />
      {NOTIFY.campaignStatuses[status]}
    </Badge>
  )
}
