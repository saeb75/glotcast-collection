"use client"

import { ChevronRight } from "lucide-react"
import { useRouter } from "next/navigation"
import { TableCell, TableRow } from "@/components/ui/table"
import { CAMPAIGNS } from "@/copy/campaigns"
import { AUDIENCE_WORDS, DELIVERY_WORDS } from "@/copy/notifications"
import { audienceSummary, deliverySummary, isLocale, messageFor } from "@/domain/campaign"
import { formatCount, formatRelative } from "@/domain/format"
import { type AdminCampaign } from "@/schemas/admin"
import { CampaignStatusBadge } from "@/shared/CampaignStatusBadge"
import { RelativeTime } from "@/shared/RelativeTime"
import { usePodcastsStore } from "@/stores/usePodcastsStore"

/** One campaign: its name and source title, status, audience, recipients, when; the row opens it. */
export function CampaignRow({ campaign: c }: { campaign: AdminCampaign }) {
  const router = useRouter()
  const podcasts = usePodcastsStore((s) => s.options?.data)
  const source = isLocale(c.sourceLanguage) ? c.sourceLanguage : "en"
  const preview = messageFor(c.messages, source, source)?.message.title
  const podcastName = (id: string) => podcasts?.find((p) => p.id === id)?.name

  return (
    <TableRow className="cursor-pointer" onClick={() => router.push(`/notifications/${c.id}`)}>
      <TableCell className="max-w-80 pl-4">
        <div className="truncate font-medium">{c.name}</div>
        <div className="truncate text-xs text-muted-foreground">{preview ?? CAMPAIGNS.noMessage}</div>
      </TableCell>
      <TableCell>
        <CampaignStatusBadge status={c.status} />
      </TableCell>
      <TableCell className="hidden max-w-72 lg:table-cell">
        <div className="truncate text-sm text-muted-foreground">
          {audienceSummary(c.audience, AUDIENCE_WORDS, podcastName)}
        </div>
      </TableCell>
      <TableCell className="hidden text-right tabular-nums sm:table-cell">
        {c.recipients == null ? <span className="text-muted-foreground">—</span> : formatCount(c.recipients)}
      </TableCell>
      <TableCell className="hidden text-sm text-muted-foreground md:table-cell">
        {c.sentAt ? (
          <RelativeTime value={c.sentAt} />
        ) : c.status === "scheduled" ? (
          <span className="text-foreground">{deliverySummary(c.delivery, DELIVERY_WORDS)}</span>
        ) : (
          CAMPAIGNS.edited(formatRelative(c.updatedAt))
        )}
      </TableCell>
      <TableCell className="pr-4 text-muted-foreground">
        <ChevronRight className="size-4" />
      </TableCell>
    </TableRow>
  )
}
