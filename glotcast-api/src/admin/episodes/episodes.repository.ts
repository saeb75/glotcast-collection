import { Inject, Injectable } from "@nestjs/common"
import { type SQL, sql } from "drizzle-orm"
import { containsPattern, iso, isoAt, type Stamp } from "../../common/rows"
import { DRIZZLE, type Database } from "../../database/database.module"
import { type Level, type TranscriptChunk } from "../../database/schema/app"
import { publishStatus } from "../common/status"
import { type AdminEpisode, type AdminEpisodeDetail } from "./episodes.dto"

type LevelRow = {
  level: Level
  audioUrl: string
  durationSec: number
  description: string | null
  chunkCount: number
  hasWordTimings: boolean
  updatedAt: string
}

type Row = {
  id: string
  number: number | null
  title: string
  description: string | null
  cover_url: string | null
  banner_url: string | null
  is_pro: boolean
  published_at: Stamp
  legacy_document_id: string | null
  created_at: Date | string
  updated_at: Date | string
  podcast_id: string
  podcast_name: string
  levels: LevelRow[]
}

const SELECT = sql`
  SELECT e.id, e.number, e.title, e.description, e.cover_url, e.banner_url, e.is_pro, e.published_at,
         e.legacy_document_id, e.created_at, e.updated_at, p.id AS podcast_id, p.name AS podcast_name,
         coalesce((
           SELECT json_agg(json_build_object(
                    'level', l.level, 'audioUrl', l.audio_url, 'durationSec', l.duration_sec,
                    'description', l.description,
                    'chunkCount', jsonb_array_length(coalesce(l.transcript->'chunks', '[]'::jsonb)),
                    'hasWordTimings', jsonb_path_exists(l.transcript, '$.chunks[*].words'),
                    'updatedAt', l.updated_at) ORDER BY l.level)
           FROM app.episode_levels l WHERE l.episode_id = e.id
         ), '[]'::json) AS levels
  FROM app.episodes e JOIN app.podcasts p ON p.id = e.podcast_id`

const toEpisode = (r: Row): AdminEpisode => ({
  id: r.id,
  podcast: { id: r.podcast_id, name: r.podcast_name },
  number: r.number,
  title: r.title,
  description: r.description,
  coverUrl: r.cover_url,
  bannerUrl: r.banner_url,
  isPro: r.is_pro,
  status: publishStatus(r.published_at),
  publishedAt: iso(r.published_at),
  legacyDocumentId: r.legacy_document_id,
  levels: r.levels.map((l) => ({ ...l, durationSec: Number(l.durationSec), updatedAt: isoAt(l.updatedAt) })),
  createdAt: isoAt(r.created_at),
  updatedAt: isoAt(r.updated_at),
})

export interface EpisodeFilter {
  q?: string
  podcastId?: string
  status?: "published" | "draft"
}

@Injectable()
export class AdminEpisodesRepository {
  constructor(@Inject(DRIZZLE) private readonly db: Database) {}

  private where(f: EpisodeFilter): SQL {
    const parts: SQL[] = []
    if (f.q) parts.push(sql`app.search_text(e.title) LIKE app.search_text(${containsPattern(f.q)})`)
    if (f.podcastId) parts.push(sql`e.podcast_id = ${f.podcastId}`)
    if (f.status === "published") parts.push(sql`e.published_at IS NOT NULL AND e.published_at <= now()`)
    if (f.status === "draft") parts.push(sql`(e.published_at IS NULL OR e.published_at > now())`)
    return parts.length ? sql`WHERE ${sql.join(parts, sql` AND `)}` : sql``
  }

  async page(f: EpisodeFilter & { limit: number; offset: number }) {
    const where = this.where(f)
    const [rows, total] = await Promise.all([
      this.db.execute<Row>(sql`
        ${SELECT} ${where}
        ORDER BY coalesce(e.published_at, e.created_at) DESC, e.id LIMIT ${f.limit} OFFSET ${f.offset}
      `),
      this.db.execute<{ n: number }>(sql`SELECT count(*)::int AS n FROM app.episodes e ${where}`),
    ])
    return { items: rows.rows.map(toEpisode), total: total.rows[0]?.n ?? 0 }
  }

  async get(id: string): Promise<AdminEpisode | null> {
    const res = await this.db.execute<Row>(sql`${SELECT} WHERE e.id = ${id}`)
    return res.rows[0] ? toEpisode(res.rows[0]) : null
  }

  async detail(id: string): Promise<AdminEpisodeDetail | null> {
    const episode = await this.get(id)
    if (!episode) return null
    const res = await this.db.execute<{ level: Level; transcript: { chunks?: TranscriptChunk[] } }>(
      sql`SELECT level, transcript FROM app.episode_levels WHERE episode_id = ${id}`,
    )
    const transcripts = new Map(res.rows.map((r) => [r.level, r.transcript.chunks ?? []]))
    return {
      ...episode,
      levels: episode.levels.map((l) => ({ ...l, transcript: { chunks: transcripts.get(l.level) ?? [] } })),
    }
  }
}
