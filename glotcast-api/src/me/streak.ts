import { addDays } from "../common/dates"

/** A local day counts toward a streak once the user listened at least this long. */
export const STREAK_MIN_SECONDS = 60

export interface DayTotal {
  date: string // "YYYY-MM-DD", the user's local day
  seconds: number
}

/**
 * The current streak counts qualifying days back from `today` — or from yesterday while today has no qualifying
 * listening yet (the streak is not lost before the day is over). The best streak is the longest run ever, up to
 * `today` (days after it, from a client with a skewed clock, are ignored).
 */
export function streaks(days: DayTotal[], today: string): { streakDays: number; bestStreakDays: number } {
  const qualifying = new Set(
    days.filter((d) => d.seconds >= STREAK_MIN_SECONDS && d.date <= today).map((d) => d.date),
  )
  let streakDays = 0
  let cursor = qualifying.has(today) ? today : addDays(today, -1)
  while (qualifying.has(cursor)) {
    streakDays += 1
    cursor = addDays(cursor, -1)
  }
  let bestStreakDays = 0
  let run = 0
  let previous: string | null = null
  for (const date of [...qualifying].sort()) {
    run = previous !== null && addDays(previous, 1) === date ? run + 1 : 1
    bestStreakDays = Math.max(bestStreakDays, run)
    previous = date
  }
  return { streakDays, bestStreakDays }
}

/** The `n` days ending with `today`, oldest first, zero-filled. */
export function lastDays(days: DayTotal[], today: string, n = 7): DayTotal[] {
  const byDate = new Map(days.map((d) => [d.date, d.seconds]))
  return Array.from({ length: n }, (_, i) => {
    const date = addDays(today, i - (n - 1))
    return { date, seconds: Math.round(byDate.get(date) ?? 0) }
  })
}

/** Listening progress: a level is completed once the position reaches 95 % of its duration. */
export const COMPLETION_RATIO = 0.95
export const isCompleted = (positionSec: number, durationSec: number): boolean =>
  durationSec > 0 && positionSec >= durationSec * COMPLETION_RATIO

/** A heartbeat reports the seconds listened since the previous one: never negative, never more than 2 minutes. */
export const MAX_HEARTBEAT_SECONDS = 120
export const clampListened = (seconds: number): number =>
  Number.isFinite(seconds) ? Math.min(MAX_HEARTBEAT_SECONDS, Math.max(0, seconds)) : 0

/** The heartbeat that takes the day's total across the goal (and only that one). */
export const crossesGoal = (before: number, after: number, goalSeconds: number): boolean =>
  before < goalSeconds && after >= goalSeconds
