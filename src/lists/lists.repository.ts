import { Inject, Injectable } from "@nestjs/common"
import { sql } from "drizzle-orm"
import { type EpisodeSummary, type ListPreview } from "../catalog/catalog.dto"
import { CatalogRepository } from "../catalog/catalog.repository"
import { DRIZZLE, type Database } from "../database/database.module"

export type ListRef = {
  id: string
  slug: string
  name: string
  description: string | null
}

/** Editorial lists: ordered episodes (list_episodes.position); only visible episodes are shown. */
@Injectable()
export class ListsRepository {
  constructor(
    @Inject(DRIZZLE) private readonly db: Database,
    private readonly catalog: CatalogRepository,
  ) {}

  async bySlug(slug: string): Promise<ListRef | null> {
    const res = await this.db.execute<ListRef>(
      sql`SELECT id, slug, name, description FROM app.lists WHERE slug = ${slug}`,
    )
    return res.rows[0] ?? null
  }

  async episodes(listId: string, limit: number, offset = 0): Promise<EpisodeSummary[]> {
    return this.catalog.episodes({
      join: sql`JOIN app.list_episodes le ON le.episode_id = e.id AND le.list_id = ${listId}`,
      orderBy: sql`le.position, e.published_at DESC`,
      limit,
      offset,
    })
  }

  count(listId: string): Promise<number> {
    return this.catalog.countEpisodes({
      join: sql`JOIN app.list_episodes le ON le.episode_id = e.id AND le.list_id = ${listId}`,
    })
  }

  /** The lists of `ids` in that order (unknown ids skipped), each with its first `n` episodes. */
  async previews(ids: string[], n: number): Promise<ListPreview[]> {
    if (!ids.length) return []
    const arr = sql`${`{${ids.join(",")}}`}::uuid[]`
    const res = await this.db.execute<ListRef>(sql`
      SELECT id, slug, name, description FROM app.lists WHERE id = ANY(${arr}) ORDER BY array_position(${arr}, id)
    `)
    return Promise.all(
      res.rows.map(async (l) => {
        const [episodes, total] = await Promise.all([this.episodes(l.id, n), this.count(l.id)])
        return { ...l, total, episodes }
      }),
    )
  }
}
