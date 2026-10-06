import { Inject, Injectable } from "@nestjs/common"
import { type SQL, sql } from "drizzle-orm"
import { containsPattern, iso, isoAt, type Stamp } from "../../common/rows"
import { DRIZZLE, type Database } from "../../database/database.module"
import { publishStatus } from "../common/status"
import { type AdminPodcast } from "./podcasts.dto"

type Row = {
  id: string
  slug: string
  name: string
  description: string | null
  cover_url: string | null
  categories: { id: string; slug: string; name: string }[]
  published_at: Stamp
  episode_count: number
  published_episode_count: number
  legacy_document_id: string | null
  created_at: Date | string
  updated_at: Date | string
}

const SELECT = sql`
  SELECT p.id, p.slug, p.name, p.description, p.cover_url, p.published_at, p.legacy_document_id, p.created_at,
         p.updated_at,
         (SELECT count(*)::int FROM app.episodes e WHERE e.podcast_id = p.id) AS episode_count,
         (SELECT count(*)::int FROM app.episodes e WHERE e.podcast_id = p.id
            AND e.published_at IS NOT NULL AND e.published_at <= now()) AS published_episode_count,
         coalesce((SELECT json_agg(json_build_object('id', c.id, 'slug', c.slug, 'name', c.name)
                                   ORDER BY pc.position, c.name)
                   FROM app.podcast_categories pc JOIN app.categories c ON c.id = pc.category_id
                   WHERE pc.podcast_id = p.id), '[]'::json) AS categories
  FROM app.podcasts p`

const toPodcast = (r: Row): AdminPodcast => ({
  id: r.id,
  slug: r.slug,
  name: r.name,
  description: r.description,
  coverUrl: r.cover_url,
  categories: r.categories,
  status: publishStatus(r.published_at),
  publishedAt: iso(r.published_at),
  episodeCount: r.episode_count,
  publishedEpisodeCount: r.published_episode_count,
  legacyDocumentId: r.legacy_document_id,
  createdAt: isoAt(r.created_at),
  updatedAt: isoAt(r.updated_at),
})

@Injectable()
export class AdminPodcastsRepository {
  constructor(@Inject(DRIZZLE) private readonly db: Database) {}

  async page(q: { q?: string; limit: number; offset: number }) {
    const where: SQL = q.q
      ? sql`WHERE app.search_text(p.name) LIKE app.search_text(${containsPattern(q.q)}) OR p.slug ILIKE ${containsPattern(q.q)}`
      : sql``
    const [rows, total] = await Promise.all([
      this.db.execute<Row>(
        sql`${SELECT} ${where} ORDER BY p.created_at DESC, p.id LIMIT ${q.limit} OFFSET ${q.offset}`,
      ),
      this.db.execute<{ n: number }>(sql`SELECT count(*)::int AS n FROM app.podcasts p ${where}`),
    ])
    return { items: rows.rows.map(toPodcast), total: total.rows[0]?.n ?? 0 }
  }

  async get(id: string): Promise<AdminPodcast | null> {
    const res = await this.db.execute<Row>(sql`${SELECT} WHERE p.id = ${id}`)
    return res.rows[0] ? toPodcast(res.rows[0]) : null
  }
}
