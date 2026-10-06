import { AudioLines, Headphones, UserPlus, Users } from "lucide-react"
import { DASHBOARD } from "@/copy/dashboard"
import { formatCount } from "@/domain/format"
import { type Dashboard } from "@/schemas/admin"
import { StatCard } from "@/shared/StatCard"

/** Four headline numbers, each opening its page. */
export function DashboardStats({ dashboard: d }: { dashboard: Dashboard | undefined }) {
  const s = DASHBOARD.stats
  const loading = !d
  const today = d?.dau[d.dau.length - 1]?.count
  const average =
    d && d.dau.length ? Math.round(d.dau.reduce((sum, day) => sum + day.count, 0) / d.dau.length) : undefined
  return (
    <div className="grid grid-cols-2 gap-3 xl:grid-cols-4">
      <StatCard
        to="/users"
        label={s.users}
        value={formatCount(d?.users.total)}
        hint={d ? s.usersHint(formatCount(d.users.anonymous)) : undefined}
        icon={Users}
        loading={loading}
      />
      <StatCard
        to="/users"
        label={s.newUsers}
        value={formatCount(d?.users.last7Days)}
        hint={s.newUsersHint}
        icon={UserPlus}
        loading={loading}
      />
      <StatCard
        label={s.listenersToday}
        value={formatCount(today)}
        hint={average !== undefined ? s.listenersHint(formatCount(average)) : undefined}
        icon={Headphones}
        loading={loading}
      />
      <StatCard
        to="/episodes?status=published"
        label={s.published}
        value={formatCount(d?.episodes.published)}
        hint={d ? s.publishedHint(formatCount(d.episodes.drafts)) : undefined}
        icon={AudioLines}
        loading={loading}
      />
    </div>
  )
}
