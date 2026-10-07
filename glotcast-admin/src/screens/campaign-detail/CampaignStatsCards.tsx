"use client"

import {
  Ban,
  CircleX,
  Inbox,
  MousePointerClick,
  Percent,
  RotateCw,
  Send,
  SkipForward,
  UsersRound,
} from "lucide-react"
import { Button } from "@/components/ui/button"
import { CampaignsController } from "@/controllers/CampaignsController"
import { CAMPAIGNS } from "@/copy/campaigns"
import { campaignNumbers } from "@/domain/campaign"
import { formatCount, formatRate, formatRelative } from "@/domain/format"
import { cn } from "@/lib/utils"
import { type AdminCampaign } from "@/schemas/admin"
import { ErrorState } from "@/shared/ErrorState"
import { StatCard } from "@/shared/StatCard"
import { useCampaignsStore } from "@/stores/useCampaignsStore"

/** Recipients, sent, delivered, clicked, click rate, failed, unreachable, skipped — ours and OneSignal's. */
export function CampaignStatsCards({ campaign }: { campaign: AdminCampaign }) {
  const entry = useCampaignsStore((s) => s.stats[campaign.id])
  const stats = entry?.data
  const numbers = stats ? campaignNumbers(stats) : undefined
  const s = CAMPAIGNS.detail.stats
  const loading = !stats

  if (entry?.error && !stats)
    return (
      <ErrorState
        message={entry.error}
        onRetry={() => void CampaignsController.loadStats(campaign.id, { force: true })}
      />
    )

  return (
    <section className="space-y-3">
      <div className="flex flex-wrap items-end justify-between gap-2">
        <div>
          <h2 className="text-base font-semibold">{s.title}</h2>
          <p className="text-sm text-muted-foreground">
            {stats?.refreshedAt ? s.refreshed(formatRelative(stats.refreshedAt)) : s.hint}
          </p>
        </div>
        <Button
          variant="outline"
          size="sm"
          disabled={entry?.loading}
          onClick={() => void CampaignsController.loadStats(campaign.id, { refresh: true })}
        >
          <RotateCw className={cn(entry?.loading && "animate-spin")} />
          {s.refresh}
        </Button>
      </div>
      <div className="grid grid-cols-2 gap-3 md:grid-cols-4">
        <StatCard
          label={s.recipients}
          value={formatCount(stats?.recipients ?? campaign.recipients)}
          hint={s.recipientsHint}
          icon={UsersRound}
          loading={loading}
        />
        <StatCard
          label={s.sent}
          value={formatCount(stats?.sent)}
          hint={stats && stats.queued > 0 ? s.sentHint(formatCount(stats.queued)) : s.sentDone}
          icon={Send}
          loading={loading}
        />
        <StatCard
          label={s.delivered}
          value={formatCount(numbers?.delivered)}
          hint={numbers ? s.deliveredBy[numbers.deliveredBy] : undefined}
          icon={Inbox}
          loading={loading}
        />
        <StatCard
          label={s.clicked}
          value={formatCount(numbers?.clicked)}
          hint={
            numbers && stats
              ? numbers.clickedBy === "converted"
                ? s.clickedBy.converted(formatCount(stats.opened))
                : s.clickedBy.opened
              : undefined
          }
          icon={MousePointerClick}
          loading={loading}
        />
        <StatCard
          label={s.ctr}
          value={numbers ? formatRate(numbers.clicked, numbers.delivered) : "—"}
          hint={s.ctrHint}
          icon={Percent}
          loading={loading}
        />
        <StatCard
          label={s.failed}
          value={formatCount(stats?.failed)}
          hint={s.failedHint}
          icon={CircleX}
          loading={loading}
        />
        <StatCard
          label={s.unreachable}
          value={formatCount(stats?.unreachable)}
          hint={s.unreachableHint}
          icon={Ban}
          loading={loading}
        />
        <StatCard
          label={s.skipped}
          value={formatCount(stats?.skipped)}
          hint={s.skippedHint}
          icon={SkipForward}
          loading={loading}
        />
      </div>
    </section>
  )
}
