# GlotCast API

NestJS 11 + Drizzle backend of GlotCast, the English-learning podcast app where every episode comes in three levels
(bg / in / ad), each with its own audio and timed transcript. It replaces the Strapi CMS (`../glotcast-panel`) and
the Express vocab service (`../glotcast-vocab`), and takes over the content pipeline of `../whisper-transcriber`.

```
glotcastapp (Expo) ──┐                         ┌─▶ Supabase Postgres   app.*    this API (drizzle/)
                     ├──/v1──▶ glotcast-api ───┤                       public.* Strapi + vocab (read only)
glotcast-admin ──────┘   (Supabase JWT)        ├─▶ Supabase Auth (JWKS) · Google Translate · Yandex Dictionary
                                               └─▶ Cloudflare R2 · AssemblyAI · OpenAI · Gemini
```

**The contract is `docs/contract-v1.md`** — every endpoint and shape. The app and the admin panel are written
against it (and against `openapi.json`, generated from the code).

## Run locally

```bash
npm install
npm run db:local                  # throwaway Postgres on :54329 (data in .pgdata/, needs Homebrew postgresql)
cp .env.example .env              # local values already point at it
npm run build && node dist/cli.js db-migrate
npm run start:dev                 # http://localhost:3000/docs (Swagger, non-production only)
sh scripts/local-db.sh stop       # when done
```

Content for local work: load the Strapi fixture and migrate it —
`psql postgresql://postgres@localhost:54329/glotcast -f test/fixtures/strapi.sql && node dist/cli.js migrate-strapi`.
User routes need `SUPABASE_URL` (tokens are verified against the project's JWKS); without it they answer 503.

## Commands

| | |
|---|---|
| `npm test` | unit + e2e (Vitest + SWC). The e2e suite rebuilds `glotcast_test` from the migrations on the local cluster, starting it if needed (`TEST_ADMIN_URL` / `TEST_DATABASE_URL` to use another server) |
| `npm run test:unit` / `npm run test:e2e` | one project |
| `npm run lint` / `npm run typecheck` / `npm run build` | ESLint (type-aware) / tsc (src + test) / nest build |
| `npm run db:generate` | a new SQL migration in `drizzle/` from `src/database/schema/app.ts` — **never** `drizzle-kit push` |
| `npm run openapi` | writes `openapi.json` (built into `tools-dist/`, no server and no database needed); commit it |
| `node dist/cli.js db-migrate` | applies `drizzle/` (journal `app.__drizzle_migrations`); the image runs it on start |
| `node dist/cli.js migrate-strapi [--dry-run] [--timezone UTC]` | copies Strapi's published content into `app` (see below) |
| `node dist/cli.js admin grant <email>` / `admin revoke <email>` / `admin list` | who may use `/v1/admin` |
| `node dist/cli.js notify status` / `notify dry-run [--at ISO] [--window MIN] [--user id\|email]` / `notify test <email> [--kind reminder] [--lang tr]` / `notify tick` | push notifications: state, a rolled-back preview of a tick, a test push, one run (`docs/deploy.md` §5) |

## API (v1)

Base path `/v1`, JSON, camelCase, RFC 9457 problem details for errors. Auth: `Authorization: Bearer <Supabase access
token>`; guests (anonymous Supabase sessions) are users. Details and shapes: `docs/contract-v1.md`.

- **Catalog** (public; a token adds personal fields): `home`, `discover`, `categories`, `podcasts`, `episodes`
  (feeds `latest | following | trending`), episode detail and transcripts, `lists/:slug`, `search`
  (unaccent + trigram, case- and accent-insensitive). Ids are UUIDs; legacy Strapi `documentId`s are accepted too
  (old deep links). Only published content is visible (a publish date that has come, the podcast's too).
- **Me** (user): profile, `stats` (streaks over the user's local days, daily goal, totals), `listening` heartbeats
  (progress per level, completed at 95 %, seconds per day), progress, follows, favorites, account deletion,
  `claim-guest`.
- **Translate** (user): whole transcripts (cached per episode, level, target in `app.translations`) and texts,
  through Google Cloud Translation v2; rate-limited per user.
- **Words** (user): lookup (Yandex Dictionary + dictionaryapi.dev + wink-lemmatizer base forms; Google's free
  endpoint as the fallback; Google TTS for audio), saved words with Leitner boxes (1/2/4/8/16 days), review.
- **Push notifications** (`src/notifications/`): the API decides, OneSignal delivers. A 5-minute scheduler (lease in
  `app.job_leases`, kill switch `NOTIFICATIONS_ENABLED`) plans the daily reminder / learning / streak-saver pushes at
  each user's local time, new-episode pushes to followers and admin campaigns, in the user's app language (copy in
  16 languages, `src/notifications/copy/`), within caps and quiet hours; `app.notification_sends` is the outbox and
  the send log. The heartbeat returns streak `milestone`s for the app's celebration.
- **Admin** (`app_metadata.role = "admin"`, tag `admin`, every write audited in `app.admin_audit`): podcasts,
  episodes and their levels, publishing and scheduling, categories, lists, home config, users (backend Pro),
  dashboard, R2 presigned uploads, AssemblyAI transcription jobs (utterances / sentences / paragraphs with word
  timings, in seconds), cover prompts (gpt-4o-mini, 5 styles) and images (Gemini or gpt-image-1, stored in R2).
- `GET /v1/health/live`, `GET /v1/health/ready`, `GET /v1/app/config`.

## Data

Schema `app` (`src/database/schema/app.ts`, RLS on every table, no policies — the API connects as the owner):
users, podcasts, categories (+ podcast_categories), episodes, episode_levels (audio, duration, transcript
`{chunks}` in seconds), lists (+ list_episodes), home_config (one row of ordered id arrays), follows, favorites,
listening_progress, listening_days, words (Leitner state included), translations, transcription_jobs, admin_audit.

**Legacy data.** `migrate-strapi` reads Strapi v5's published rows (`published_at IS NOT NULL`, links followed
through `document_id`), normalizes level values ("BG,", "IN,", "AD", "Beginner,"…) and Whisper transcripts
(`timestamp: [s, e]` → `start`/`end` in seconds; milliseconds when the largest value is over 60 000), and upserts
by `legacy_document_id`. User data moves per account: a registered user's first request copies the Strapi account
with the same email (subscriptions → follows, vocab words + Leitner state → words, `featureAccess`). The Strapi
table layout was taken from the real panel (booted once against a local Postgres); `test/fixtures/strapi.sql` holds
rows written by Strapi itself.

## Deploy

`Dockerfile` (node:22-slim, runs as `node`, `db-migrate` then the server, healthcheck `/v1/health/live`) and
`docker-compose.yml` (`api` + the Next.js `admin` from `../glotcast-admin`) on Coolify: `docs/deploy.md`.
The production switch from Strapi (Supabase settings, env, the migration procedure): `docs/cutover.md`.
