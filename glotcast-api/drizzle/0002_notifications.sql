CREATE TABLE "app"."job_leases" (
	"name" text PRIMARY KEY NOT NULL,
	"holder" text,
	"locked_until" timestamp with time zone DEFAULT '-infinity' NOT NULL,
	"watermark" timestamp with time zone,
	"updated_at" timestamp with time zone DEFAULT now() NOT NULL
);
--> statement-breakpoint
ALTER TABLE "app"."job_leases" ENABLE ROW LEVEL SECURITY;--> statement-breakpoint
CREATE TABLE "app"."notification_batches" (
	"id" uuid PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
	"onesignal_id" text,
	"campaign_id" uuid,
	"kind" text NOT NULL,
	"language" text NOT NULL,
	"recipients" integer NOT NULL,
	"status" text DEFAULT 'pending' NOT NULL,
	"error" text,
	"attempts" integer DEFAULT 0 NOT NULL,
	"stats" jsonb,
	"stats_at" timestamp with time zone,
	"created_at" timestamp with time zone DEFAULT now() NOT NULL,
	"sent_at" timestamp with time zone,
	CONSTRAINT "notification_batches_status" CHECK ("app"."notification_batches"."status" IN ('pending', 'sent', 'failed', 'empty'))
);
--> statement-breakpoint
ALTER TABLE "app"."notification_batches" ENABLE ROW LEVEL SECURITY;--> statement-breakpoint
CREATE TABLE "app"."notification_campaigns" (
	"id" uuid PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
	"name" text NOT NULL,
	"status" text DEFAULT 'draft' NOT NULL,
	"source_language" text DEFAULT 'en' NOT NULL,
	"messages" jsonb DEFAULT '{}'::jsonb NOT NULL,
	"audience" jsonb DEFAULT '{"segment":"all"}'::jsonb NOT NULL,
	"link" jsonb DEFAULT '{"type":"home"}'::jsonb NOT NULL,
	"image_url" text,
	"respect_quiet_hours" boolean DEFAULT true NOT NULL,
	"delivery" jsonb,
	"send_at" timestamp with time zone,
	"recipients" integer,
	"sent_at" timestamp with time zone,
	"created_by" uuid,
	"created_by_email" text,
	"created_at" timestamp with time zone DEFAULT now() NOT NULL,
	"updated_at" timestamp with time zone DEFAULT now() NOT NULL,
	CONSTRAINT "notification_campaigns_status" CHECK ("app"."notification_campaigns"."status" IN ('draft', 'scheduled', 'sending', 'sent', 'canceled', 'failed'))
);
--> statement-breakpoint
ALTER TABLE "app"."notification_campaigns" ENABLE ROW LEVEL SECURITY;--> statement-breakpoint
CREATE TABLE "app"."notification_sends" (
	"id" bigserial PRIMARY KEY NOT NULL,
	"user_id" uuid NOT NULL,
	"kind" text NOT NULL,
	"grp" text NOT NULL,
	"daily_slot" boolean DEFAULT false NOT NULL,
	"campaign_id" uuid,
	"batch_id" uuid,
	"local_date" date NOT NULL,
	"due_at" timestamp with time zone NOT NULL,
	"status" text DEFAULT 'queued' NOT NULL,
	"skip_reason" text,
	"language" text NOT NULL,
	"variant" text,
	"title" text NOT NULL,
	"body" text NOT NULL,
	"data" jsonb NOT NULL,
	"image_url" text,
	"payload_hash" text NOT NULL,
	"episode_ids" uuid[] DEFAULT '{}'::uuid[] NOT NULL,
	"created_at" timestamp with time zone DEFAULT now() NOT NULL,
	"sent_at" timestamp with time zone,
	"opened_at" timestamp with time zone,
	CONSTRAINT "notification_sends_status" CHECK ("app"."notification_sends"."status" IN ('queued', 'sending', 'sent', 'failed', 'unreachable', 'expired', 'canceled', 'skipped')),
	CONSTRAINT "notification_sends_grp" CHECK ("app"."notification_sends"."grp" IN ('habit', 'learning', 'content', 'campaign', 'test'))
);
--> statement-breakpoint
ALTER TABLE "app"."notification_sends" ENABLE ROW LEVEL SECURITY;--> statement-breakpoint
CREATE TABLE "app"."notification_settings" (
	"id" smallint PRIMARY KEY DEFAULT 1 NOT NULL,
	"automations" jsonb DEFAULT '{}'::jsonb NOT NULL,
	"updated_at" timestamp with time zone DEFAULT now() NOT NULL,
	"updated_by" uuid,
	CONSTRAINT "notification_settings_single_row" CHECK ("app"."notification_settings"."id" = 1)
);
--> statement-breakpoint
ALTER TABLE "app"."notification_settings" ENABLE ROW LEVEL SECURITY;--> statement-breakpoint
ALTER TABLE "app"."episodes" ADD COLUMN "notify_followers" boolean DEFAULT true NOT NULL;--> statement-breakpoint
ALTER TABLE "app"."episodes" ADD COLUMN "followers_notified_at" timestamp with time zone;--> statement-breakpoint
ALTER TABLE "app"."users" ADD COLUMN "timezone" text;--> statement-breakpoint
ALTER TABLE "app"."users" ADD COLUMN "push_enabled" boolean DEFAULT false NOT NULL;--> statement-breakpoint
ALTER TABLE "app"."users" ADD COLUMN "push_updated_at" timestamp with time zone;--> statement-breakpoint
ALTER TABLE "app"."users" ADD COLUMN "notify_reminders" boolean DEFAULT true NOT NULL;--> statement-breakpoint
ALTER TABLE "app"."users" ADD COLUMN "notify_learning" boolean DEFAULT true NOT NULL;--> statement-breakpoint
ALTER TABLE "app"."users" ADD COLUMN "notify_new_episodes" boolean DEFAULT true NOT NULL;--> statement-breakpoint
ALTER TABLE "app"."users" ADD COLUMN "notify_news" boolean DEFAULT true NOT NULL;--> statement-breakpoint
ALTER TABLE "app"."users" ADD COLUMN "pro_active" boolean DEFAULT false NOT NULL;--> statement-breakpoint
ALTER TABLE "app"."users" ADD COLUMN "pro_active_at" timestamp with time zone;--> statement-breakpoint
ALTER TABLE "app"."notification_batches" ADD CONSTRAINT "notification_batches_campaign_id_notification_campaigns_id_fk" FOREIGN KEY ("campaign_id") REFERENCES "app"."notification_campaigns"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "app"."notification_sends" ADD CONSTRAINT "notification_sends_user_id_users_id_fk" FOREIGN KEY ("user_id") REFERENCES "app"."users"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "app"."notification_sends" ADD CONSTRAINT "notification_sends_campaign_id_notification_campaigns_id_fk" FOREIGN KEY ("campaign_id") REFERENCES "app"."notification_campaigns"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "app"."notification_sends" ADD CONSTRAINT "notification_sends_batch_id_notification_batches_id_fk" FOREIGN KEY ("batch_id") REFERENCES "app"."notification_batches"("id") ON DELETE set null ON UPDATE no action;--> statement-breakpoint
CREATE INDEX "notification_batches_pending_idx" ON "app"."notification_batches" USING btree ("created_at") WHERE "app"."notification_batches"."status" = 'pending';--> statement-breakpoint
CREATE INDEX "notification_batches_campaign_idx" ON "app"."notification_batches" USING btree ("campaign_id");--> statement-breakpoint
CREATE INDEX "notification_batches_created_idx" ON "app"."notification_batches" USING btree ("created_at");--> statement-breakpoint
CREATE INDEX "notification_campaigns_due_idx" ON "app"."notification_campaigns" USING btree ("send_at") WHERE "app"."notification_campaigns"."status" = 'scheduled';--> statement-breakpoint
CREATE INDEX "notification_campaigns_created_idx" ON "app"."notification_campaigns" USING btree ("created_at");--> statement-breakpoint
CREATE UNIQUE INDEX "notification_sends_automation_key" ON "app"."notification_sends" USING btree ("user_id","kind","local_date") WHERE "app"."notification_sends"."campaign_id" IS NULL AND "app"."notification_sends"."grp" <> 'test';--> statement-breakpoint
CREATE UNIQUE INDEX "notification_sends_daily_slot_key" ON "app"."notification_sends" USING btree ("user_id","local_date") WHERE "app"."notification_sends"."daily_slot";--> statement-breakpoint
CREATE UNIQUE INDEX "notification_sends_campaign_key" ON "app"."notification_sends" USING btree ("campaign_id","user_id") WHERE "app"."notification_sends"."campaign_id" IS NOT NULL;--> statement-breakpoint
CREATE INDEX "notification_sends_queued_idx" ON "app"."notification_sends" USING btree ("due_at") WHERE "app"."notification_sends"."status" = 'queued';--> statement-breakpoint
CREATE INDEX "notification_sends_batch_idx" ON "app"."notification_sends" USING btree ("batch_id") WHERE "app"."notification_sends"."batch_id" IS NOT NULL;--> statement-breakpoint
CREATE INDEX "notification_sends_user_day_idx" ON "app"."notification_sends" USING btree ("user_id","local_date");--> statement-breakpoint
CREATE INDEX "notification_sends_user_created_idx" ON "app"."notification_sends" USING btree ("user_id","created_at");--> statement-breakpoint
CREATE INDEX "notification_sends_created_idx" ON "app"."notification_sends" USING btree ("created_at");--> statement-breakpoint
CREATE INDEX "episodes_followers_pending_idx" ON "app"."episodes" USING btree ("published_at") WHERE "app"."episodes"."followers_notified_at" IS NULL;--> statement-breakpoint
CREATE INDEX "episodes_followers_notified_idx" ON "app"."episodes" USING btree ("followers_notified_at");--> statement-breakpoint
CREATE INDEX "users_push_timezone_idx" ON "app"."users" USING btree ("timezone") WHERE "app"."users"."push_enabled";