/**
 * `app` schema — everything this API owns. In production it lives in the same Supabase Postgres as the legacy
 * Strapi tables (`public`), which this API only ever reads (migrate-strapi, the legacy claim).
 * User ids are Supabase Auth user ids (`sub`); no table references the auth schema directly.
 * RLS is on everywhere with no policies: the API connects as the owner; Supabase's Data API sees nothing.
 */
import { sql } from "drizzle-orm"
import {
  bigserial,
  boolean,
  check,
  date,
  doublePrecision,
  index,
  integer,
  jsonb,
  pgSchema,
  primaryKey,
  real,
  smallint,
  text,
  timestamp,
  uniqueIndex,
  uuid,
} from "drizzle-orm/pg-core"

export const app = pgSchema("app")

/** Episode levels: beginner, intermediate, advanced (this order is the enum's sort order). */
export const LEVELS = ["bg", "in", "ad"] as const
export type Level = (typeof LEVELS)[number]
export const levelEnum = app.enum("level", LEVELS)

export const MOTIVATIONS = ["career", "travel", "exams", "fun", "other"] as const

export interface TranscriptWord {
  text: string
  start: number
  end: number
}
export interface TranscriptChunk {
  text: string
  speaker: string | null
  start: number
  end: number
  words?: TranscriptWord[]
}
export interface StoredTranscript {
  chunks: TranscriptChunk[]
}
export interface WordSource {
  episodeId: string
  level: Level
  chunkIndex: number
}

const at = (name: string) => timestamp(name, { withTimezone: true })

export const users = app
  .table(
    "users",
    {
      id: uuid("id").primaryKey(), // Supabase Auth `sub`
      isAnonymous: boolean("is_anonymous").notNull().default(false),
      email: text("email"),
      name: text("name"),
      avatarUrl: text("avatar_url"),
      nativeLanguage: text("native_language"),
      uiLanguage: text("ui_language"),
      translationLanguage: text("translation_language"),
      level: levelEnum("level").notNull().default("bg"),
      dailyGoalMin: integer("daily_goal_min").notNull().default(10),
      interests: text("interests")
        .array()
        .notNull()
        .default(sql`'{}'::text[]`),
      motivation: text("motivation"),
      reminderTime: text("reminder_time"), // "HH:mm", the user's local time
      featureAccess: boolean("feature_access").notNull().default(false), // backend-granted Pro
      // Push notifications: the device reports its IANA zone and its opt-in; the user switches the groups.
      timezone: text("timezone"),
      pushEnabled: boolean("push_enabled").notNull().default(false),
      pushUpdatedAt: at("push_updated_at"),
      notifyReminders: boolean("notify_reminders").notNull().default(true),
      notifyLearning: boolean("notify_learning").notNull().default(true),
      notifyNewEpisodes: boolean("notify_new_episodes").notNull().default(true),
      notifyNews: boolean("notify_news").notNull().default(true),
      // The app sees an active subscription (RevenueCat): campaign targeting only, never access.
      proActive: boolean("pro_active").notNull().default(false),
      proActiveAt: at("pro_active_at"),
      // First PATCH /v1/me: a claimed guest's onboarding answers replace an account's untouched defaults.
      profileSetAt: at("profile_set_at"),
      // The Strapi up_users row this account's legacy data (follows, words) was copied from.
      legacyStrapiUserId: integer("legacy_strapi_user_id"),
      // When the legacy lookup ran for this account (it runs once, whatever it found).
      legacyCheckedAt: at("legacy_checked_at"),
      createdAt: at("created_at").notNull().defaultNow(),
      updatedAt: at("updated_at").notNull().defaultNow(),
      lastSeenAt: at("last_seen_at").notNull().defaultNow(),
    },
    (t) => [
      index("users_email_idx").on(sql`lower(${t.email})`),
      index("users_created_idx").on(t.createdAt),
      index("users_push_timezone_idx")
        .on(t.timezone)
        .where(sql`${t.pushEnabled}`),
      check(
        "users_motivation",
        sql`${t.motivation} IS NULL OR ${t.motivation} IN ('career', 'travel', 'exams', 'fun', 'other')`,
      ),
      check("users_daily_goal", sql`${t.dailyGoalMin} BETWEEN 1 AND 600`),
      check(
        "users_reminder_time",
        sql`${t.reminderTime} IS NULL OR ${t.reminderTime} ~ '^([01][0-9]|2[0-3]):[0-5][0-9]$'`,
      ),
    ],
  )
  .enableRLS()

export const podcasts = app
  .table(
    "podcasts",
    {
      id: uuid("id").primaryKey().defaultRandom(),
      slug: text("slug").notNull(),
      name: text("name").notNull(),
      description: text("description"),
      coverUrl: text("cover_url"),
      legacyDocumentId: text("legacy_document_id"), // Strapi documentId (old deep links, re-runnable migration)
      publishedAt: at("published_at"), // null = draft
      createdAt: at("created_at").notNull().defaultNow(),
      updatedAt: at("updated_at").notNull().defaultNow(),
    },
    (t) => [
      uniqueIndex("podcasts_slug_key").on(t.slug),
      uniqueIndex("podcasts_legacy_document_id_key").on(t.legacyDocumentId),
    ],
  )
  .enableRLS()

export const categories = app
  .table(
    "categories",
    {
      id: uuid("id").primaryKey().defaultRandom(),
      slug: text("slug").notNull(),
      name: text("name").notNull(),
      description: text("description"),
      coverUrl: text("cover_url"),
      position: integer("position").notNull().default(0),
      legacyDocumentId: text("legacy_document_id"),
      createdAt: at("created_at").notNull().defaultNow(),
      updatedAt: at("updated_at").notNull().defaultNow(),
    },
    (t) => [
      uniqueIndex("categories_slug_key").on(t.slug),
      uniqueIndex("categories_legacy_document_id_key").on(t.legacyDocumentId),
    ],
  )
  .enableRLS()

export const podcastCategories = app
  .table(
    "podcast_categories",
    {
      podcastId: uuid("podcast_id")
        .notNull()
        .references(() => podcasts.id, { onDelete: "cascade" }),
      categoryId: uuid("category_id")
        .notNull()
        .references(() => categories.id, { onDelete: "cascade" }),
      position: integer("position").notNull().default(0),
    },
    (t) => [
      primaryKey({ columns: [t.podcastId, t.categoryId] }),
      index("podcast_categories_category_idx").on(t.categoryId),
    ],
  )
  .enableRLS()

export const episodes = app
  .table(
    "episodes",
    {
      id: uuid("id").primaryKey().defaultRandom(),
      // A podcast with episodes cannot be deleted (delete or move its episodes first).
      podcastId: uuid("podcast_id")
        .notNull()
        .references(() => podcasts.id, { onDelete: "restrict" }),
      number: integer("number"),
      title: text("title").notNull(),
      description: text("description"),
      coverUrl: text("cover_url"),
      bannerUrl: text("banner_url"),
      isPro: boolean("is_pro").notNull().default(true),
      publishedAt: at("published_at"), // null = draft; in the future = scheduled
      legacyDocumentId: text("legacy_document_id"),
      // Push the podcast's followers when it goes live (the admin's "notify followers").
      notifyFollowers: boolean("notify_followers").notNull().default(true),
      // When it was seen live by the scheduler (once; unpublishing never clears it): the followers' push is
      // planned from here. The back catalog has it set to its publish date.
      followersNotifiedAt: at("followers_notified_at"),
      createdAt: at("created_at").notNull().defaultNow(),
      updatedAt: at("updated_at").notNull().defaultNow(),
    },
    (t) => [
      uniqueIndex("episodes_legacy_document_id_key").on(t.legacyDocumentId),
      index("episodes_podcast_number_idx").on(t.podcastId, t.number),
      index("episodes_published_idx").on(t.publishedAt.desc()),
      index("episodes_followers_pending_idx")
        .on(t.publishedAt)
        .where(sql`${t.followersNotifiedAt} IS NULL`),
      index("episodes_followers_notified_idx").on(t.followersNotifiedAt),
    ],
  )
  .enableRLS()

/** One row per level of an episode: its own audio and timed transcript (seconds). */
export const episodeLevels = app
  .table(
    "episode_levels",
    {
      episodeId: uuid("episode_id")
        .notNull()
        .references(() => episodes.id, { onDelete: "cascade" }),
      level: levelEnum("level").notNull(),
      audioUrl: text("audio_url").notNull(),
      durationSec: real("duration_sec").notNull().default(0),
      description: text("description"),
      transcript: jsonb("transcript")
        .$type<StoredTranscript>()
        .notNull()
        .default(sql`'{"chunks": []}'::jsonb`),
      createdAt: at("created_at").notNull().defaultNow(),
      updatedAt: at("updated_at").notNull().defaultNow(),
    },
    (t) => [primaryKey({ columns: [t.episodeId, t.level] })],
  )
  .enableRLS()

export const lists = app
  .table(
    "lists",
    {
      id: uuid("id").primaryKey().defaultRandom(),
      slug: text("slug").notNull(),
      name: text("name").notNull(),
      description: text("description"),
      legacyDocumentId: text("legacy_document_id"),
      createdAt: at("created_at").notNull().defaultNow(),
      updatedAt: at("updated_at").notNull().defaultNow(),
    },
    (t) => [
      uniqueIndex("lists_slug_key").on(t.slug),
      uniqueIndex("lists_legacy_document_id_key").on(t.legacyDocumentId),
    ],
  )
  .enableRLS()

export const listEpisodes = app
  .table(
    "list_episodes",
    {
      listId: uuid("list_id")
        .notNull()
        .references(() => lists.id, { onDelete: "cascade" }),
      episodeId: uuid("episode_id")
        .notNull()
        .references(() => episodes.id, { onDelete: "cascade" }),
      position: integer("position").notNull(),
    },
    (t) => [
      primaryKey({ columns: [t.listId, t.episodeId] }),
      index("list_episodes_order_idx").on(t.listId, t.position),
      index("list_episodes_episode_idx").on(t.episodeId),
    ],
  )
  .enableRLS()

/**
 * The editorial configuration: one row (id = 1) of ordered id arrays. Ids that no longer exist (or are not
 * published) are skipped when read; deleting an episode or a list also removes it here.
 */
export const homeConfig = app
  .table(
    "home_config",
    {
      id: smallint("id").primaryKey().default(1),
      sliderEpisodeIds: uuid("slider_episode_ids")
        .array()
        .notNull()
        .default(sql`'{}'::uuid[]`),
      homeListIds: uuid("home_list_ids")
        .array()
        .notNull()
        .default(sql`'{}'::uuid[]`),
      exploreListIds: uuid("explore_list_ids")
        .array()
        .notNull()
        .default(sql`'{}'::uuid[]`),
      updatedAt: at("updated_at").notNull().defaultNow(),
    },
    (t) => [check("home_config_single_row", sql`${t.id} = 1`)],
  )
  .enableRLS()

export const follows = app
  .table(
    "follows",
    {
      userId: uuid("user_id")
        .notNull()
        .references(() => users.id, { onDelete: "cascade" }),
      podcastId: uuid("podcast_id")
        .notNull()
        .references(() => podcasts.id, { onDelete: "cascade" }),
      createdAt: at("created_at").notNull().defaultNow(),
    },
    (t) => [primaryKey({ columns: [t.userId, t.podcastId] }), index("follows_podcast_idx").on(t.podcastId)],
  )
  .enableRLS()

export const favorites = app
  .table(
    "favorites",
    {
      userId: uuid("user_id")
        .notNull()
        .references(() => users.id, { onDelete: "cascade" }),
      episodeId: uuid("episode_id")
        .notNull()
        .references(() => episodes.id, { onDelete: "cascade" }),
      createdAt: at("created_at").notNull().defaultNow(),
    },
    (t) => [primaryKey({ columns: [t.userId, t.episodeId] }), index("favorites_episode_idx").on(t.episodeId)],
  )
  .enableRLS()

/** Where a user is in each level of an episode (the latest heartbeat). */
export const listeningProgress = app
  .table(
    "listening_progress",
    {
      userId: uuid("user_id")
        .notNull()
        .references(() => users.id, { onDelete: "cascade" }),
      episodeId: uuid("episode_id")
        .notNull()
        .references(() => episodes.id, { onDelete: "cascade" }),
      level: levelEnum("level").notNull(),
      positionSec: real("position_sec").notNull().default(0),
      durationSec: real("duration_sec").notNull().default(0),
      completedAt: at("completed_at"), // set once position ≥ 95 % of the duration; stays set
      updatedAt: at("updated_at").notNull().defaultNow(),
    },
    (t) => [
      primaryKey({ columns: [t.userId, t.episodeId, t.level] }),
      index("listening_progress_user_recent_idx").on(t.userId, t.updatedAt.desc()),
      index("listening_progress_episode_idx").on(t.episodeId),
      index("listening_progress_recent_idx").on(t.updatedAt),
    ],
  )
  .enableRLS()

/** Seconds listened per user per local day (the client's calendar date): streaks, daily goal, charts. */
export const listeningDays = app
  .table(
    "listening_days",
    {
      userId: uuid("user_id")
        .notNull()
        .references(() => users.id, { onDelete: "cascade" }),
      date: date("date", { mode: "string" }).notNull(),
      seconds: doublePrecision("seconds").notNull().default(0),
    },
    (t) => [primaryKey({ columns: [t.userId, t.date] }), index("listening_days_date_idx").on(t.date)],
  )
  .enableRLS()

/** Saved words with their Leitner state (box 1–5, next review after 1/2/4/8/16 days). */
export const words = app
  .table(
    "words",
    {
      id: uuid("id").primaryKey().defaultRandom(),
      userId: uuid("user_id")
        .notNull()
        .references(() => users.id, { onDelete: "cascade" }),
      word: text("word").notNull(),
      meaning: text("meaning").notNull().default(""),
      phonetic: text("phonetic"),
      audioUrl: text("audio_url"),
      detail: jsonb("detail").$type<unknown>(),
      language: text("language").notNull(),
      source: jsonb("source").$type<WordSource>(),
      box: smallint("box").notNull().default(1),
      nextReviewAt: at("next_review_at").notNull().defaultNow(),
      lastReviewedAt: at("last_reviewed_at"),
      correctCount: integer("correct_count").notNull().default(0),
      incorrectCount: integer("incorrect_count").notNull().default(0),
      createdAt: at("created_at").notNull().defaultNow(),
      updatedAt: at("updated_at").notNull().defaultNow(),
    },
    (t) => [
      uniqueIndex("words_user_word_key").on(t.userId, sql`lower(${t.word})`),
      index("words_user_due_idx").on(t.userId, t.nextReviewAt),
      index("words_user_created_idx").on(t.userId, t.createdAt.desc()),
      check("words_box", sql`${t.box} BETWEEN 1 AND 5`),
    ],
  )
  .enableRLS()

/** Machine translations of a level's transcript, index-aligned with its chunks; dropped when it changes. */
export const translations = app
  .table(
    "translations",
    {
      episodeId: uuid("episode_id")
        .notNull()
        .references(() => episodes.id, { onDelete: "cascade" }),
      level: levelEnum("level").notNull(),
      target: text("target").notNull(),
      chunks: jsonb("chunks").$type<string[]>().notNull(),
      createdAt: at("created_at").notNull().defaultNow(),
    },
    (t) => [primaryKey({ columns: [t.episodeId, t.level, t.target] })],
  )
  .enableRLS()

/** AssemblyAI transcriptions started from the admin; the result is kept once it completed. */
export const transcriptionJobs = app
  .table(
    "transcription_jobs",
    {
      id: uuid("id").primaryKey().defaultRandom(),
      providerJobId: text("provider_job_id").notNull(),
      audioUrl: text("audio_url").notNull(),
      status: text("status").notNull().default("queued"), // queued | processing | completed | error
      error: text("error"),
      result: jsonb("result").$type<unknown>(),
      createdBy: uuid("created_by"),
      createdAt: at("created_at").notNull().defaultNow(),
      updatedAt: at("updated_at").notNull().defaultNow(),
    },
    (t) => [index("transcription_jobs_created_idx").on(t.createdAt)],
  )
  .enableRLS()

/**
 * What admins changed: every write under /v1/admin, and role changes from the CLI.
 * Append-only; `actor_*` is null for the CLI. `target_*` names the subject (an episode id, a user id…).
 */
export const adminAudit = app
  .table(
    "admin_audit",
    {
      id: bigserial("id", { mode: "number" }).primaryKey(),
      at: at("at").notNull().defaultNow(),
      actorId: uuid("actor_id"),
      actorEmail: text("actor_email"),
      action: text("action").notNull(), // episode.create | episode.publish | role.grant | …
      targetType: text("target_type"),
      targetId: text("target_id"),
      meta: jsonb("meta").$type<Record<string, unknown>>().notNull().default({}),
    },
    (t) => [
      index("admin_audit_at_idx").on(t.at),
      index("admin_audit_target_idx").on(t.targetType, t.targetId),
    ],
  )
  .enableRLS()

/* ── Push notifications ─────────────────────────────────────────────────────────────────────────────────── */

/** The automations' switches and parameters (src/notifications/settings.ts): one row (id = 1); all start off. */
export const notificationSettings = app
  .table(
    "notification_settings",
    {
      id: smallint("id").primaryKey().default(1),
      automations: jsonb("automations").$type<Record<string, unknown>>().notNull().default({}),
      updatedAt: at("updated_at").notNull().defaultNow(),
      updatedBy: uuid("updated_by"),
    },
    (t) => [check("notification_settings_single_row", sql`${t.id} = 1`)],
  )
  .enableRLS()

/**
 * Named leases for the background jobs (several API instances, one runner). Session advisory locks don't survive
 * Supabase's transaction pooler, so a row is taken with INSERT … ON CONFLICT … WHERE locked_until < now.
 * `watermark` = where the last completed run got to.
 */
export const jobLeases = app
  .table("job_leases", {
    name: text("name").primaryKey(),
    holder: text("holder"),
    lockedUntil: at("locked_until")
      .notNull()
      .default(sql`'-infinity'`),
    watermark: at("watermark"),
    updatedAt: at("updated_at").notNull().defaultNow(),
  })
  .enableRLS()

export const CAMPAIGN_STATUSES = ["draft", "scheduled", "sending", "sent", "canceled", "failed"] as const

/** Admin campaigns: a message per app language, an audience, a link, and when to deliver it. */
export const notificationCampaigns = app
  .table(
    "notification_campaigns",
    {
      id: uuid("id").primaryKey().defaultRandom(),
      name: text("name").notNull(),
      status: text("status").notNull().default("draft"),
      sourceLanguage: text("source_language").notNull().default("en"),
      messages: jsonb("messages")
        .$type<Record<string, { title: string; body: string }>>()
        .notNull()
        .default({}),
      audience: jsonb("audience").$type<Record<string, unknown>>().notNull().default({ segment: "all" }),
      link: jsonb("link").$type<Record<string, unknown>>().notNull().default({ type: "home" }),
      imageUrl: text("image_url"),
      respectQuietHours: boolean("respect_quiet_hours").notNull().default(true),
      delivery: jsonb("delivery").$type<Record<string, unknown>>(),
      // When the campaign is expanded into sends (now / the chosen instant / the first time zone to reach it).
      sendAt: at("send_at"),
      recipients: integer("recipients"),
      sentAt: at("sent_at"),
      createdBy: uuid("created_by"),
      createdByEmail: text("created_by_email"),
      createdAt: at("created_at").notNull().defaultNow(),
      updatedAt: at("updated_at").notNull().defaultNow(),
    },
    (t) => [
      index("notification_campaigns_due_idx")
        .on(t.sendAt)
        .where(sql`${t.status} = 'scheduled'`),
      index("notification_campaigns_created_idx").on(t.createdAt),
      check(
        "notification_campaigns_status",
        sql`${t.status} IN ('draft', 'scheduled', 'sending', 'sent', 'canceled', 'failed')`,
      ),
    ],
  )
  .enableRLS()

/** One OneSignal request: its id is the request's idempotency key (a retry after a crash reuses it). */
export const notificationBatches = app
  .table(
    "notification_batches",
    {
      id: uuid("id").primaryKey().defaultRandom(),
      onesignalId: text("onesignal_id"),
      campaignId: uuid("campaign_id").references(() => notificationCampaigns.id, { onDelete: "cascade" }),
      kind: text("kind").notNull(),
      language: text("language").notNull(),
      recipients: integer("recipients").notNull(),
      status: text("status").notNull().default("pending"), // pending | sent | failed | empty
      error: text("error"),
      attempts: integer("attempts").notNull().default(0),
      stats: jsonb("stats").$type<Record<string, number>>(),
      statsAt: at("stats_at"),
      createdAt: at("created_at").notNull().defaultNow(),
      sentAt: at("sent_at"),
    },
    (t) => [
      index("notification_batches_pending_idx")
        .on(t.createdAt)
        .where(sql`${t.status} = 'pending'`),
      index("notification_batches_campaign_idx").on(t.campaignId),
      index("notification_batches_created_idx").on(t.createdAt),
      check("notification_batches_status", sql`${t.status} IN ('pending', 'sent', 'failed', 'empty')`),
    ],
  )
  .enableRLS()

/**
 * The outbox and the log: one row per user and push (or a decision not to push, `skipped`). Rendered in the
 * user's language when planned; the dispatcher groups identical payloads into OneSignal batches. The unique
 * indexes make a double send impossible: one automation of a kind per user and local day, one daily-slot push
 * (reminder / learning / streak saver) per user and local day, one row per campaign and user.
 */
export const notificationSends = app
  .table(
    "notification_sends",
    {
      id: bigserial("id", { mode: "number" }).primaryKey(),
      userId: uuid("user_id")
        .notNull()
        .references(() => users.id, { onDelete: "cascade" }),
      kind: text("kind").notNull(), // reminder | streak_saver | learning | new_episodes | campaign | test
      grp: text("grp").notNull(), // habit | learning | content | campaign | test
      dailySlot: boolean("daily_slot").notNull().default(false),
      campaignId: uuid("campaign_id").references(() => notificationCampaigns.id, { onDelete: "cascade" }),
      batchId: uuid("batch_id").references(() => notificationBatches.id, { onDelete: "set null" }),
      localDate: date("local_date", { mode: "string" }).notNull(),
      dueAt: at("due_at").notNull(),
      status: text("status").notNull().default("queued"),
      skipReason: text("skip_reason"),
      language: text("language").notNull(),
      variant: text("variant"),
      title: text("title").notNull(),
      body: text("body").notNull(),
      data: jsonb("data").$type<Record<string, unknown>>().notNull(),
      imageUrl: text("image_url"),
      payloadHash: text("payload_hash").notNull(),
      episodeIds: uuid("episode_ids")
        .array()
        .notNull()
        .default(sql`'{}'::uuid[]`),
      createdAt: at("created_at").notNull().defaultNow(),
      sentAt: at("sent_at"),
      openedAt: at("opened_at"),
    },
    (t) => [
      uniqueIndex("notification_sends_automation_key")
        .on(t.userId, t.kind, t.localDate)
        .where(sql`${t.campaignId} IS NULL AND ${t.grp} <> 'test'`),
      uniqueIndex("notification_sends_daily_slot_key")
        .on(t.userId, t.localDate)
        .where(sql`${t.dailySlot}`),
      uniqueIndex("notification_sends_campaign_key")
        .on(t.campaignId, t.userId)
        .where(sql`${t.campaignId} IS NOT NULL`),
      index("notification_sends_queued_idx")
        .on(t.dueAt)
        .where(sql`${t.status} = 'queued'`),
      index("notification_sends_batch_idx")
        .on(t.batchId)
        .where(sql`${t.batchId} IS NOT NULL`),
      index("notification_sends_user_day_idx").on(t.userId, t.localDate),
      index("notification_sends_user_created_idx").on(t.userId, t.createdAt),
      index("notification_sends_created_idx").on(t.createdAt),
      check(
        "notification_sends_status",
        sql`${t.status} IN ('queued', 'sending', 'sent', 'failed', 'unreachable', 'expired', 'canceled', 'skipped')`,
      ),
      check("notification_sends_grp", sql`${t.grp} IN ('habit', 'learning', 'content', 'campaign', 'test')`),
    ],
  )
  .enableRLS()
