import { Inject, Injectable } from "@nestjs/common"
import { sql } from "drizzle-orm"
import { CatalogRepository } from "../catalog/catalog.repository"
import { type LevelValue, type PodcastSummary } from "../catalog/catalog.dto"
import { DRIZZLE, type Database } from "../database/database.module"

/** Podcast-only reads that are not lists of summaries (those are CatalogRepository's). */
@Injectable()
export class PodcastsRepository {
  constructor(
    @Inject(DRIZZLE) private readonly db: Database,
    private readonly catalog: CatalogRepository,
  ) {}

  async visible(id: string): Promise<(PodcastSummary & { description: string | null }) | null> {
    const [summary] = await this.catalog.podcasts({ where: sql`p.id = ${id}`, orderBy: sql`p.id`, limit: 1 })
    if (!summary) return null
    const res = await this.db.execute<{ description: string | null }>(
      sql`SELECT description FROM app.podcasts WHERE id = ${id}`,
    )
    return { ...summary, description: res.rows[0]?.description ?? null }
  }

  /** Levels with audio across the podcast's visible episodes, in level order. */
  async levels(id: string): Promise<LevelValue[]> {
    const res = await this.db.execute<{ level: LevelValue }>(sql`
      SELECT DISTINCT l.level FROM app.episode_levels l
      JOIN app.episodes e ON e.id = l.episode_id
      WHERE e.podcast_id = ${id} AND l.audio_url <> '' AND e.published_at IS NOT NULL AND e.published_at <= now()
      ORDER BY l.level
    `)
    return res.rows.map((r) => r.level)
  }

  async isFollowing(userId: string, podcastId: string): Promise<boolean> {
    const res = await this.db.execute(
      sql`SELECT 1 FROM app.follows WHERE user_id = ${userId} AND podcast_id = ${podcastId}`,
    )
    return res.rows.length > 0
  }

  async categoryExists(slug: string): Promise<boolean> {
    const res = await this.db.execute(sql`SELECT 1 FROM app.categories WHERE slug = ${slug}`)
    return res.rows.length > 0
  }
}
