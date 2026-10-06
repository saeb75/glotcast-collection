import { Inject, Injectable, NotFoundException } from "@nestjs/common"
import { sql } from "drizzle-orm"
import { isoAt } from "../../common/rows"
import { DRIZZLE, type Database } from "../../database/database.module"
import { assertSlugFree, freeSlug } from "../common/slugs"
import { type AdminCategory, type CategoryInput } from "./categories.dto"

type Row = {
  id: string
  slug: string
  name: string
  description: string | null
  cover_url: string | null
  position: number
  podcast_count: number
  created_at: Date | string
  updated_at: Date | string
}

const SELECT = sql`
  SELECT c.id, c.slug, c.name, c.description, c.cover_url, c.position, c.created_at, c.updated_at,
         (SELECT count(*)::int FROM app.podcast_categories pc WHERE pc.category_id = c.id) AS podcast_count
  FROM app.categories c`

const toCategory = (r: Row): AdminCategory => ({
  id: r.id,
  slug: r.slug,
  name: r.name,
  description: r.description,
  coverUrl: r.cover_url,
  position: r.position,
  podcastCount: r.podcast_count,
  createdAt: isoAt(r.created_at),
  updatedAt: isoAt(r.updated_at),
})

/** Categories are few: one small service holds their reads and writes. */
@Injectable()
export class AdminCategoriesService {
  constructor(@Inject(DRIZZLE) private readonly db: Database) {}

  async list(): Promise<AdminCategory[]> {
    const res = await this.db.execute<Row>(sql`${SELECT} ORDER BY c.position, c.name`)
    return res.rows.map(toCategory)
  }

  async get(id: string): Promise<AdminCategory> {
    const res = await this.db.execute<Row>(sql`${SELECT} WHERE c.id = ${id}`)
    if (!res.rows[0]) throw new NotFoundException(`category ${id} not found`)
    return toCategory(res.rows[0])
  }

  async create(input: CategoryInput & { name: string }): Promise<AdminCategory> {
    const id = await this.db.transaction(async (tx) => {
      if (input.slug) await assertSlugFree(tx, "categories", input.slug)
      const slug = input.slug ?? (await freeSlug(tx, "categories", input.name))
      const res = await tx.execute<{ id: string }>(sql`
        INSERT INTO app.categories (slug, name, description, cover_url, position)
        VALUES (${slug}, ${input.name}, ${input.description ?? null}, ${input.coverUrl ?? null},
                ${input.position ?? sql`(SELECT coalesce(max(position) + 1, 0) FROM app.categories)`})
        RETURNING id
      `)
      return res.rows[0]!.id
    })
    return this.get(id)
  }

  async update(id: string, input: CategoryInput): Promise<AdminCategory> {
    await this.get(id)
    if (input.slug) await assertSlugFree(this.db, "categories", input.slug, id)
    const sets = [
      input.name !== undefined && sql`name = ${input.name}`,
      input.slug !== undefined && sql`slug = ${input.slug}`,
      input.description !== undefined && sql`description = ${input.description}`,
      input.coverUrl !== undefined && sql`cover_url = ${input.coverUrl}`,
      input.position !== undefined && sql`position = ${input.position}`,
    ].filter((s) => s !== false)
    await this.db.execute(
      sql`UPDATE app.categories SET ${sql.join([...sets, sql`updated_at = now()`], sql`, `)} WHERE id = ${id}`,
    )
    return this.get(id)
  }

  /** The category goes; its podcasts stay (they lose this category). */
  async remove(id: string): Promise<void> {
    await this.db.execute(sql`DELETE FROM app.categories WHERE id = ${id}`)
  }
}
