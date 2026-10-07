"use client"

import { Filter, MailOpen } from "lucide-react"
import Link from "next/link"
import { Badge } from "@/components/ui/badge"
import { TableCell, TableRow } from "@/components/ui/table"
import { Tooltip, TooltipContent, TooltipTrigger } from "@/components/ui/tooltip"
import { NOTIFY, skipReasonLabel, variantLabel } from "@/copy/notifications"
import { SEND_LOG } from "@/copy/sendLog"
import { localeName } from "@/domain/campaign"
import { formatDateTime, shortId } from "@/domain/format"
import { cn } from "@/lib/utils"
import { type SendRow, type SendStatus } from "@/schemas/admin"
import { RelativeTime } from "@/shared/RelativeTime"
import { UserAvatar } from "@/shared/UserAvatar"

const TONES: Record<SendStatus, string> = {
  queued: "text-warning",
  sending: "text-brand",
  sent: "text-positive",
  failed: "text-destructive",
  unreachable: "text-muted-foreground",
  expired: "text-destructive",
  canceled: "text-muted-foreground",
  skipped: "text-muted-foreground",
}

/** One planned push: when, to whom, which, how it went (or why not), in what language, what it said, opened. */
export function SendLogRow({
  row: r,
  campaignName,
  onFilterUser,
  onFilterCampaign,
}: {
  row: SendRow
  campaignName: string | undefined
  onFilterUser: (userId: string) => void
  onFilterCampaign: (campaignId: string) => void
}) {
  const when = r.sentAt ?? r.dueAt
  const variant = variantLabel(r.variant)
  const skip = skipReasonLabel(r.skipReason)

  return (
    <TableRow className="align-top">
      <TableCell className="pl-4 whitespace-nowrap">
        <RelativeTime value={when} />
        {!r.sentAt && r.status !== "skipped" ? (
          <div className="text-xs text-muted-foreground">{SEND_LOG.due(formatDateTime(r.dueAt))}</div>
        ) : null}
      </TableCell>
      <TableCell className="max-w-56">
        <div className="flex items-center gap-2">
          <UserAvatar name={r.user.isAnonymous ? null : r.user.email} size="sm" />
          <div className="min-w-0">
            <Link href={`/users/${r.user.id}`} className="block truncate font-medium hover:underline">
              {r.user.email ?? (r.user.isAnonymous ? NOTIFY.guest : shortId(r.user.id))}
            </Link>
            <button
              type="button"
              className="inline-flex items-center gap-1 text-xs text-muted-foreground hover:text-foreground hover:underline"
              onClick={() => onFilterUser(r.user.id)}
            >
              <Filter className="size-3" />
              {SEND_LOG.filterUser}
            </button>
          </div>
        </div>
      </TableCell>
      <TableCell className="max-w-52">
        <div className="font-medium">{NOTIFY.kinds[r.kind]}</div>
        {r.campaignId ? (
          <div className="flex min-w-0 items-center gap-1 text-xs">
            <Link
              href={`/notifications/${r.campaignId}`}
              className="truncate text-muted-foreground hover:underline"
            >
              {campaignName ?? shortId(r.campaignId)}
            </Link>
            <button
              type="button"
              aria-label={SEND_LOG.filterCampaign}
              className="shrink-0 text-muted-foreground hover:text-foreground"
              onClick={() => onFilterCampaign(r.campaignId!)}
            >
              <Filter className="size-3" />
            </button>
          </div>
        ) : variant ? (
          <div className="truncate text-xs text-muted-foreground">{variant}</div>
        ) : null}
      </TableCell>
      <TableCell className="max-w-48">
        <Tooltip>
          <TooltipTrigger asChild>
            <Badge variant="outline" className={cn(TONES[r.status])}>
              {NOTIFY.sendStatuses[r.status]}
            </Badge>
          </TooltipTrigger>
          <TooltipContent>{NOTIFY.sendStatusHints[r.status]}</TooltipContent>
        </Tooltip>
        {skip ? <div className="mt-1 text-xs text-muted-foreground">{skip}</div> : null}
      </TableCell>
      <TableCell className="hidden whitespace-nowrap text-muted-foreground md:table-cell">
        {localeName(r.language)}
      </TableCell>
      <TableCell className="hidden max-w-80 lg:table-cell">
        {r.title || r.body ? (
          <div className="min-w-0" lang={r.language} dir={r.language === "ar" ? "rtl" : undefined}>
            <div className="truncate text-sm font-medium">{r.title}</div>
            <div className="line-clamp-2 text-xs text-muted-foreground">{r.body}</div>
          </div>
        ) : (
          <span className="text-xs text-muted-foreground">{SEND_LOG.notSent}</span>
        )}
      </TableCell>
      <TableCell className="pr-4">
        {r.openedAt ? (
          <span className="inline-flex items-center gap-1.5 text-positive">
            <MailOpen className="size-3.5" />
            <RelativeTime value={r.openedAt} className="text-sm" />
          </span>
        ) : (
          <span className="text-muted-foreground">{SEND_LOG.notOpened}</span>
        )}
      </TableCell>
    </TableRow>
  )
}
