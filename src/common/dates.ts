/** Calendar dates as "YYYY-MM-DD" strings (the user's local day; no time zone math on the server). */
export const DATE_RE = /^\d{4}-\d{2}-\d{2}$/

/** A valid calendar date in "YYYY-MM-DD" form (rejects 2026-02-30). */
export function isDate(value: string): boolean {
  if (!DATE_RE.test(value)) return false
  const d = new Date(`${value}T00:00:00Z`)
  return !Number.isNaN(d.getTime()) && d.toISOString().slice(0, 10) === value
}

/** `date` shifted by `days` (negative = earlier). */
export function addDays(date: string, days: number): string {
  const d = new Date(`${date}T00:00:00Z`)
  d.setUTCDate(d.getUTCDate() + days)
  return d.toISOString().slice(0, 10)
}

/** Today in UTC — the fallback when the client does not say what its local day is. */
export const utcToday = (now = new Date()): string => now.toISOString().slice(0, 10)
