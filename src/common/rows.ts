/** A timestamp as node-postgres returns it (Date), or as text (from json_build_object). */
export type Stamp = Date | string | null

export const iso = (v: Stamp): string | null =>
  v === null ? null : (v instanceof Date ? v : new Date(v)).toISOString()

/** For NOT NULL timestamps. */
export const isoAt = (v: Date | string): string => (v instanceof Date ? v : new Date(v)).toISOString()

/** Postgres unique violation (drizzle wraps the pg error in `cause`). */
export const isUniqueViolation = (err: unknown): boolean => {
  const e = err as { code?: string; cause?: { code?: string } } | null
  return e?.code === "23505" || e?.cause?.code === "23505"
}

/** Postgres foreign-key violation. */
export const isForeignKeyViolation = (err: unknown): boolean => {
  const e = err as { code?: string; cause?: { code?: string } } | null
  return e?.code === "23503" || e?.cause?.code === "23503"
}

/** A LIKE pattern matching `q` anywhere, with LIKE's wildcards escaped. */
export const containsPattern = (q: string): string => `%${q.replace(/[\\%_]/g, (c) => `\\${c}`)}%`

/** A URL-safe slug: lowercase ASCII, accents folded, words joined by "-". */
export function slugify(text: string, max = 80): string {
  const slug = text
    .normalize("NFKD")
    .replace(/[̀-ͯ]/g, "")
    .replace(/ı/g, "i")
    .toLowerCase()
    .replace(/&/g, " and ")
    .replace(/[^a-z0-9]+/g, "-")
    .replace(/^-+|-+$/g, "")
    .slice(0, max)
    .replace(/-+$/g, "")
  return slug || "item"
}
