/**
 * Pure decisions behind the automated pushes: local time, quiet hours, caps, which message a user gets, and the
 * daily rotation between a message's variants. No I/O: the planner gathers the facts and stores the outcome.
 */
import { type Level } from "../database/schema/app"
import { STREAK_MIN_SECONDS } from "../me/streak"
import { type MessageKey, type Params } from "./copy/en"
import { type PushLink } from "./payload"
import { type AutomationSettings } from "./settings"

/** "HH:mm" → minutes after midnight. */
export function hm(text: string): number {
  const [h, m] = text.split(":").map(Number)
  return (h ?? 0) * 60 + (m ?? 0)
}

/** Minutes after midnight → "HH:mm". */
export const hmText = (minutes: number): string =>
  `${String(Math.floor(minutes / 60) % 24).padStart(2, "0")}:${String(minutes % 60).padStart(2, "0")}`

/** [from, to) in local minutes; wraps around midnight when from > to (22:00–08:00); from = to means none. */
export function inQuietHours(minute: number, quiet: { from: string; to: string }): boolean {
  const from = hm(quiet.from)
  const to = hm(quiet.to)
  if (from === to) return false
  return from < to ? minute >= from && minute < to : minute >= from || minute < to
}

/** At most this many pushes per user and local day (the daily slot is one of them; tests are not counted). */
export const MAX_PUSHES_PER_DAY = 2

/** 32-bit FNV-1a: a stable, well-spread number per user id. */
export function fnv1a(text: string): number {
  let hash = 0x811c9dc5
  for (let i = 0; i < text.length; i++) {
    hash ^= text.charCodeAt(i)
    hash = Math.imul(hash, 0x01000193)
  }
  return hash >>> 0
}

/** Days since 1970-01-01 of a "YYYY-MM-DD" date. */
export const epochDay = (date: string): number => Math.floor(Date.parse(`${date}T00:00:00Z`) / 86_400_000)

/** Which of `n` variants a user sees on a day: every user starts elsewhere and moves one step a day. */
export const variantIndex = (userId: string, localDate: string, n: number): number =>
  n <= 1 ? 0 : (fnv1a(userId) + epochDay(localDate)) % n

/** Streak lengths the app celebrates (the heartbeat's `milestone`). */
export const MILESTONES = [7, 30, 100, 365] as const
export const milestoneOf = (streakDays: number): number | null =>
  (MILESTONES as readonly number[]).includes(streakDays) ? streakDays : null

/** The automated pushes with a slot in the user's day. */
export type DailyKind = "reminder" | "learning" | "streak_saver"

export interface ContinueItem {
  episodeId: string
  title: string
  coverUrl: string | null
  level: Level
  positionSec: number
  durationSec: number
  /** Hours since the user last listened to it. */
  idleHours: number
}

export interface NewEpisode {
  episodeId: string
  title: string
  coverUrl: string | null
  level: Level
}

/** What the planner knows about a user at a slot (local date of the slot, `$now` for the rest). */
export interface Facts {
  userId: string
  localDate: string
  /** 0 = Sunday. */
  weekday: number
  /** The slot's local time, minutes after midnight. */
  slotMinute: number
  /** The user's own reminder (minutes), when they get one: the streak saver leaves the evening to it. */
  reminderMinute: number | null
  todaySec: number
  goalSec: number
  weekSec: number
  /** Qualifying days in a row up to today (or up to yesterday while today has none yet). */
  streakDays: number
  wordsDue: number
  /** Listened in the last 30 minutes. */
  activeNow: boolean
  continueItem: ContinueItem | null
  newEpisode: NewEpisode | null
  /** Pushes queued or sent today (local date), tests excepted. */
  sentToday: number
  /** A reminder / learning / streak-saver push is already queued or sent today. */
  dailySlotUsed: boolean
}

export type SkipReason =
  | "daily_cap"
  | "cap"
  | "quiet_hours"
  | "goal_met"
  | "active_now"
  | "nothing_to_send"
  | "no_streak"
  | "listened_today"
  | "reminder_later"

export type Decision =
  | {
      send: true
      message: MessageKey
      params: Params
      link: PushLink
      imageUrl: string | null
      episodeIds: string[]
    }
  | { send: false; reason: SkipReason }

const skip = (reason: SkipReason): Decision => ({ send: false, reason })
const remainingMinutes = (c: ContinueItem): number =>
  Math.max(1, Math.ceil((c.durationSec - c.positionSec) / 60))
const ratio = (c: ContinueItem): number => (c.durationSec > 0 ? c.positionSec / c.durationSec : 0)

function message(
  key: MessageKey,
  params: Params,
  link: PushLink,
  extra: { imageUrl?: string | null; episodeIds?: string[] } = {},
): Decision {
  return {
    send: true,
    message: key,
    params,
    link,
    imageUrl: extra.imageUrl ?? null,
    episodeIds: extra.episodeIds ?? [],
  }
}

const continueLink = (f: Facts): PushLink =>
  f.continueItem
    ? { type: "player", id: f.continueItem.episodeId, level: f.continueItem.level }
    : { type: "home" }

const wordsDue = (f: Facts) => message("wordsDue", { count: f.wordsDue }, { type: "review" })
const recap = (f: Facts) =>
  message("recap", { count: Math.max(1, Math.round(f.weekSec / 60)) }, { type: "home" })
const isRecapDay = (f: Facts, s: AutomationSettings) =>
  s.reminder.weeklyRecap && f.weekday === 0 && f.weekSec >= STREAK_MIN_SECONDS

function continueEpisode(f: Facts, key: "continue" | "finish"): Decision {
  const c = f.continueItem!
  return message(
    key,
    { title: c.title, count: remainingMinutes(c) },
    { type: "player", id: c.episodeId, level: c.level },
    { imageUrl: c.coverUrl, episodeIds: [c.episodeId] },
  )
}

/**
 * The push (or the reason for none) of a daily slot — the contract's priorities:
 * - reminder: none when today's goal is met (then words due, if enough) or the user is listening right now;
 *   otherwise the first of: weekly recap (Sunday), streak (≥ 3 days), continue an episode, words due, a new
 *   episode at their level, a generic nudge;
 * - learning: weekly recap (Sunday), words due, or finishing an episode (≥ 20 % heard, idle 1–7 days); else none;
 * - streak saver: only with a streak, nothing listened today, and no reminder of theirs still to come.
 * Caps (one daily-slot push, two pushes a day) and quiet hours (the user's own reminder time is exempt) first.
 */
export function decide(kind: DailyKind, f: Facts, s: AutomationSettings): Decision {
  if (f.dailySlotUsed) return skip("daily_cap")
  if (f.sentToday >= MAX_PUSHES_PER_DAY) return skip("cap")
  if (kind !== "reminder" && inQuietHours(f.slotMinute, s.quietHours)) return skip("quiet_hours")
  const goalMet = f.goalSec > 0 && f.todaySec >= f.goalSec
  const enoughDue = f.wordsDue >= s.reminder.minDue

  if (kind === "reminder") {
    if (goalMet) return enoughDue ? wordsDue(f) : skip("goal_met")
    if (f.activeNow) return skip("active_now")
    if (isRecapDay(f, s)) return recap(f)
    if (f.streakDays >= 3) return message("streak", { count: f.streakDays }, continueLink(f))
    if (f.continueItem) return continueEpisode(f, "continue")
    if (enoughDue) return wordsDue(f)
    if (f.newEpisode) {
      const e = f.newEpisode
      return message(
        "newEpisode",
        { title: e.title, level: e.level },
        { type: "episode", id: e.episodeId },
        { imageUrl: e.coverUrl, episodeIds: [e.episodeId] },
      )
    }
    return message("generic", {}, { type: "home" })
  }

  if (kind === "learning") {
    if (f.activeNow) return skip("active_now")
    if (goalMet) return enoughDue ? wordsDue(f) : skip("goal_met")
    if (isRecapDay(f, s)) return recap(f)
    if (enoughDue) return wordsDue(f)
    const c = f.continueItem
    if (c && ratio(c) >= 0.2 && c.idleHours >= 24 && c.idleHours <= 7 * 24)
      return continueEpisode(f, "finish")
    return skip("nothing_to_send")
  }

  // streak_saver
  if (f.streakDays < s.streakSaver.minStreak) return skip("no_streak")
  if (f.todaySec >= STREAK_MIN_SECONDS) return skip("listened_today")
  if (f.reminderMinute !== null && f.reminderMinute >= f.slotMinute) return skip("reminder_later")
  if (f.activeNow) return skip("active_now")
  return message("streakSaver", { count: f.streakDays }, continueLink(f))
}
