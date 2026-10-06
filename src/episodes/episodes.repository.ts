import { Inject, Injectable } from "@nestjs/common"
import { sql } from "drizzle-orm"
import { EPISODE_VISIBLE, SUMMARY_COLUMNS, type SummaryRow, toSummary } from "../catalog/catalog.repository"
import { type EpisodeSummary } from "../catalog/catalog.dto"
import { DRIZZLE, type Database } from "../database/database.module"
import { type Level, type StoredTranscript } from "../database/schema/app"

export interface PlayableLevel {
  level: Level
  durationSec: number
  description: string | null
  audioUrl: string
}

/** One visible episode with what its page needs. */
@Injectable()
export class EpisodesRepository {
  constructor(@Inject(DRIZZLE) private readonly db: Database) {}

  async visible(id: string): Promise<(EpisodeSummary & { description: string | null }) | null> {
    const res = await this.db.execute<SummaryRow & { description: string | null }>(sql`
      SELECT ${SUMMARY_COLUMNS}, e.description
      FROM app.episodes e JOIN app.podcasts p ON p.id = e.podcast_id
      WHERE e.id = ${id} AND ${EPISODE_VISIBLE}
    `)
    const row = res.rows[0]
    return row ? { ...toSummary(row), description: row.description } : null
  }

  async playableLevels(id: string): Promise<PlayableLevel[]> {
    const res = await this.db.execute<{
      level: Level
      duration_sec: number
      description: string | null
      audio_url: string
    }>(sql`
      SELECT level, duration_sec, description, audio_url FROM app.episode_levels
      WHERE episode_id = ${id} AND audio_url <> '' ORDER BY level
    `)
    return res.rows.map((r) => ({
      level: r.level,
      durationSec: Number(r.duration_sec),
      description: r.description,
      audioUrl: r.audio_url,
    }))
  }

  async isFavorite(userId: string, episodeId: string): Promise<boolean> {
    const res = await this.db.execute(
      sql`SELECT 1 FROM app.favorites WHERE user_id = ${userId} AND episode_id = ${episodeId}`,
    )
    return res.rows.length > 0
  }

  /** A visible episode's transcript for one level; null when the episode or the level is not there. */
  async transcript(id: string, level: Level): Promise<StoredTranscript | null> {
    const res = await this.db.execute<{ transcript: StoredTranscript }>(sql`
      SELECT l.transcript FROM app.episode_levels l
      JOIN app.episodes e ON e.id = l.episode_id JOIN app.podcasts p ON p.id = e.podcast_id
      WHERE l.episode_id = ${id} AND l.level = ${level} AND ${EPISODE_VISIBLE}
    `)
    return res.rows[0]?.transcript ?? null
  }
}
