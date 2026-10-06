import { BookOpen, Clock, Flame, Headphones } from "lucide-react"
import { USERS } from "@/copy/users"
import { formatCount, formatListening } from "@/domain/format"
import { type UserStats as Stats } from "@/schemas/admin"
import { StatCard } from "@/shared/StatCard"

/** Streak, today, total listening, saved words. */
export function UserStats({ stats: s }: { stats: Stats }) {
  const t = USERS.detail.stats
  return (
    <div className="grid grid-cols-2 gap-3 xl:grid-cols-4">
      <StatCard
        label={t.streak}
        value={t.days(s.streakDays)}
        hint={t.streakHint(s.bestStreakDays)}
        icon={Flame}
      />
      <StatCard
        label={t.today}
        value={formatListening(s.todaySec)}
        hint={t.todayHint(formatListening(s.dailyGoalSec), s.goalMetToday)}
        icon={Clock}
      />
      <StatCard
        label={t.total}
        value={formatListening(s.totalSec)}
        hint={t.completed(s.episodesCompleted)}
        icon={Headphones}
      />
      <StatCard
        label={t.words}
        value={formatCount(s.wordsTotal)}
        hint={t.wordsHint(s.wordsMastered, s.wordsDue)}
        icon={BookOpen}
      />
    </div>
  )
}
