import { Inject, Injectable } from "@nestjs/common"
import { eq, sql } from "drizzle-orm"
import { isoAt } from "../common/rows"
import { DRIZZLE, type Database } from "../database/database.module"
import { type Level, MOTIVATIONS, users } from "../database/schema/app"
import { type DayTotal } from "./streak"
import { type Me, PROFILE_FIELDS, type UpdateMe } from "./me.dto"

type UserRow = {
  id: string
  is_anonymous: boolean
  email: string | null
  name: string | null
  avatar_url: string | null
  native_language: string | null
  ui_language: string | null
  translation_language: string | null
  level: Level
  daily_goal_min: number
  interests: string[]
  motivation: string | null
  reminder_time: string | null
  feature_access: boolean
  timezone: string | null
  push_enabled: boolean
  notify_reminders: boolean
  notify_learning: boolean
  notify_new_episodes: boolean
  notify_news: boolean
  pro_active: boolean
  created_at: Date | string
}

export const toMe = (r: UserRow): Me => ({
  id: r.id,
  isAnonymous: r.is_anonymous,
  email: r.email,
  name: r.name,
  avatarUrl: r.avatar_url,
  nativeLanguage: r.native_language,
  uiLanguage: r.ui_language,
  translationLanguage: r.translation_language,
  level: r.level,
  dailyGoalMin: r.daily_goal_min,
  interests: r.interests,
  motivation: (MOTIVATIONS as readonly string[]).includes(r.motivation ?? "")
    ? (r.motivation as Me["motivation"])
    : null,
  reminderTime: r.reminder_time,
  featureAccess: r.feature_access,
  timezone: r.timezone,
  pushEnabled: r.push_enabled,
  notifyReminders: r.notify_reminders,
  notifyLearning: r.notify_learning,
  notifyNewEpisodes: r.notify_new_episodes,
  notifyNews: r.notify_news,
  proActive: r.pro_active,
  createdAt: isoAt(r.created_at),
})

export const ME_COLUMNS = sql`id, is_anonymous, email, name, avatar_url, native_language, ui_language,
  translation_language, level, daily_goal_min, interests, motivation, reminder_time, feature_access, timezone,
  push_enabled, notify_reminders, notify_learning, notify_new_episodes, notify_news, pro_active, created_at`

/** The caller's own rows: profile, listening days, counts behind the stats. */
@Injectable()
export class MeRepository {
  constructor(@Inject(DRIZZLE) private readonly db: Database) {}

  async me(userId: string): Promise<Me | null> {
    const res = await this.db.execute<UserRow>(sql`SELECT ${ME_COLUMNS} FROM app.users WHERE id = ${userId}`)
    return res.rows[0] ? toMe(res.rows[0]) : null
  }

  /**
   * Keys of UpdateMe are the property names of the users table; undefined values are left out by drizzle. Only a
   * profile field marks the profile as set (claim-guest copies a guest's onboarding into an unset profile);
   * device fields (time zone, push opt-in, Pro seen by the app) never do.
   */
  async update(userId: string, patch: UpdateMe): Promise<void> {
    const profile = PROFILE_FIELDS.some((key) => patch[key] !== undefined)
    await this.db
      .update(users)
      .set({
        ...patch,
        ...(profile ? { profileSetAt: sql`coalesce(${users.profileSetAt}, now())` } : {}),
        ...(patch.pushEnabled !== undefined ? { pushUpdatedAt: sql`now()` } : {}),
        ...(patch.proActive !== undefined ? { proActiveAt: sql`now()` } : {}),
        updatedAt: sql`now()`,
      })
      .where(eq(users.id, userId))
  }

  /** The newest send of the last 3 days with this ref (`PushData.ref`) was opened; nothing when there is none. */
  async opened(userId: string, ref: string): Promise<void> {
    await this.db.execute(sql`
      UPDATE app.notification_sends SET opened_at = coalesce(opened_at, now())
      WHERE id = (
        SELECT id FROM app.notification_sends
        WHERE user_id = ${userId} AND data->>'ref' = ${ref} AND created_at > now() - interval '3 days'
          AND status IN ('sent', 'sending')
        ORDER BY created_at DESC, id DESC LIMIT 1
      )
    `)
  }

  async days(userId: string): Promise<DayTotal[]> {
    const res = await this.db.execute<{ date: string; seconds: number }>(
      sql`SELECT date::text AS date, seconds FROM app.listening_days WHERE user_id = ${userId} ORDER BY date`,
    )
    return res.rows.map((r) => ({ date: r.date, seconds: Number(r.seconds) }))
  }

  async counts(userId: string): Promise<{
    dailyGoalMin: number
    episodesCompleted: number
    wordsTotal: number
    wordsMastered: number
    wordsDue: number
  }> {
    const res = await this.db.execute<{
      daily_goal_min: number
      episodes_completed: number
      words_total: number
      words_mastered: number
      words_due: number
    }>(sql`
      SELECT u.daily_goal_min,
             (SELECT count(DISTINCT episode_id)::int FROM app.listening_progress
              WHERE user_id = u.id AND completed_at IS NOT NULL) AS episodes_completed,
             w.total AS words_total, w.mastered AS words_mastered, w.due AS words_due
      FROM app.users u,
           LATERAL (SELECT count(*)::int AS total, count(*) FILTER (WHERE box = 5)::int AS mastered,
                           count(*) FILTER (WHERE next_review_at <= now())::int AS due
                    FROM app.words WHERE user_id = u.id) w
      WHERE u.id = ${userId}
    `)
    const r = res.rows[0]
    return {
      dailyGoalMin: r?.daily_goal_min ?? 10,
      episodesCompleted: r?.episodes_completed ?? 0,
      wordsTotal: r?.words_total ?? 0,
      wordsMastered: r?.words_mastered ?? 0,
      wordsDue: r?.words_due ?? 0,
    }
  }
}
