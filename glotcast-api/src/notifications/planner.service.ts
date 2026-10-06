import { Inject, Injectable, Logger } from "@nestjs/common"
import { sql } from "drizzle-orm"
import { addDays } from "../common/dates"
import { DRIZZLE, type Database } from "../database/database.module"
import { type Level } from "../database/schema/app"
import { type DayTotal, streaks } from "../me/streak"
import { render, variantCount } from "./copy"
import { chunk } from "./limit"
import { localeOf } from "./locales"
import { GROUP_OF, payloadHash, pushData } from "./payload"
import { type DailyKind, decide, type Facts, hm, variantIndex } from "./rules"
import { type NewSend, SendsRepository } from "./sends.repository"
import { NotificationSettingsService } from "./settings.service"
import { type AutomationSettings } from "./settings"
import { type Executor, onlyUsers, ts, uuidArray } from "./sql"

/** What a planning step decided for one user (the dry run prints these). */
export interface PlannedSend {
  userId: string
  timezone: string
  kind: string
  localDate: string
  dueAt: Date
  status: "queued" | "skipped"
  skipReason: string | null
  language: string
  variant: string | null
  title: string
  body: string
  /** False when a unique index dropped it (already planned, or the day's slot was taken). */
  inserted: boolean
}

export interface PlanWindow {
  /** Slots after `from` and up to `to` are planned. */
  from: Date
  to: Date
  /** "Now" for every fact (words due, recent listening…); a dry run passes the time it simulates. */
  now: Date
  userIds?: string[]
  db?: Executor
  settings?: AutomationSettings
}

type Candidate = {
  user_id: string
  timezone: string
  ui_language: string | null
  reminder_time: string | null
  notify_reminders: boolean
  kind: DailyKind
  hm: string
  local_date: string
  due_at: Date | string
}

type FactRow = {
  i: number
  level: Level
  daily_goal_min: number
  today_sec: number | null
  week_sec: number | null
  words_due: number
  active: boolean
  c_episode_id: string | null
  c_title: string | null
  c_cover: string | null
  c_level: Level | null
  c_position: number | null
  c_duration: number | null
  c_idle_hours: number | null
  n_episode_id: string | null
  n_title: string | null
  n_cover: string | null
  sent_today: number
  slot_used: boolean
}

const KIND_ORDER: Record<DailyKind, number> = { reminder: 1, learning: 2, streak_saver: 3 }
const FACTS_PER_QUERY = 500
/** How far back a streak is counted. */
const STREAK_HISTORY_DAYS = 400

/**
 * The daily habit and learning pushes. Each user's slots (their reminder time; the learning and streak-saver
 * times) are local times: a slot is due when `(local date + time) AT TIME ZONE tz` falls in the window, checked
 * for the local dates at both ends of the window — so midnight and DST transitions plan each slot once. One facts
 * query per batch of candidates, then `decide()` and the copy; rows (sends and skips) go to the outbox.
 */
@Injectable()
export class PlannerService {
  private readonly logger = new Logger(PlannerService.name)

  constructor(
    @Inject(DRIZZLE) private readonly pool: Database,
    private readonly settingsService: NotificationSettingsService,
    private readonly sends: SendsRepository,
  ) {}

  async plan(w: PlanWindow): Promise<PlannedSend[]> {
    const db = w.db ?? this.pool
    const settings = w.settings ?? (await this.settingsService.get(db))
    const slots: [DailyKind, ReturnType<typeof sql>][] = []
    if (settings.reminder.enabled)
      slots.push(["reminder", sql`CASE WHEN u.notify_reminders THEN u.reminder_time END`])
    if (settings.learning.enabled)
      slots.push([
        "learning",
        sql`CASE WHEN u.notify_learning AND (u.reminder_time IS NULL OR NOT u.notify_reminders)
                 THEN ${settings.learning.time}::text END`,
      ])
    if (settings.streakSaver.enabled)
      slots.push([
        "streak_saver",
        sql`CASE WHEN u.notify_reminders THEN ${settings.streakSaver.time}::text END`,
      ])
    if (!slots.length || w.to <= w.from) return []

    const values = sql.join(
      slots.map(([kind, hmExpr]) => sql`(${kind}::text, ${hmExpr})`),
      sql`, `,
    )
    const res = await db.execute<Candidate>(sql`
      SELECT u.id AS user_id, u.timezone, u.ui_language, u.reminder_time, u.notify_reminders,
             k.kind, k.hm, d.local_date::text AS local_date, slot.due_at
      FROM app.users u
      CROSS JOIN LATERAL (VALUES ${values}) k(kind, hm)
      CROSS JOIN LATERAL (
        SELECT DISTINCT x::date AS local_date
        FROM unnest(ARRAY[(${ts(w.from)} AT TIME ZONE u.timezone)::date, (${ts(w.to)} AT TIME ZONE u.timezone)::date]) x
      ) d
      CROSS JOIN LATERAL (SELECT ((d.local_date + k.hm::time) AT TIME ZONE u.timezone) AS due_at) slot
      WHERE u.push_enabled AND u.timezone IS NOT NULL AND k.hm IS NOT NULL
        AND slot.due_at > ${ts(w.from)} AND slot.due_at <= ${ts(w.to)}
        ${onlyUsers(sql`u.id`, w.userIds)}
        AND NOT EXISTS (
          SELECT 1 FROM app.notification_sends s
          WHERE s.user_id = u.id AND s.kind = k.kind AND s.local_date = d.local_date
            AND s.campaign_id IS NULL AND s.grp <> 'test')
    `)
    const candidates = res.rows.sort(
      (a, b) => KIND_ORDER[a.kind] - KIND_ORDER[b.kind] || a.user_id.localeCompare(b.user_id),
    )
    const planned: PlannedSend[] = []
    for (const part of chunk(candidates, FACTS_PER_QUERY))
      planned.push(...(await this.planPart(db, part, w, settings)))
    if (planned.length)
      this.logger.log(
        `planned ${planned.filter((p) => p.status === "queued" && p.inserted).length} pushes, ` +
          `${planned.filter((p) => p.status === "skipped").length} skips`,
      )
    return planned
  }

  private async planPart(
    db: Executor,
    candidates: Candidate[],
    w: PlanWindow,
    settings: AutomationSettings,
  ): Promise<PlannedSend[]> {
    const now = w.now
    const input = JSON.stringify(
      candidates.map((c, i) => ({ i, user_id: c.user_id, local_date: c.local_date })),
    )
    const facts = await db.execute<FactRow>(sql`
      WITH c AS (SELECT * FROM jsonb_to_recordset(${input}::jsonb) AS x(i int, user_id uuid, local_date date))
      SELECT c.i, u.level, u.daily_goal_min, td.seconds AS today_sec, wk.seconds AS week_sec, wd.n AS words_due,
             act.active,
             cont.episode_id AS c_episode_id, cont.title AS c_title, cont.cover AS c_cover, cont.level AS c_level,
             cont.position_sec AS c_position, cont.duration_sec AS c_duration,
             extract(epoch FROM ${ts(now)} - cont.updated_at) / 3600 AS c_idle_hours,
             ne.id AS n_episode_id, ne.title AS n_title, ne.cover AS n_cover,
             st.total AS sent_today, st.slot_used
      FROM c JOIN app.users u ON u.id = c.user_id
      LEFT JOIN LATERAL (
        SELECT seconds FROM app.listening_days WHERE user_id = u.id AND date = c.local_date
      ) td ON true
      LEFT JOIN LATERAL (
        SELECT sum(seconds) AS seconds FROM app.listening_days
        WHERE user_id = u.id AND date > c.local_date - 7 AND date <= c.local_date
      ) wk ON true
      CROSS JOIN LATERAL (
        SELECT count(*)::int AS n FROM app.words WHERE user_id = u.id AND next_review_at <= ${ts(now)}
      ) wd
      CROSS JOIN LATERAL (
        SELECT EXISTS (
          SELECT 1 FROM app.listening_progress
          WHERE user_id = u.id AND updated_at > ${ts(now)} - interval '30 minutes' AND updated_at <= ${ts(now)}
        ) AS active
      ) act
      LEFT JOIN LATERAL (
        SELECT lp.episode_id, lp.level, lp.position_sec, lp.duration_sec, lp.updated_at, e.title,
               coalesce(e.cover_url, p.cover_url) AS cover
        FROM app.listening_progress lp
        JOIN app.episodes e ON e.id = lp.episode_id JOIN app.podcasts p ON p.id = e.podcast_id
        WHERE lp.user_id = u.id AND lp.completed_at IS NULL AND lp.position_sec >= 30
          AND lp.duration_sec > lp.position_sec
          AND lp.updated_at > ${ts(now)} - interval '14 days' AND lp.updated_at <= ${ts(now)}
          AND e.published_at <= ${ts(now)} AND p.published_at <= ${ts(now)}
        ORDER BY lp.updated_at DESC LIMIT 1
      ) cont ON true
      LEFT JOIN LATERAL (
        SELECT e.id, e.title, coalesce(e.cover_url, p.cover_url) AS cover
        FROM app.episodes e JOIN app.podcasts p ON p.id = e.podcast_id
        WHERE e.published_at <= ${ts(now)} AND e.published_at > ${ts(now)} - interval '3 days'
          AND p.published_at <= ${ts(now)}
          AND EXISTS (SELECT 1 FROM app.episode_levels l
                      WHERE l.episode_id = e.id AND l.level = u.level AND l.audio_url <> '')
          AND NOT EXISTS (SELECT 1 FROM app.listening_progress lp WHERE lp.user_id = u.id AND lp.episode_id = e.id)
          AND NOT EXISTS (SELECT 1 FROM app.notification_sends s
                          WHERE s.user_id = u.id AND s.due_at > ${ts(now)} - interval '3 days'
                            AND e.id = ANY(s.episode_ids) AND s.status <> 'skipped')
        ORDER BY e.published_at DESC, e.id LIMIT 1
      ) ne ON true
      CROSS JOIN LATERAL (
        SELECT count(*) FILTER (WHERE status IN ('queued', 'sending', 'sent'))::int AS total,
               coalesce(bool_or(daily_slot), false) AS slot_used
        FROM app.notification_sends
        WHERE user_id = u.id AND local_date = c.local_date AND grp <> 'test'
      ) st
    `)
    const byIndex = new Map(facts.rows.map((f) => [Number(f.i), f]))
    const history = await this.streakHistory(db, candidates)

    const rows: NewSend[] = []
    const out: Omit<PlannedSend, "inserted">[] = []
    const reminderOn = settings.reminder.enabled
    // Within this batch: a user's daily slot taken by an earlier row (the database enforces it too).
    const slotTaken = new Set<string>()
    candidates.forEach((c, i) => {
      const f = byIndex.get(i)
      if (!f) return
      const dueAt = new Date(c.due_at)
      const key = `${c.user_id}|${c.local_date}`
      const fact: Facts = {
        userId: c.user_id,
        localDate: c.local_date,
        weekday: new Date(`${c.local_date}T00:00:00Z`).getUTCDay(),
        slotMinute: hm(c.hm),
        reminderMinute: reminderOn && c.notify_reminders && c.reminder_time ? hm(c.reminder_time) : null,
        todaySec: Number(f.today_sec ?? 0),
        goalSec: f.daily_goal_min * 60,
        weekSec: Number(f.week_sec ?? 0),
        streakDays: streaks(history.get(c.user_id) ?? [], c.local_date).streakDays,
        wordsDue: f.words_due,
        activeNow: f.active,
        continueItem:
          f.c_episode_id && f.c_level
            ? {
                episodeId: f.c_episode_id,
                title: f.c_title ?? "",
                coverUrl: f.c_cover,
                level: f.c_level,
                positionSec: Number(f.c_position ?? 0),
                durationSec: Number(f.c_duration ?? 0),
                idleHours: Number(f.c_idle_hours ?? 0),
              }
            : null,
        newEpisode: f.n_episode_id
          ? { episodeId: f.n_episode_id, title: f.n_title ?? "", coverUrl: f.n_cover, level: f.level }
          : null,
        sentToday: f.sent_today,
        dailySlotUsed: f.slot_used || slotTaken.has(key),
      }
      const decision = decide(c.kind, fact, settings)
      const language = localeOf(c.ui_language)
      const group = GROUP_OF[c.kind]
      const base = {
        userId: c.user_id,
        kind: c.kind,
        grp: group,
        campaignId: null,
        localDate: c.local_date,
        dueAt,
        language,
        createdAt: now,
      }
      if (!decision.send) {
        rows.push({
          ...base,
          dailySlot: false,
          status: "skipped",
          skipReason: decision.reason,
          variant: null,
          title: "",
          body: "",
          data: {},
          imageUrl: null,
          payloadHash: "",
          episodeIds: [],
        })
        out.push({
          ...base,
          timezone: c.timezone,
          status: "skipped",
          skipReason: decision.reason,
          variant: null,
          title: "",
          body: "",
        })
        return
      }
      const index = variantIndex(c.user_id, c.local_date, variantCount(decision.message))
      const text = render(language, decision.message, index, decision.params)
      const data = pushData(decision.link, group, c.kind)
      slotTaken.add(key)
      rows.push({
        ...base,
        dailySlot: true,
        status: "queued",
        skipReason: null,
        variant: text.variant,
        title: text.title,
        body: text.body,
        data,
        imageUrl: decision.imageUrl,
        payloadHash: payloadHash({
          language,
          title: text.title,
          body: text.body,
          data,
          imageUrl: decision.imageUrl,
        }),
        episodeIds: decision.episodeIds,
      })
      out.push({
        ...base,
        timezone: c.timezone,
        status: "queued",
        skipReason: null,
        variant: text.variant,
        title: text.title,
        body: text.body,
      })
    })
    const inserted = await this.sends.insert(db, rows)
    return out.map((p, i) => ({ ...p, inserted: inserted.has(i) }))
  }

  /** Qualifying listening days (≥ the streak minimum) of the candidates, for `streaks()`. */
  private async streakHistory(db: Executor, candidates: Candidate[]): Promise<Map<string, DayTotal[]>> {
    const ids = [...new Set(candidates.map((c) => c.user_id))]
    const earliest = candidates.reduce(
      (min, c) => (c.local_date < min ? c.local_date : min),
      candidates[0]!.local_date,
    )
    const res = await db.execute<{ user_id: string; date: string; seconds: number }>(sql`
      SELECT user_id, date::text AS date, seconds FROM app.listening_days
      WHERE user_id = ANY(${uuidArray(ids)}) AND seconds >= 60
        AND date >= ${addDays(earliest, -STREAK_HISTORY_DAYS)}::date
    `)
    const out = new Map<string, DayTotal[]>()
    for (const r of res.rows) {
      const list = out.get(r.user_id) ?? []
      list.push({ date: r.date, seconds: Number(r.seconds) })
      out.set(r.user_id, list)
    }
    return out
  }
}
