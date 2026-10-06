import { Inject, Injectable } from "@nestjs/common"
import { type SQL, sql } from "drizzle-orm"
import { containsPattern, isoAt } from "../common/rows"
import { DRIZZLE, type Database } from "../database/database.module"
import { type Level } from "../database/schema/app"
import { type Category, type CategoryRef, type EpisodeSummary, type PodcastSummary } from "./catalog.dto"

const UUID_RE = /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i
export const isUuid = (v: string): boolean => UUID_RE.test(v)

/** What the app may see: published (a date that has come) — the podcast as well as the episode. */
export const PODCAST_VISIBLE = sql`(p.published_at IS NOT NULL AND p.published_at <= now())`
export const EPISODE_VISIBLE = sql`(e.published_at IS NOT NULL AND e.published_at <= now() AND ${PODCAST_VISIBLE})`

/** The episode (alias e) has audio for `level`. */
export const hasLevel = (level: Level): SQL =>
  sql`EXISTS (SELECT 1 FROM app.episode_levels hl WHERE hl.episode_id = e.id AND hl.level = ${level} AND hl.audio_url <> '')`

/** A search term as the search indexes see it (lowercase, accents removed), wrapped for LIKE (wildcards escaped). */
export const searchPattern = (q: string): SQL => sql`app.search_text(${containsPattern(q)})`
export const EPISODE_SEARCH_TEXT = sql`app.search_text(e.title || ' ' || coalesce(e.description, ''))`
export const PODCAST_SEARCH_TEXT = sql`app.search_text(p.name || ' ' || coalesce(p.description, ''))`

/** Distinct listeners per episode over the last 14 days (the trending signal). */
export const TRENDING_JOIN = sql`
  LEFT JOIN (
    SELECT episode_id, count(DISTINCT user_id)::int AS listeners
    FROM app.listening_progress
    WHERE updated_at > now() - interval '14 days'
    GROUP BY episode_id
  ) tr ON tr.episode_id = e.id`

export const SUMMARY_COLUMNS = sql`
  e.id, e.number, e.title, e.cover_url, e.banner_url, e.is_pro, e.published_at,
  p.id AS podcast_id, p.name AS podcast_name, p.cover_url AS podcast_cover_url,
  coalesce((
    SELECT json_agg(json_build_object('level', l.level, 'durationSec', l.duration_sec, 'description', l.description)
                    ORDER BY l.level)
    FROM app.episode_levels l WHERE l.episode_id = e.id AND l.audio_url <> ''
  ), '[]'::json) AS levels`

export type SummaryRow = {
  id: string
  number: number | null
  title: string
  cover_url: string | null
  banner_url: string | null
  is_pro: boolean
  published_at: Date | string
  podcast_id: string
  podcast_name: string
  podcast_cover_url: string | null
  levels: { level: Level; durationSec: number; description: string | null }[]
}

export function toSummary(r: SummaryRow): EpisodeSummary {
  return {
    id: r.id,
    podcast: { id: r.podcast_id, name: r.podcast_name, coverUrl: r.podcast_cover_url },
    number: r.number,
    title: r.title,
    coverUrl: r.cover_url,
    bannerUrl: r.banner_url,
    isPro: r.is_pro,
    publishedAt: isoAt(r.published_at),
    levels: r.levels.map((l) => ({
      level: l.level,
      durationSec: Number(l.durationSec),
      description: l.description,
    })),
  }
}

export interface EpisodeQuery {
  /** Extra joins (aliases e = episodes, p = podcasts are always there). */
  join?: SQL
  /** Extra conditions, ANDed with "visible". */
  where?: SQL
  orderBy: SQL
  limit: number
  offset?: number
}

type PodcastRow = { id: string; slug: string; name: string; cover_url: string | null; episode_count: number }
const toPodcast = (r: PodcastRow): PodcastSummary => ({
  id: r.id,
  slug: r.slug,
  name: r.name,
  coverUrl: r.cover_url,
  episodeCount: r.episode_count,
})

const PODCAST_COLUMNS = sql`
  p.id, p.slug, p.name, p.cover_url,
  (SELECT count(*)::int FROM app.episodes e
   WHERE e.podcast_id = p.id AND e.published_at IS NOT NULL AND e.published_at <= now()) AS episode_count`

/**
 * The read side of the catalog, shared by every public list (home, feeds, podcasts, lists, search) and the
 * personal ones (progress, favorites, follows): one EpisodeSummary query, one PodcastSummary query.
 */
@Injectable()
export class CatalogRepository {
  constructor(@Inject(DRIZZLE) private readonly db: Database) {}

  async episodes(q: EpisodeQuery): Promise<EpisodeSummary[]> {
    const res = await this.db.execute<SummaryRow>(sql`
      SELECT ${SUMMARY_COLUMNS}
      FROM app.episodes e JOIN app.podcasts p ON p.id = e.podcast_id ${q.join ?? sql``}
      WHERE ${EPISODE_VISIBLE} ${q.where ? sql`AND ${q.where}` : sql``}
      ORDER BY ${q.orderBy}
      LIMIT ${q.limit} OFFSET ${q.offset ?? 0}
    `)
    return res.rows.map(toSummary)
  }

  async countEpisodes(q: Pick<EpisodeQuery, "join" | "where">): Promise<number> {
    const res = await this.db.execute<{ n: number }>(sql`
      SELECT count(*)::int AS n
      FROM app.episodes e JOIN app.podcasts p ON p.id = e.podcast_id ${q.join ?? sql``}
      WHERE ${EPISODE_VISIBLE} ${q.where ? sql`AND ${q.where}` : sql``}
    `)
    return res.rows[0]?.n ?? 0
  }

  /** Visible episodes in the order of `ids` (unknown or hidden ids are skipped). */
  async episodesByIds(ids: string[]): Promise<EpisodeSummary[]> {
    if (!ids.length) return []
    const arr = sql`${`{${ids.join(",")}}`}::uuid[]`
    return this.episodes({
      where: sql`e.id = ANY(${arr})`,
      orderBy: sql`array_position(${arr}, e.id)`,
      limit: ids.length,
    })
  }

  async podcasts(q: {
    join?: SQL
    where?: SQL
    orderBy: SQL
    limit: number
    offset?: number
  }): Promise<PodcastSummary[]> {
    const res = await this.db.execute<PodcastRow>(sql`
      SELECT ${PODCAST_COLUMNS}
      FROM app.podcasts p ${q.join ?? sql``}
      WHERE ${PODCAST_VISIBLE} ${q.where ? sql`AND ${q.where}` : sql``}
      ORDER BY ${q.orderBy}
      LIMIT ${q.limit} OFFSET ${q.offset ?? 0}
    `)
    return res.rows.map(toPodcast)
  }

  async countPodcasts(q: { join?: SQL; where?: SQL }): Promise<number> {
    const res = await this.db.execute<{ n: number }>(sql`
      SELECT count(*)::int AS n FROM app.podcasts p ${q.join ?? sql``}
      WHERE ${PODCAST_VISIBLE} ${q.where ? sql`AND ${q.where}` : sql``}
    `)
    return res.rows[0]?.n ?? 0
  }

  /** Newest episode first among podcasts, then by name: what browsing shows first. */
  static readonly PODCAST_ORDER = sql`(SELECT max(e.published_at) FROM app.episodes e
    WHERE e.podcast_id = p.id AND e.published_at IS NOT NULL AND e.published_at <= now()) DESC NULLS LAST, p.name`

  async categories(): Promise<Category[]> {
    const res = await this.db.execute<{
      id: string
      slug: string
      name: string
      description: string | null
      cover_url: string | null
      podcast_count: number
    }>(sql`
      SELECT c.id, c.slug, c.name, c.description, c.cover_url,
             (SELECT count(*)::int FROM app.podcast_categories pc JOIN app.podcasts p ON p.id = pc.podcast_id
              WHERE pc.category_id = c.id AND ${PODCAST_VISIBLE}) AS podcast_count
      FROM app.categories c
      ORDER BY c.position, c.name
    `)
    return res.rows.map((r) => ({
      id: r.id,
      slug: r.slug,
      name: r.name,
      description: r.description,
      coverUrl: r.cover_url,
      podcastCount: r.podcast_count,
    }))
  }

  async podcastCategories(podcastId: string): Promise<CategoryRef[]> {
    const res = await this.db.execute<CategoryRef>(sql`
      SELECT c.id, c.slug, c.name FROM app.podcast_categories pc JOIN app.categories c ON c.id = pc.category_id
      WHERE pc.podcast_id = ${podcastId} ORDER BY pc.position, c.position, c.name
    `)
    return res.rows
  }

  /** A UUID as it is (callers 404 on a miss), a legacy Strapi documentId through its mapping; null = unknown. */
  async episodeIdOf(ref: string): Promise<string | null> {
    if (isUuid(ref)) return ref.toLowerCase()
    const res = await this.db.execute<{ id: string }>(
      sql`SELECT id FROM app.episodes WHERE legacy_document_id = ${ref}`,
    )
    return res.rows[0]?.id ?? null
  }

  async podcastIdOf(ref: string): Promise<string | null> {
    if (isUuid(ref)) return ref.toLowerCase()
    const res = await this.db.execute<{ id: string }>(
      sql`SELECT id FROM app.podcasts WHERE legacy_document_id = ${ref}`,
    )
    return res.rows[0]?.id ?? null
  }
}
