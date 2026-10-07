/** `<input type="datetime-local">` ↔ ISO, in the browser's time zone. */

const pad = (n: number) => String(n).padStart(2, "0")

/** "2026-10-06T14:30" for the input, from an ISO timestamp (local time). */
export function toLocalInput(iso: string | null | undefined): string {
  if (!iso) return ""
  const d = new Date(iso)
  if (Number.isNaN(d.getTime())) return ""
  return `${d.getFullYear()}-${pad(d.getMonth() + 1)}-${pad(d.getDate())}T${pad(d.getHours())}:${pad(d.getMinutes())}`
}

/** The input's local date-time as an ISO timestamp (UTC), or null when empty or invalid. */
export function fromLocalInput(value: string): string | null {
  if (!value) return null
  const d = new Date(value)
  return Number.isNaN(d.getTime()) ? null : d.toISOString()
}

/** The viewer's IANA time zone ("Europe/Istanbul"). */
export const viewerTimeZone = (): string => Intl.DateTimeFormat().resolvedOptions().timeZone
