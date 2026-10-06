/** Display formats: counts, dates, durations, timestamps, ids, sizes. Pure — screens call these, never Intl. */

const whole = new Intl.NumberFormat("en-US")

export const formatCount = (n: number | null | undefined) => (n == null ? "—" : whole.format(n))

/** A share of a total: "58%"; a dash when there is no total. */
export const formatShare = (part: number, total: number) =>
  total > 0 ? `${Math.round((part / total) * 100)}%` : "—"

const dateTime = new Intl.DateTimeFormat("en-US", { dateStyle: "medium", timeStyle: "short" })
const date = new Intl.DateTimeFormat("en-US", { dateStyle: "medium" })
const day = new Intl.DateTimeFormat("en-US", { month: "short", day: "numeric", year: "numeric", timeZone: "UTC" })
const shortDay = new Intl.DateTimeFormat("en-US", { month: "short", day: "numeric", timeZone: "UTC" })
const weekday = new Intl.DateTimeFormat("en-US", { weekday: "short", timeZone: "UTC" })

/** "Sep 30, 2026, 5:48 PM" in the viewer's time zone. */
export const formatDateTime = (iso: string | null | undefined) => (iso ? dateTime.format(new Date(iso)) : "—")
/** "Sep 30, 2026" in the viewer's time zone. */
export const formatDate = (iso: string | null | undefined) => (iso ? date.format(new Date(iso)) : "—")
/** A calendar day from the API ("2026-09-30") → "Sep 30, 2026". */
export const formatDay = (value: string | null | undefined) => (value ? day.format(new Date(value)) : "—")
/** "Sep 30" — chart axes. */
export const formatShortDay = (value: string) => shortDay.format(new Date(value))
/** "Tue" — a week's chart. */
export const formatWeekday = (value: string) => weekday.format(new Date(value))

const relative = new Intl.RelativeTimeFormat("en-US", { numeric: "auto" })
const STEPS: [Intl.RelativeTimeFormatUnit, number][] = [
  ["second", 60],
  ["minute", 60],
  ["hour", 24],
  ["day", 30],
  ["month", 12],
  ["year", Infinity],
]

/** "5 minutes ago", "yesterday", "in 3 days"; `now` for tests. */
export function formatRelative(iso: string | null | undefined, now = Date.now()): string {
  if (!iso) return "Never"
  let value = (new Date(iso).getTime() - now) / 1000
  for (const [unit, size] of STEPS) {
    if (Math.abs(value) < size) {
      if (unit === "second" && Math.abs(value) < 45) return "just now"
      return relative.format(Math.round(value), unit)
    }
    value /= size
  }
  return relative.format(Math.round(value), "year")
}

const two = (n: number) => String(n).padStart(2, "0")

/** An audio length: "4:05", "1:02:03"; a dash when unknown. */
export function formatClock(seconds: number | null | undefined): string {
  if (seconds == null || !Number.isFinite(seconds) || seconds < 0) return "—"
  const s = Math.floor(seconds)
  const h = Math.floor(s / 3600)
  const m = Math.floor((s % 3600) / 60)
  return h > 0 ? `${h}:${two(m)}:${two(s % 60)}` : `${m}:${two(s % 60)}`
}

/** A transcript time to the tenth: "01:23.4" (hours when needed: "1:02:03.4"). */
export function formatTimestamp(seconds: number): string {
  if (!Number.isFinite(seconds) || seconds < 0) return "--:--.-"
  const tenths = Math.round(seconds * 10)
  const s = Math.floor(tenths / 10)
  const h = Math.floor(s / 3600)
  const m = Math.floor((s % 3600) / 60)
  const rest = `${two(m)}:${two(s % 60)}.${tenths % 10}`
  return h > 0 ? `${h}:${rest}` : rest
}

/** Listening time: "45 s", "12 min", "3 h 12 min". */
export function formatListening(seconds: number | null | undefined): string {
  if (seconds == null || !Number.isFinite(seconds)) return "—"
  const s = Math.round(seconds)
  if (s < 60) return `${s} s`
  const m = Math.floor(s / 60)
  if (m < 60) return `${m} min`
  const h = Math.floor(m / 60)
  return m % 60 ? `${h} h ${m % 60} min` : `${h} h`
}

/** "820 KB", "4.2 MB". */
export function formatBytes(bytes: number | null | undefined): string {
  if (bytes == null || !Number.isFinite(bytes)) return "—"
  if (bytes < 1024) return `${bytes} B`
  if (bytes < 1024 * 1024) return `${Math.round(bytes / 1024)} KB`
  return `${(bytes / (1024 * 1024)).toFixed(1).replace(/\.0$/, "")} MB`
}

/** The first block of a uuid: "3f2a9c1e". */
export const shortId = (id: string) => id.split("-")[0] ?? id

/** "AK" for ash.ketchum@…, "A" for ash@…; none for a guest (an icon instead). */
export function initials(nameOrEmail: string | null): string {
  if (!nameOrEmail) return ""
  const base = nameOrEmail.includes("@") ? (nameOrEmail.split("@")[0] ?? "") : nameOrEmail
  const parts = base.split(/[\s._\-+]+/).filter(Boolean)
  const letters = parts.length > 1 ? `${parts[0]![0]}${parts[1]![0]}` : base.slice(0, 1)
  return letters.toUpperCase()
}

/** "#12 · Title", or the title alone when the episode has no number. */
export const episodeLabel = (e: { number: number | null; title: string }) =>
  e.number != null ? `#${e.number} · ${e.title}` : e.title
