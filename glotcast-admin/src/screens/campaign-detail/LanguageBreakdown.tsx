"use client"

import { Languages } from "lucide-react"
import { Skeleton } from "@/components/ui/skeleton"
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table"
import { CAMPAIGNS } from "@/copy/campaigns"
import { localeName } from "@/domain/campaign"
import { formatCount, formatRate } from "@/domain/format"
import { EmptyState } from "@/shared/EmptyState"
import { TableCard } from "@/shared/TableCard"
import { useCampaignsStore } from "@/stores/useCampaignsStore"

/** Recipients and opens per language, the largest first, with a bar of each one's share. */
export function LanguageBreakdown({ campaignId }: { campaignId: string }) {
  const rows = useCampaignsStore((s) => s.stats[campaignId]?.data?.byLanguage)
  const l = CAMPAIGNS.detail.languages
  const total = rows?.reduce((n, r) => n + r.recipients, 0) ?? 0

  return (
    <TableCard title={l.title} description={l.hint}>
      {!rows ? (
        <div className="space-y-2 p-4">
          {[0, 1, 2].map((i) => (
            <Skeleton key={i} className="h-8 w-full" />
          ))}
        </div>
      ) : rows.length === 0 ? (
        <EmptyState icon={Languages} description={l.empty} />
      ) : (
        <Table>
          <TableHeader>
            <TableRow className="hover:bg-transparent">
              <TableHead className="pl-4">{l.columns.language}</TableHead>
              <TableHead className="text-right">{l.columns.recipients}</TableHead>
              <TableHead className="text-right">{l.columns.opened}</TableHead>
              <TableHead className="pr-4 text-right">{l.columns.rate}</TableHead>
            </TableRow>
          </TableHeader>
          <TableBody>
            {rows.map((r) => (
              <TableRow key={r.language}>
                <TableCell className="pl-4">
                  <div className="flex items-center gap-2">
                    <span className="font-medium">{localeName(r.language)}</span>
                    <span className="font-mono text-xs text-muted-foreground uppercase">{r.language}</span>
                  </div>
                  <div className="mt-1 h-1 w-full max-w-48 overflow-hidden rounded-full bg-muted">
                    <div
                      className="h-full rounded-full bg-brand"
                      style={{ width: `${total ? (r.recipients / total) * 100 : 0}%` }}
                    />
                  </div>
                </TableCell>
                <TableCell className="text-right tabular-nums">{formatCount(r.recipients)}</TableCell>
                <TableCell className="text-right tabular-nums">{formatCount(r.opened)}</TableCell>
                <TableCell className="pr-4 text-right text-muted-foreground tabular-nums">
                  {formatRate(r.opened, r.recipients)}
                </TableCell>
              </TableRow>
            ))}
          </TableBody>
        </Table>
      )}
    </TableCard>
  )
}
