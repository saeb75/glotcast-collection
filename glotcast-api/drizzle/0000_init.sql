-- IF NOT EXISTS: drizzle creates the schema first to hold its __drizzle_migrations journal.
CREATE SCHEMA IF NOT EXISTS "app";
--> statement-breakpoint
CREATE TYPE "app"."level" AS ENUM('bg', 'in', 'ad');--> statement-breakpoint
CREATE TABLE "app"."admin_audit" (
	"id" bigserial PRIMARY KEY NOT NULL,
	"at" timestamp with time zone DEFAULT now() NOT NULL,
	"actor_id" uuid,
	"actor_email" text,
	"action" text NOT NULL,
	"target_type" text,
	"target_id" text,
	"meta" jsonb DEFAULT '{}'::jsonb NOT NULL
);
--> statement-breakpoint
ALTER TABLE "app"."admin_audit" ENABLE ROW LEVEL SECURITY;--> statement-breakpoint
CREATE TABLE "app"."categories" (
	"id" uuid PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
	"slug" text NOT NULL,
	"name" text NOT NULL,
	"description" text,
	"cover_url" text,
	"position" integer DEFAULT 0 NOT NULL,
	"legacy_document_id" text,
	"created_at" timestamp with time zone DEFAULT now() NOT NULL,
	"updated_at" timestamp with time zone DEFAULT now() NOT NULL
);
--> statement-breakpoint
ALTER TABLE "app"."categories" ENABLE ROW LEVEL SECURITY;--> statement-breakpoint
CREATE TABLE "app"."episode_levels" (
	"episode_id" uuid NOT NULL,
	"level" "app"."level" NOT NULL,
	"audio_url" text NOT NULL,
	"duration_sec" real DEFAULT 0 NOT NULL,
	"description" text,
	"transcript" jsonb DEFAULT '{"chunks": []}'::jsonb NOT NULL,
	"created_at" timestamp with time zone DEFAULT now() NOT NULL,
	"updated_at" timestamp with time zone DEFAULT now() NOT NULL,
	CONSTRAINT "episode_levels_episode_id_level_pk" PRIMARY KEY("episode_id","level")
);
--> statement-breakpoint
ALTER TABLE "app"."episode_levels" ENABLE ROW LEVEL SECURITY;--> statement-breakpoint
CREATE TABLE "app"."episodes" (
	"id" uuid PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
	"podcast_id" uuid NOT NULL,
	"number" integer,
	"title" text NOT NULL,
	"description" text,
	"cover_url" text,
	"banner_url" text,
	"is_pro" boolean DEFAULT true NOT NULL,
	"published_at" timestamp with time zone,
	"legacy_document_id" text,
	"created_at" timestamp with time zone DEFAULT now() NOT NULL,
	"updated_at" timestamp with time zone DEFAULT now() NOT NULL
);
--> statement-breakpoint
ALTER TABLE "app"."episodes" ENABLE ROW LEVEL SECURITY;--> statement-breakpoint
CREATE TABLE "app"."favorites" (
	"user_id" uuid NOT NULL,
	"episode_id" uuid NOT NULL,
	"created_at" timestamp with time zone DEFAULT now() NOT NULL,
	CONSTRAINT "favorites_user_id_episode_id_pk" PRIMARY KEY("user_id","episode_id")
);
--> statement-breakpoint
ALTER TABLE "app"."favorites" ENABLE ROW LEVEL SECURITY;--> statement-breakpoint
CREATE TABLE "app"."follows" (
	"user_id" uuid NOT NULL,
	"podcast_id" uuid NOT NULL,
	"created_at" timestamp with time zone DEFAULT now() NOT NULL,
	CONSTRAINT "follows_user_id_podcast_id_pk" PRIMARY KEY("user_id","podcast_id")
);
--> statement-breakpoint
ALTER TABLE "app"."follows" ENABLE ROW LEVEL SECURITY;--> statement-breakpoint
CREATE TABLE "app"."home_config" (
	"id" smallint PRIMARY KEY DEFAULT 1 NOT NULL,
	"slider_episode_ids" uuid[] DEFAULT '{}'::uuid[] NOT NULL,
	"home_list_ids" uuid[] DEFAULT '{}'::uuid[] NOT NULL,
	"explore_list_ids" uuid[] DEFAULT '{}'::uuid[] NOT NULL,
	"updated_at" timestamp with time zone DEFAULT now() NOT NULL,
	CONSTRAINT "home_config_single_row" CHECK ("app"."home_config"."id" = 1)
);
--> statement-breakpoint
ALTER TABLE "app"."home_config" ENABLE ROW LEVEL SECURITY;--> statement-breakpoint
CREATE TABLE "app"."list_episodes" (
	"list_id" uuid NOT NULL,
	"episode_id" uuid NOT NULL,
	"position" integer NOT NULL,
	CONSTRAINT "list_episodes_list_id_episode_id_pk" PRIMARY KEY("list_id","episode_id")
);
--> statement-breakpoint
ALTER TABLE "app"."list_episodes" ENABLE ROW LEVEL SECURITY;--> statement-breakpoint
CREATE TABLE "app"."listening_days" (
	"user_id" uuid NOT NULL,
	"date" date NOT NULL,
	"seconds" double precision DEFAULT 0 NOT NULL,
	CONSTRAINT "listening_days_user_id_date_pk" PRIMARY KEY("user_id","date")
);
--> statement-breakpoint
ALTER TABLE "app"."listening_days" ENABLE ROW LEVEL SECURITY;--> statement-breakpoint
CREATE TABLE "app"."listening_progress" (
	"user_id" uuid NOT NULL,
	"episode_id" uuid NOT NULL,
	"level" "app"."level" NOT NULL,
	"position_sec" real DEFAULT 0 NOT NULL,
	"duration_sec" real DEFAULT 0 NOT NULL,
	"completed_at" timestamp with time zone,
	"updated_at" timestamp with time zone DEFAULT now() NOT NULL,
	CONSTRAINT "listening_progress_user_id_episode_id_level_pk" PRIMARY KEY("user_id","episode_id","level")
);
--> statement-breakpoint
ALTER TABLE "app"."listening_progress" ENABLE ROW LEVEL SECURITY;--> statement-breakpoint
CREATE TABLE "app"."lists" (
	"id" uuid PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
	"slug" text NOT NULL,
	"name" text NOT NULL,
	"description" text,
	"legacy_document_id" text,
	"created_at" timestamp with time zone DEFAULT now() NOT NULL,
	"updated_at" timestamp with time zone DEFAULT now() NOT NULL
);
--> statement-breakpoint
ALTER TABLE "app"."lists" ENABLE ROW LEVEL SECURITY;--> statement-breakpoint
CREATE TABLE "app"."podcast_categories" (
	"podcast_id" uuid NOT NULL,
	"category_id" uuid NOT NULL,
	"position" integer DEFAULT 0 NOT NULL,
	CONSTRAINT "podcast_categories_podcast_id_category_id_pk" PRIMARY KEY("podcast_id","category_id")
);
--> statement-breakpoint
ALTER TABLE "app"."podcast_categories" ENABLE ROW LEVEL SECURITY;--> statement-breakpoint
CREATE TABLE "app"."podcasts" (
	"id" uuid PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
	"slug" text NOT NULL,
	"name" text NOT NULL,
	"description" text,
	"cover_url" text,
	"legacy_document_id" text,
	"published_at" timestamp with time zone,
	"created_at" timestamp with time zone DEFAULT now() NOT NULL,
	"updated_at" timestamp with time zone DEFAULT now() NOT NULL
);
--> statement-breakpoint
ALTER TABLE "app"."podcasts" ENABLE ROW LEVEL SECURITY;--> statement-breakpoint
CREATE TABLE "app"."transcription_jobs" (
	"id" uuid PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
	"provider_job_id" text NOT NULL,
	"audio_url" text NOT NULL,
	"status" text DEFAULT 'queued' NOT NULL,
	"error" text,
	"result" jsonb,
	"created_by" uuid,
	"created_at" timestamp with time zone DEFAULT now() NOT NULL,
	"updated_at" timestamp with time zone DEFAULT now() NOT NULL
);
--> statement-breakpoint
ALTER TABLE "app"."transcription_jobs" ENABLE ROW LEVEL SECURITY;--> statement-breakpoint
CREATE TABLE "app"."translations" (
	"episode_id" uuid NOT NULL,
	"level" "app"."level" NOT NULL,
	"target" text NOT NULL,
	"chunks" jsonb NOT NULL,
	"created_at" timestamp with time zone DEFAULT now() NOT NULL,
	CONSTRAINT "translations_episode_id_level_target_pk" PRIMARY KEY("episode_id","level","target")
);
--> statement-breakpoint
ALTER TABLE "app"."translations" ENABLE ROW LEVEL SECURITY;--> statement-breakpoint
CREATE TABLE "app"."users" (
	"id" uuid PRIMARY KEY NOT NULL,
	"is_anonymous" boolean DEFAULT false NOT NULL,
	"email" text,
	"name" text,
	"avatar_url" text,
	"native_language" text,
	"ui_language" text,
	"translation_language" text,
	"level" "app"."level" DEFAULT 'bg' NOT NULL,
	"daily_goal_min" integer DEFAULT 10 NOT NULL,
	"interests" text[] DEFAULT '{}'::text[] NOT NULL,
	"motivation" text,
	"reminder_time" text,
	"feature_access" boolean DEFAULT false NOT NULL,
	"profile_set_at" timestamp with time zone,
	"legacy_strapi_user_id" integer,
	"legacy_checked_at" timestamp with time zone,
	"created_at" timestamp with time zone DEFAULT now() NOT NULL,
	"updated_at" timestamp with time zone DEFAULT now() NOT NULL,
	"last_seen_at" timestamp with time zone DEFAULT now() NOT NULL,
	CONSTRAINT "users_motivation" CHECK ("app"."users"."motivation" IS NULL OR "app"."users"."motivation" IN ('career', 'travel', 'exams', 'fun', 'other')),
	CONSTRAINT "users_daily_goal" CHECK ("app"."users"."daily_goal_min" BETWEEN 1 AND 600),
	CONSTRAINT "users_reminder_time" CHECK ("app"."users"."reminder_time" IS NULL OR "app"."users"."reminder_time" ~ '^([01][0-9]|2[0-3]):[0-5][0-9]$')
);
--> statement-breakpoint
ALTER TABLE "app"."users" ENABLE ROW LEVEL SECURITY;--> statement-breakpoint
CREATE TABLE "app"."words" (
	"id" uuid PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
	"user_id" uuid NOT NULL,
	"word" text NOT NULL,
	"meaning" text DEFAULT '' NOT NULL,
	"phonetic" text,
	"audio_url" text,
	"detail" jsonb,
	"language" text NOT NULL,
	"source" jsonb,
	"box" smallint DEFAULT 1 NOT NULL,
	"next_review_at" timestamp with time zone DEFAULT now() NOT NULL,
	"last_reviewed_at" timestamp with time zone,
	"correct_count" integer DEFAULT 0 NOT NULL,
	"incorrect_count" integer DEFAULT 0 NOT NULL,
	"created_at" timestamp with time zone DEFAULT now() NOT NULL,
	"updated_at" timestamp with time zone DEFAULT now() NOT NULL,
	CONSTRAINT "words_box" CHECK ("app"."words"."box" BETWEEN 1 AND 5)
);
--> statement-breakpoint
ALTER TABLE "app"."words" ENABLE ROW LEVEL SECURITY;--> statement-breakpoint
ALTER TABLE "app"."episode_levels" ADD CONSTRAINT "episode_levels_episode_id_episodes_id_fk" FOREIGN KEY ("episode_id") REFERENCES "app"."episodes"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "app"."episodes" ADD CONSTRAINT "episodes_podcast_id_podcasts_id_fk" FOREIGN KEY ("podcast_id") REFERENCES "app"."podcasts"("id") ON DELETE restrict ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "app"."favorites" ADD CONSTRAINT "favorites_user_id_users_id_fk" FOREIGN KEY ("user_id") REFERENCES "app"."users"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "app"."favorites" ADD CONSTRAINT "favorites_episode_id_episodes_id_fk" FOREIGN KEY ("episode_id") REFERENCES "app"."episodes"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "app"."follows" ADD CONSTRAINT "follows_user_id_users_id_fk" FOREIGN KEY ("user_id") REFERENCES "app"."users"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "app"."follows" ADD CONSTRAINT "follows_podcast_id_podcasts_id_fk" FOREIGN KEY ("podcast_id") REFERENCES "app"."podcasts"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "app"."list_episodes" ADD CONSTRAINT "list_episodes_list_id_lists_id_fk" FOREIGN KEY ("list_id") REFERENCES "app"."lists"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "app"."list_episodes" ADD CONSTRAINT "list_episodes_episode_id_episodes_id_fk" FOREIGN KEY ("episode_id") REFERENCES "app"."episodes"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "app"."listening_days" ADD CONSTRAINT "listening_days_user_id_users_id_fk" FOREIGN KEY ("user_id") REFERENCES "app"."users"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "app"."listening_progress" ADD CONSTRAINT "listening_progress_user_id_users_id_fk" FOREIGN KEY ("user_id") REFERENCES "app"."users"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "app"."listening_progress" ADD CONSTRAINT "listening_progress_episode_id_episodes_id_fk" FOREIGN KEY ("episode_id") REFERENCES "app"."episodes"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "app"."podcast_categories" ADD CONSTRAINT "podcast_categories_podcast_id_podcasts_id_fk" FOREIGN KEY ("podcast_id") REFERENCES "app"."podcasts"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "app"."podcast_categories" ADD CONSTRAINT "podcast_categories_category_id_categories_id_fk" FOREIGN KEY ("category_id") REFERENCES "app"."categories"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "app"."translations" ADD CONSTRAINT "translations_episode_id_episodes_id_fk" FOREIGN KEY ("episode_id") REFERENCES "app"."episodes"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "app"."words" ADD CONSTRAINT "words_user_id_users_id_fk" FOREIGN KEY ("user_id") REFERENCES "app"."users"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
CREATE INDEX "admin_audit_at_idx" ON "app"."admin_audit" USING btree ("at");--> statement-breakpoint
CREATE INDEX "admin_audit_target_idx" ON "app"."admin_audit" USING btree ("target_type","target_id");--> statement-breakpoint
CREATE UNIQUE INDEX "categories_slug_key" ON "app"."categories" USING btree ("slug");--> statement-breakpoint
CREATE UNIQUE INDEX "categories_legacy_document_id_key" ON "app"."categories" USING btree ("legacy_document_id");--> statement-breakpoint
CREATE UNIQUE INDEX "episodes_legacy_document_id_key" ON "app"."episodes" USING btree ("legacy_document_id");--> statement-breakpoint
CREATE INDEX "episodes_podcast_number_idx" ON "app"."episodes" USING btree ("podcast_id","number");--> statement-breakpoint
CREATE INDEX "episodes_published_idx" ON "app"."episodes" USING btree ("published_at" DESC NULLS LAST);--> statement-breakpoint
CREATE INDEX "favorites_episode_idx" ON "app"."favorites" USING btree ("episode_id");--> statement-breakpoint
CREATE INDEX "follows_podcast_idx" ON "app"."follows" USING btree ("podcast_id");--> statement-breakpoint
CREATE INDEX "list_episodes_order_idx" ON "app"."list_episodes" USING btree ("list_id","position");--> statement-breakpoint
CREATE INDEX "list_episodes_episode_idx" ON "app"."list_episodes" USING btree ("episode_id");--> statement-breakpoint
CREATE INDEX "listening_days_date_idx" ON "app"."listening_days" USING btree ("date");--> statement-breakpoint
CREATE INDEX "listening_progress_user_recent_idx" ON "app"."listening_progress" USING btree ("user_id","updated_at" DESC NULLS LAST);--> statement-breakpoint
CREATE INDEX "listening_progress_episode_idx" ON "app"."listening_progress" USING btree ("episode_id");--> statement-breakpoint
CREATE INDEX "listening_progress_recent_idx" ON "app"."listening_progress" USING btree ("updated_at");--> statement-breakpoint
CREATE UNIQUE INDEX "lists_slug_key" ON "app"."lists" USING btree ("slug");--> statement-breakpoint
CREATE UNIQUE INDEX "lists_legacy_document_id_key" ON "app"."lists" USING btree ("legacy_document_id");--> statement-breakpoint
CREATE INDEX "podcast_categories_category_idx" ON "app"."podcast_categories" USING btree ("category_id");--> statement-breakpoint
CREATE UNIQUE INDEX "podcasts_slug_key" ON "app"."podcasts" USING btree ("slug");--> statement-breakpoint
CREATE UNIQUE INDEX "podcasts_legacy_document_id_key" ON "app"."podcasts" USING btree ("legacy_document_id");--> statement-breakpoint
CREATE INDEX "transcription_jobs_created_idx" ON "app"."transcription_jobs" USING btree ("created_at");--> statement-breakpoint
CREATE INDEX "users_email_idx" ON "app"."users" USING btree (lower("email"));--> statement-breakpoint
CREATE INDEX "users_created_idx" ON "app"."users" USING btree ("created_at");--> statement-breakpoint
CREATE UNIQUE INDEX "words_user_word_key" ON "app"."words" USING btree ("user_id",lower("word"));--> statement-breakpoint
CREATE INDEX "words_user_due_idx" ON "app"."words" USING btree ("user_id","next_review_at");--> statement-breakpoint
CREATE INDEX "words_user_created_idx" ON "app"."words" USING btree ("user_id","created_at" DESC NULLS LAST);