"use client"

import { BellRing, Clock, KeyRound, Layers } from "lucide-react"
import { AUTOMATIONS } from "@/copy/automations"
import { weekOf } from "@/domain/automations"
import { formatCount, formatRelative } from "@/domain/format"
import { type AutomationsView } from "@/schemas/admin"
import { RelativeTime } from "@/shared/RelativeTime"
import { StatCard } from "@/shared/StatCard"
import { useNow } from "@/shared/useNow"

/** OneSignal keys, the kill switch, the scheduler's last run and its queue; campaigns and tests this week. */
export function SchedulerStatus({ view }: { view: AutomationsView }) {
  const { status, last7Days } = view
  const s = AUTOMATIONS.status
  const campaigns = weekOf(last7Days, "campaign")
  const tests = weekOf(last7Days, "test")
  useNow(true, 60_000) // keeps "5 minutes ago" moving

  return (
    <div className="grid grid-cols-2 gap-3 xl:grid-cols-4">
      <StatCard
        label={s.onesignal}
        value={
          <span className={status.configured ? "text-positive" : "text-destructive"}>
            {status.configured ? s.configured : s.notConfigured}
          </span>
        }
        hint={status.configured ? undefined : s.keysHint}
        icon={KeyRound}
      />
      <StatCard
        label={s.sending}
        value={
          <span className={status.enabled ? "text-positive" : "text-warning"}>
            {status.enabled ? s.enabled : AUTOMATIONS.off}
          </span>
        }
        hint={
          status.enabled ? s.campaignsWeek(formatCount(campaigns.sent), formatCount(tests.sent)) : s.disabled
        }
        icon={BellRing}
      />
      <StatCard
        label={s.lastTick}
        value={status.lastTickAt ? <RelativeTime value={status.lastTickAt} /> : s.never}
        hint={status.lastTickAt ? s.hint : formatRelative(null)}
        icon={Clock}
      />
      <StatCard label={s.queued} value={formatCount(status.queued)} hint={s.queuedHint} icon={Layers} />
    </div>
  )
}
