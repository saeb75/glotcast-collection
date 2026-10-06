import { Inject, Injectable } from "@nestjs/common"
import { type SQL, sql } from "drizzle-orm"
import { type LevelProgress, type ProgressItem } from "../catalog/catalog.dto"
import { EPISODE_VISIBLE, SUMMARY_COLUMNS, type SummaryRow, toSummary } from "../catalog/catalog.repository"
import { isoAt } from "../common/rows"
import { DRIZZLE, type Database } from "../database/database.module"
import { type Level } from "../database/schema/app"

export type ProgressStatus = "in_progress" | "completed" | "all"

type ProgressRow = {
  level: Level
  position_sec: number
  duration_sec: number
  completed_at: Date | string | null
  updated_at: Date | string
}

export const toLevelProgress = (r: ProgressRow): LevelProgress => ({
  level: r.level,
  positionSec: Number(r.position_sec),
  durationSec: Number(r.duration_sec),
  completed: r.completed_at !== null,
  updatedAt: isoAt(r.updated_at),
})

const PROGRESS_COLUMNS = sql`lp.level AS p_level, lp.position_sec AS p_position, lp.duration_sec AS p_duration,
  lp.completed_at AS p_completed_at, lp.updated_at AS p_updated_at`

type ItemRow = SummaryRow & {
  p_level: Level
  p_position: number
  p_duration: number
  p_completed_at: Date | string | null
  p_updated_at: Date | string
}

const toItem = (r: ItemRow): ProgressItem => ({
  episode: toSummary(r),
  ...toLevelProgress({
    level: r.p_level,
    position_sec: r.p_position,
    duration_sec: r.p_duration,
    completed_at: r.p_completed_at,
    updated_at: r.p_updated_at,
  }),
})

const statusFilter = (status: ProgressStatus): SQL =>
  status === "in_progress"
    ? sql`AND lp.completed_at IS NULL`
    : status === "completed"
      ? sql`AND lp.completed_at IS NOT NULL`
      : sql``

/** A user's listening progress, joined to the episodes they can still see. */
@Injectable()
export class ProgressRepository {
  constructor(@Inject(DRIZZLE) private readonly db: Database) {}

  async forEpisode(userId: string, episodeId: string): Promise<LevelProgress[]> {
    const res = await this.db.execute<ProgressRow>(sql`
      SELECT level, position_sec, duration_sec, completed_at, updated_at FROM app.listening_progress
      WHERE user_id = ${userId} AND episode_id = ${episodeId} ORDER BY level
    `)
    return res.rows.map(toLevelProgress)
  }

  /** Per (episode, level), most recent first. */
  async page(userId: string, status: ProgressStatus, limit: number, offset: number): Promise<ProgressItem[]> {
    const res = await this.db.execute<ItemRow>(sql`
      SELECT ${SUMMARY_COLUMNS}, ${PROGRESS_COLUMNS}
      FROM app.listening_progress lp
      JOIN app.episodes e ON e.id = lp.episode_id JOIN app.podcasts p ON p.id = e.podcast_id
      WHERE lp.user_id = ${userId} AND ${EPISODE_VISIBLE} ${statusFilter(status)}
      ORDER BY lp.updated_at DESC, e.id, lp.level
      LIMIT ${limit} OFFSET ${offset}
    `)
    return res.rows.map(toItem)
  }

  async count(userId: string, status: ProgressStatus): Promise<number> {
    const res = await this.db.execute<{ n: number }>(sql`
      SELECT count(*)::int AS n FROM app.listening_progress lp
      JOIN app.episodes e ON e.id = lp.episode_id JOIN app.podcasts p ON p.id = e.podcast_id
      WHERE lp.user_id = ${userId} AND ${EPISODE_VISIBLE} ${statusFilter(status)}
    `)
    return res.rows[0]?.n ?? 0
  }

  /** Home's "continue listening": one item per episode (its latest level), unfinished, most recent first. */
  async continueListening(userId: string, limit: number): Promise<ProgressItem[]> {
    const res = await this.db.execute<ItemRow>(sql`
      SELECT * FROM (
        SELECT DISTINCT ON (lp.episode_id) ${SUMMARY_COLUMNS}, ${PROGRESS_COLUMNS}
        FROM app.listening_progress lp
        JOIN app.episodes e ON e.id = lp.episode_id JOIN app.podcasts p ON p.id = e.podcast_id
        WHERE lp.user_id = ${userId} AND lp.completed_at IS NULL AND ${EPISODE_VISIBLE}
        ORDER BY lp.episode_id, lp.updated_at DESC
      ) x
      ORDER BY p_updated_at DESC
      LIMIT ${limit}
    `)
    return res.rows.map(toItem)
  }
}
