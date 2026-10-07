import { Megaphone, SearchX } from "lucide-react"
import { type ReactNode } from "react"
import { Skeleton } from "@/components/ui/skeleton"
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table"
import { CAMPAIGNS } from "@/copy/campaigns"
import { cn } from "@/lib/utils"
import { type AdminCampaign } from "@/schemas/admin"
import { EmptyState } from "@/shared/EmptyState"
import { CampaignRow } from "./CampaignRow"

const SKELETON = Array.from({ length: 6 }, (_, i) => i)

export function CampaignsTable({
  campaigns,
  stale,
  filtered,
  emptyAction,
}: {
  campaigns: AdminCampaign[] | undefined
  stale: boolean
  filtered: boolean
  emptyAction: ReactNode
}) {
  if (campaigns && campaigns.length === 0)
    return (
      <EmptyState
        icon={filtered ? SearchX : Megaphone}
        title={CAMPAIGNS.emptyTitle}
        description={filtered ? CAMPAIGNS.emptyFiltered : CAMPAIGNS.emptyAll}
        action={emptyAction}
      />
    )

  const c = CAMPAIGNS.columns
  return (
    <Table className={cn("transition-opacity", stale && campaigns && "opacity-60")}>
      <TableHeader>
        <TableRow className="hover:bg-transparent">
          <TableHead className="pl-4">{c.campaign}</TableHead>
          <TableHead>{c.status}</TableHead>
          <TableHead className="hidden lg:table-cell">{c.audience}</TableHead>
          <TableHead className="hidden text-right sm:table-cell">{c.recipients}</TableHead>
          <TableHead className="hidden md:table-cell">{c.when}</TableHead>
          <TableHead className="w-10 pr-4" />
        </TableRow>
      </TableHeader>
      <TableBody>
        {campaigns
          ? campaigns.map((campaign) => <CampaignRow key={campaign.id} campaign={campaign} />)
          : SKELETON.map((i) => (
              <TableRow key={i} className="hover:bg-transparent">
                <TableCell className="pl-4">
                  <div className="space-y-1.5">
                    <Skeleton className="h-4 w-48" />
                    <Skeleton className="h-3 w-64" />
                  </div>
                </TableCell>
                <TableCell>
                  <Skeleton className="h-5 w-20 rounded-full" />
                </TableCell>
                <TableCell className="hidden lg:table-cell">
                  <Skeleton className="h-4 w-40" />
                </TableCell>
                <TableCell className="hidden sm:table-cell">
                  <Skeleton className="ml-auto h-4 w-12" />
                </TableCell>
                <TableCell className="hidden md:table-cell">
                  <Skeleton className="h-4 w-28" />
                </TableCell>
                <TableCell className="pr-4" />
              </TableRow>
            ))}
      </TableBody>
    </Table>
  )
}
