/** Reading and writing list queries in the URL: every list page keeps its filters and page there. */

/** A known value, else the fallback (anything unknown in the URL is ignored). */
export const pickEnum = <T extends string>(value: string | null, allowed: readonly T[], fallback: T): T =>
  allowed.includes(value as T) ? (value as T) : fallback

/** `?page=` as a whole number ≥ 1. */
export const readPage = (params: URLSearchParams): number =>
  Math.max(1, Math.floor(Number(params.get("page")) || 1))

/** URL params from values, leaving out the defaults (a clean list has a clean URL). */
export function writeParams(
  values: Record<string, string | number | undefined>,
  defaults: Record<string, string | number | undefined>,
): URLSearchParams {
  const params = new URLSearchParams()
  for (const [key, value] of Object.entries(values)) {
    if (value === undefined || value === "" || value === defaults[key]) continue
    params.set(key, String(value))
  }
  return params
}

/** One cache key per query. */
export const keyOf = (...parts: (string | number | undefined)[]) => parts.map((p) => p ?? "").join("|")

/** "all" means no filter: undefined in the request. */
export const unlessAll = <T extends string>(value: T): Exclude<T, "all"> | undefined =>
  value === "all" ? undefined : (value as Exclude<T, "all">)

/** Where to go after signing in: a path of this site only (never `//evil.example`). */
export function safeNext(value: string | null | undefined): string {
  if (!value || !value.startsWith("/") || value.startsWith("//") || value.startsWith("/login")) return "/"
  return value
}
