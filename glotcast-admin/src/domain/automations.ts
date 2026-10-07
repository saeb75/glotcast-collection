/** The automated pushes' settings, pure: quiet hours (the API's rule), the form ↔ the settings, the 7 days. */
import { type AutomationSettings, type KindCount, type NotificationKind } from "@/schemas/admin"

/** "HH:mm" → minutes after midnight. */
export function hm(text: string): number {
  const [h, m] = text.split(":").map(Number)
  return (h ?? 0) * 60 + (m ?? 0)
}

/** [from, to) in local time; wraps around midnight when from > to (22:00–08:00); from = to means none. */
export function inQuietHours(time: string, quiet: { from: string; to: string }): boolean {
  const minute = hm(time)
  const from = hm(quiet.from)
  const to = hm(quiet.to)
  if (from === to) return false
  return from < to ? minute >= from && minute < to : minute >= from || minute < to
}

/** The settings as the form edits them: numbers as typed text. */
export interface AutomationsForm {
  quietHours: { from: string; to: string }
  reminder: { enabled: boolean; weeklyRecap: boolean; minDue: string }
  streakSaver: { enabled: boolean; time: string; minStreak: string }
  learning: { enabled: boolean; time: string }
  newEpisodes: { enabled: boolean; debounceMin: string; freshHours: string }
}

export const automationsForm = (s: AutomationSettings): AutomationsForm => ({
  quietHours: { ...s.quietHours },
  reminder: { ...s.reminder, minDue: String(s.reminder.minDue) },
  streakSaver: { ...s.streakSaver, minStreak: String(s.streakSaver.minStreak) },
  learning: { ...s.learning },
  newEpisodes: {
    ...s.newEpisodes,
    debounceMin: String(s.newEpisodes.debounceMin),
    freshHours: String(s.newEpisodes.freshHours),
  },
})

const number = (text: string) => (text.trim() === "" ? null : Number(text))

/** The values `automationsFormSchema` checks (numbers parsed; NaN stays NaN so the schema reports it). */
export const automationsFormValues = (f: AutomationsForm) => ({
  quietHours: f.quietHours,
  reminder: { ...f.reminder, minDue: number(f.reminder.minDue) },
  streakSaver: { ...f.streakSaver, minStreak: number(f.streakSaver.minStreak) },
  learning: f.learning,
  newEpisodes: {
    ...f.newEpisodes,
    debounceMin: number(f.newEpisodes.debounceMin),
    freshHours: number(f.newEpisodes.freshHours),
  },
})

const formKey = (f: AutomationsForm) =>
  JSON.stringify([
    f.quietHours.from,
    f.quietHours.to,
    f.reminder.enabled,
    f.reminder.weeklyRecap,
    f.reminder.minDue.trim(),
    f.streakSaver.enabled,
    f.streakSaver.time,
    f.streakSaver.minStreak.trim(),
    f.learning.enabled,
    f.learning.time,
    f.newEpisodes.enabled,
    f.newEpisodes.debounceMin.trim(),
    f.newEpisodes.freshHours.trim(),
  ])

export const isAutomationsDirty = (
  draft: AutomationsForm | undefined,
  saved: AutomationSettings | undefined,
) => Boolean(draft && saved && formKey(draft) !== formKey(automationsForm(saved)))

/** A kind's last 7 days (zeros when nothing went out). */
export const weekOf = (last7Days: KindCount[] | undefined, kind: NotificationKind) =>
  last7Days?.find((k) => k.kind === kind) ?? { kind, sent: 0, opened: 0 }

/** The scheduler runs every 5 minutes: three missed runs look like a stuck one. */
export const STALE_TICK_MS = 15 * 60_000

export const tickIsStale = (lastTickAt: string | null, now: number) =>
  lastTickAt !== null && now - Date.parse(lastTickAt) > STALE_TICK_MS
