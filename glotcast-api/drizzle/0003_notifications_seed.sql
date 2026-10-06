-- Push notifications, data part.
-- The back catalog is never pushed: every episode already live counts as announced (at its publish date). Only
-- episodes going live from now on (published, or a scheduled date that passes) reach their podcast's followers.
UPDATE app.episodes SET followers_notified_at = published_at
WHERE followers_notified_at IS NULL AND published_at IS NOT NULL AND published_at <= now();
--> statement-breakpoint
-- The automations' settings: every automation starts switched off (the admin turns them on one by one).
INSERT INTO app.notification_settings (id, automations) VALUES (1, '{
  "quietHours": { "from": "22:00", "to": "08:00" },
  "reminder": { "enabled": false, "weeklyRecap": true, "minDue": 5 },
  "streakSaver": { "enabled": false, "time": "21:00", "minStreak": 2 },
  "learning": { "enabled": false, "time": "18:00" },
  "newEpisodes": { "enabled": false, "debounceMin": 15, "freshHours": 36 }
}'::jsonb)
ON CONFLICT (id) DO NOTHING;
--> statement-breakpoint
-- The scheduler's lease (one runner across API instances) and its watermark.
INSERT INTO app.job_leases (name) VALUES ('notifications') ON CONFLICT (name) DO NOTHING;
