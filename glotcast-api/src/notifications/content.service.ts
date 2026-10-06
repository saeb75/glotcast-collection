import { Inject, Injectable, Logger } from "@nestjs/common"
import { sql } from "drizzle-orm"
import { DRIZZLE, type Database } from "../database/database.module"
import { type MessageKey, type Params, render, variantCount } from "./copy"
import { localeOf } from "./locales"
import { payloadHash, type PushLink, pushData } from "./payload"
import { type PlannedSend } from "./planner.service"
import { inQuietHours, MAX_PUSHES_PER_DAY, variantIndex } from "./rules"
import { type NewSend, SendsRepository } from "./sends.repository"
import { NotificationSettingsService } from "./settings.service"
import { type AutomationSettings } from "./settings"
import { type Executor, onlyUsers, ts } from "./sql"

/** An episode that went live longer ago than this is never announced (backdated, migrated, or missed). */
const LIVE_GUARD_HOURS = 48
/** An episode is announced to a follower once: never again within this many days. */
const ANNOUNCED_DAYS = 3

type Fresh = { id: string; title: string; podcastId: string; podcast: string; cover: string | null }
type Row = {
  user_id: string
  timezone: string
  ui_language: string | null
  local_date: string
  local_minute: number
  episodes: Fresh[]
  sent_today: number
  content_today: boolean
}

/**
 * New episodes for the podcasts' followers. `markLive` stamps `followers_notified_at` on episodes that just went
 * live (published, or a scheduled date that passed — and their podcast is live too); `plan` then pushes each
 * follower who hasn't started them one bundled push, at most one a day, outside quiet hours and within the caps.
 * Users waiting (quiet hours, capped) are picked up by a later tick while the episodes are still fresh.
 */
@Injectable()
export class ContentService {
  private readonly logger = new Logger(ContentService.name)

  constructor(
    @Inject(DRIZZLE) private readonly pool: Database,
    private readonly settingsService: NotificationSettingsService,
    private readonly sends: SendsRepository,
  ) {}

  /** Episodes live since the last look (at most 48 h ago): stamped once, whatever happens to them later. */
  async markLive(now: Date, db: Executor = this.pool): Promise<string[]> {
    const res = await db.execute<{ id: string }>(sql`
      UPDATE app.episodes e SET followers_notified_at = ${ts(now)}
      FROM app.podcasts p
      WHERE p.id = e.podcast_id AND e.followers_notified_at IS NULL AND e.notify_followers
        AND e.published_at IS NOT NULL AND e.published_at <= ${ts(now)}
        AND e.published_at > ${ts(now)} - ${`${LIVE_GUARD_HOURS} hours`}::interval
        AND p.published_at IS NOT NULL AND p.published_at <= ${ts(now)}
      RETURNING e.id
    `)
    if (res.rows.length) this.logger.log(`${res.rows.length} episodes went live`)
    return res.rows.map((r) => r.id)
  }

  async plan(opts: {
    now: Date
    userIds?: string[]
    db?: Executor
    settings?: AutomationSettings
  }): Promise<PlannedSend[]> {
    const db = opts.db ?? this.pool
    const settings = opts.settings ?? (await this.settingsService.get(db))
    if (!settings.newEpisodes.enabled) return []
    const now = opts.now
    const { freshHours, debounceMin } = settings.newEpisodes
    const res = await db.execute<Row>(sql`
      WITH fresh AS (
        SELECT e.id, e.title, e.podcast_id, p.name AS podcast_name, coalesce(e.cover_url, p.cover_url) AS cover,
               e.followers_notified_at
        FROM app.episodes e JOIN app.podcasts p ON p.id = e.podcast_id
        WHERE e.notify_followers
          AND e.followers_notified_at > ${ts(now)} - ${`${freshHours} hours`}::interval
          AND e.followers_notified_at <= ${ts(now)} - ${`${debounceMin} minutes`}::interval
          AND e.published_at <= ${ts(now)} AND p.published_at <= ${ts(now)}
      ), pairs AS (
        SELECT u.id AS user_id, f.*
        FROM fresh f
        JOIN app.follows fo ON fo.podcast_id = f.podcast_id
        JOIN app.users u ON u.id = fo.user_id
        WHERE u.push_enabled AND u.notify_new_episodes AND u.timezone IS NOT NULL
          ${onlyUsers(sql`u.id`, opts.userIds)}
          AND NOT EXISTS (SELECT 1 FROM app.listening_progress lp WHERE lp.user_id = u.id AND lp.episode_id = f.id)
          AND NOT EXISTS (
            SELECT 1 FROM app.notification_sends s
            WHERE s.user_id = u.id AND s.due_at > ${ts(now)} - ${`${ANNOUNCED_DAYS} days`}::interval
              AND f.id = ANY(s.episode_ids) AND s.status NOT IN ('skipped', 'canceled', 'expired'))
      )
      SELECT u.id AS user_id, u.timezone, u.ui_language, l.local_date::text AS local_date, l.local_minute,
             json_agg(json_build_object('id', pr.id, 'title', pr.title, 'podcastId', pr.podcast_id,
                                        'podcast', pr.podcast_name, 'cover', pr.cover)
                      ORDER BY pr.followers_notified_at DESC, pr.id) AS episodes,
             st.sent_today, st.content_today
      FROM pairs pr
      JOIN app.users u ON u.id = pr.user_id
      CROSS JOIN LATERAL (
        SELECT (${ts(now)} AT TIME ZONE u.timezone)::date AS local_date,
               (extract(hour FROM ${ts(now)} AT TIME ZONE u.timezone) * 60
                + extract(minute FROM ${ts(now)} AT TIME ZONE u.timezone))::int AS local_minute
      ) l
      CROSS JOIN LATERAL (
        SELECT count(*) FILTER (WHERE s.status IN ('queued', 'sending', 'sent'))::int AS sent_today,
               coalesce(bool_or(s.kind = 'new_episodes'), false) AS content_today
        FROM app.notification_sends s
        WHERE s.user_id = u.id AND s.local_date = l.local_date AND s.grp <> 'test'
      ) st
      GROUP BY u.id, u.timezone, u.ui_language, l.local_date, l.local_minute, st.sent_today, st.content_today
    `)
    const rows: NewSend[] = []
    const out: Omit<PlannedSend, "inserted">[] = []
    for (const r of res.rows) {
      // Waiting, not skipped: a later tick sends it while the episodes are fresh.
      if (r.content_today || r.sent_today >= MAX_PUSHES_PER_DAY) continue
      if (inQuietHours(r.local_minute, settings.quietHours)) continue
      const { key, params, link, imageUrl } = this.message(r.episodes)
      const language = localeOf(r.ui_language)
      const text = render(language, key, variantIndex(r.user_id, r.local_date, variantCount(key)), params)
      const data = pushData(link, "content", "new_episodes")
      const send: NewSend = {
        userId: r.user_id,
        kind: "new_episodes",
        grp: "content",
        dailySlot: false,
        campaignId: null,
        localDate: r.local_date,
        dueAt: now,
        status: "queued",
        skipReason: null,
        language,
        variant: text.variant,
        title: text.title,
        body: text.body,
        data,
        imageUrl,
        payloadHash: payloadHash({ language, title: text.title, body: text.body, data, imageUrl }),
        episodeIds: r.episodes.map((e) => e.id),
        createdAt: now,
      }
      rows.push(send)
      out.push({ ...send, timezone: r.timezone, status: "queued" })
    }
    const inserted = await this.sends.insert(db, rows)
    if (inserted.size) this.logger.log(`planned ${inserted.size} new-episode pushes`)
    return out.map((p, i) => ({ ...p, inserted: inserted.has(i) }))
  }

  /** One episode: its page and cover. Several from one podcast: the podcast. From several: home. */
  private message(episodes: Fresh[]): {
    key: MessageKey
    params: Params
    link: PushLink
    imageUrl: string | null
  } {
    const first = episodes[0]!
    if (episodes.length === 1)
      return {
        key: "newEpisodeFollowed",
        params: { title: first.title, podcast: first.podcast },
        link: { type: "episode", id: first.id },
        imageUrl: first.cover,
      }
    const podcasts = new Set(episodes.map((e) => e.podcastId))
    if (podcasts.size === 1)
      return {
        key: "newEpisodesPodcast",
        params: { count: episodes.length, podcast: first.podcast },
        link: { type: "podcast", id: first.podcastId },
        imageUrl: null,
      }
    return {
      key: "newEpisodesMixed",
      params: { count: episodes.length },
      link: { type: "home" },
      imageUrl: null,
    }
  }
}
