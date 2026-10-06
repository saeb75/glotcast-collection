import { BadRequestException, Inject, Injectable, NotFoundException } from "@nestjs/common"
import { sql } from "drizzle-orm"
import { type AuthClaims } from "../auth/auth-verifier"
import { CatalogRepository } from "../catalog/catalog.repository"
import { utcToday } from "../common/dates"
import { type PageQuery, offsetOf, toPage } from "../common/pagination"
import { DRIZZLE, type Database } from "../database/database.module"
import { type Level } from "../database/schema/app"
import { UsersService } from "../users/users.service"
import { type Me, type Stats, type UpdateMe } from "./me.dto"
import { MeRepository } from "./me.repository"
import { type ProgressStatus, ProgressRepository, toLevelProgress } from "./progress.repository"
import { milestoneOf } from "../notifications/rules"
import { clampListened, crossesGoal, isCompleted, lastDays, STREAK_MIN_SECONDS, streaks } from "./streak"
import { Timezones } from "./timezones"

export interface Heartbeat {
  episodeId: string
  level: Level
  positionSec: number
  durationSec: number
  listenedSec: number
  date: string
}

@Injectable()
export class MeService {
  constructor(
    @Inject(DRIZZLE) private readonly db: Database,
    private readonly repo: MeRepository,
    private readonly progress: ProgressRepository,
    private readonly catalog: CatalogRepository,
    private readonly users: UsersService,
    private readonly timezones: Timezones,
  ) {}

  async me(userId: string): Promise<Me> {
    const me = await this.repo.me(userId)
    if (!me) throw new NotFoundException("no such user")
    return me
  }

  async update(userId: string, patch: UpdateMe): Promise<Me> {
    if (patch.timezone && !(await this.timezones.isKnown(patch.timezone)))
      throw new BadRequestException(`unknown time zone ${patch.timezone}`)
    if (Object.values(patch).some((v) => v !== undefined)) await this.repo.update(userId, patch)
    return this.me(userId)
  }

  /** A tapped push (`PushData.ref`). */
  notificationOpened(userId: string, ref: string): Promise<void> {
    return this.repo.opened(userId, ref)
  }

  delete(userId: string): Promise<void> {
    return this.users.delete(userId)
  }

  claimGuest(claims: AuthClaims, guestToken: string) {
    return this.users.claimGuest(claims, guestToken)
  }

  async stats(userId: string, date = utcToday()): Promise<Stats> {
    const [days, counts] = await Promise.all([this.repo.days(userId), this.repo.counts(userId)])
    const today = days.find((d) => d.date === date)?.seconds ?? 0
    const dailyGoalSec = counts.dailyGoalMin * 60
    return {
      ...streaks(days, date),
      todaySec: Math.round(today),
      dailyGoalSec,
      goalMetToday: today >= dailyGoalSec,
      totalSec: Math.round(days.reduce((sum, d) => sum + d.seconds, 0)),
      episodesCompleted: counts.episodesCompleted,
      wordsTotal: counts.wordsTotal,
      wordsMastered: counts.wordsMastered,
      wordsDue: counts.wordsDue,
      last7Days: lastDays(days, date, 7),
    }
  }

  /**
   * A player heartbeat: the level's position (completed at 95 %, and completed stays completed) and the seconds
   * listened since the last heartbeat, added to the user's local day.
   */
  async listen(userId: string, beat: Heartbeat) {
    const episodeId = await this.catalog.episodeIdOf(beat.episodeId)
    const found = episodeId
      ? await this.db.execute<{ duration_sec: number | null }>(sql`
          SELECT l.duration_sec FROM app.episodes e
          LEFT JOIN app.episode_levels l ON l.episode_id = e.id AND l.level = ${beat.level}
          WHERE e.id = ${episodeId}`)
      : null
    const episode = found?.rows[0]
    if (!episodeId || !episode) throw new NotFoundException(`episode ${beat.episodeId} not found`)
    const duration = beat.durationSec > 0 ? beat.durationSec : Number(episode.duration_sec ?? 0)
    const position = duration > 0 ? Math.min(beat.positionSec, duration) : beat.positionSec
    const listened = clampListened(beat.listenedSec)
    const completed = isCompleted(position, duration)

    return this.db.transaction(async (tx) => {
      const progress = await tx.execute<{
        level: Level
        position_sec: number
        duration_sec: number
        completed_at: Date | null
        updated_at: Date
      }>(sql`
        INSERT INTO app.listening_progress (user_id, episode_id, level, position_sec, duration_sec, completed_at, updated_at)
        VALUES (${userId}, ${episodeId}, ${beat.level}, ${position}, ${duration}, ${completed ? sql`now()` : sql`NULL`}, now())
        ON CONFLICT (user_id, episode_id, level) DO UPDATE SET
          position_sec = excluded.position_sec,
          duration_sec = excluded.duration_sec,
          completed_at = coalesce(app.listening_progress.completed_at, excluded.completed_at),
          updated_at = now()
        RETURNING level, position_sec, duration_sec, completed_at, updated_at
      `)
      const day = await tx.execute<{ seconds: number; goal: number }>(sql`
        WITH upserted AS (
          INSERT INTO app.listening_days (user_id, date, seconds) VALUES (${userId}, ${beat.date}, ${listened})
          ON CONFLICT (user_id, date) DO UPDATE SET seconds = app.listening_days.seconds + excluded.seconds
          RETURNING seconds
        )
        SELECT upserted.seconds, (SELECT daily_goal_min * 60 FROM app.users WHERE id = ${userId}) AS goal FROM upserted
      `)
      const after = Number(day.rows[0]!.seconds)
      const goal = Number(day.rows[0]!.goal ?? 600)
      // The heartbeat that makes today a streak day: a milestone streak (7, 30, 100, 365) is celebrated in the app.
      let milestone: number | null = null
      if (listened > 0 && crossesGoal(after - listened, after, STREAK_MIN_SECONDS)) {
        const days = await tx.execute<{ date: string; seconds: number }>(sql`
          SELECT date::text AS date, seconds FROM app.listening_days
          WHERE user_id = ${userId} AND seconds >= ${STREAK_MIN_SECONDS} AND date <= ${beat.date}::date
            AND date > ${beat.date}::date - 400
        `)
        const { streakDays } = streaks(
          days.rows.map((d) => ({ date: d.date, seconds: Number(d.seconds) })),
          beat.date,
        )
        milestone = milestoneOf(streakDays)
      }
      return {
        progress: toLevelProgress(progress.rows[0]!),
        today: { date: beat.date, seconds: Math.round(after) },
        goalMetNow: listened > 0 && crossesGoal(after - listened, after, goal),
        milestone,
      }
    })
  }

  async progressPage(userId: string, q: PageQuery & { status: ProgressStatus }) {
    const [items, total] = await Promise.all([
      this.progress.page(userId, q.status, q.pageSize, offsetOf(q)),
      this.progress.count(userId, q.status),
    ])
    return toPage(items, total, q)
  }

  async follows(userId: string, q: PageQuery) {
    const join = sql`JOIN app.follows f ON f.podcast_id = p.id AND f.user_id = ${userId}`
    const [items, total] = await Promise.all([
      this.catalog.podcasts({
        join,
        orderBy: sql`f.created_at DESC, p.name`,
        limit: q.pageSize,
        offset: offsetOf(q),
      }),
      this.catalog.countPodcasts({ join }),
    ])
    return toPage(items, total, q)
  }

  async follow(userId: string, ref: string): Promise<void> {
    const id = await this.catalog.podcastIdOf(ref)
    const [visible] = id
      ? await this.catalog.podcasts({ where: sql`p.id = ${id}`, orderBy: sql`p.id`, limit: 1 })
      : []
    if (!id || !visible) throw new NotFoundException(`podcast ${ref} not found`)
    await this.db.execute(sql`
      INSERT INTO app.follows (user_id, podcast_id) VALUES (${userId}, ${id}) ON CONFLICT DO NOTHING
    `)
  }

  async unfollow(userId: string, ref: string): Promise<void> {
    const id = await this.catalog.podcastIdOf(ref)
    if (id)
      await this.db.execute(sql`DELETE FROM app.follows WHERE user_id = ${userId} AND podcast_id = ${id}`)
  }

  async favorites(userId: string, q: PageQuery) {
    const join = sql`JOIN app.favorites fv ON fv.episode_id = e.id AND fv.user_id = ${userId}`
    const [items, total] = await Promise.all([
      this.catalog.episodes({
        join,
        orderBy: sql`fv.created_at DESC, e.id`,
        limit: q.pageSize,
        offset: offsetOf(q),
      }),
      this.catalog.countEpisodes({ join }),
    ])
    return toPage(items, total, q)
  }

  async favorite(userId: string, ref: string): Promise<void> {
    const id = await this.catalog.episodeIdOf(ref)
    const [visible] = id ? await this.catalog.episodesByIds([id]) : []
    if (!id || !visible) throw new NotFoundException(`episode ${ref} not found`)
    await this.db.execute(sql`
      INSERT INTO app.favorites (user_id, episode_id) VALUES (${userId}, ${id}) ON CONFLICT DO NOTHING
    `)
  }

  async unfavorite(userId: string, ref: string): Promise<void> {
    const id = await this.catalog.episodeIdOf(ref)
    if (id)
      await this.db.execute(sql`DELETE FROM app.favorites WHERE user_id = ${userId} AND episode_id = ${id}`)
  }
}
