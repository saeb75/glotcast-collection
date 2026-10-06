import { ConflictException } from "@nestjs/common"
import { sql } from "drizzle-orm"
import { slugify } from "../../common/rows"
import { type Database } from "../../database/database.module"

type Executor = Pick<Database, "execute">
export type SluggedTable = "podcasts" | "categories" | "lists"

export const SLUG_RE = /^[a-z0-9]+(?:-[a-z0-9]+)*$/

/** The first free slug for `name`: "lisbon-mornings", then "lisbon-mornings-2", "-3"… */
export async function freeSlug(
  db: Executor,
  table: SluggedTable,
  name: string,
  exceptId?: string,
): Promise<string> {
  const base = slugify(name)
  const res = await db.execute<{ slug: string }>(sql`
    SELECT slug FROM ${sql.raw(`app.${table}`)}
    WHERE (slug = ${base} OR slug LIKE ${`${base}-%`}) ${exceptId ? sql`AND id <> ${exceptId}` : sql``}
  `)
  const taken = new Set(res.rows.map((r) => r.slug))
  if (!taken.has(base)) return base
  for (let n = 2; ; n++) if (!taken.has(`${base}-${n}`)) return `${base}-${n}`
}

/** An explicit slug must be free. */
export async function assertSlugFree(
  db: Executor,
  table: SluggedTable,
  slug: string,
  exceptId?: string,
): Promise<void> {
  const res = await db.execute(sql`
    SELECT 1 FROM ${sql.raw(`app.${table}`)} WHERE slug = ${slug} ${exceptId ? sql`AND id <> ${exceptId}` : sql``}
  `)
  if (res.rows.length) throw new ConflictException(`the slug "${slug}" is taken`)
}
