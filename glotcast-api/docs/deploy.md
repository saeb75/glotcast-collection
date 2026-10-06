# Deploying on Coolify

The database and auth stay on **Supabase** (project `aoayqnsusoxjodjoxqaj`, the same Postgres Strapi uses: Strapi
keeps `public`, this API owns schema `app`). Media lives on **Cloudflare R2**. Coolify runs two containers from
`docker-compose.yml`:

| Service | What | Reachable at |
|---|---|---|
| `api` | This NestJS API — everything the app and the admin panel call, and its CLI | `https://api.glotcast.app` (port 3000) |
| `admin` | The admin panel (Next.js, `../glotcast-admin`, its own Dockerfile) | `https://admin.glotcast.app` (its port, 3000 for `next start`) |

**Server:** the API is light: 1 vCPU / 1 GB RAM is enough for both containers. amd64 or arm64.

Before the first deploy, do the Supabase steps of `docs/cutover.md` (§1): the API refuses user routes (503) until
`SUPABASE_URL` is set, and the migration procedure needs the database URLs.

## 1. Create the resource

Coolify builds from one git repository. Two ways to lay it out:

- **One resource (this compose file).** The repository holds both folders side by side — `glotcast-api/` and
  `glotcast-admin/` (the `glot-cast` monorepo). Coolify → your project → **New Resource → Docker Compose** → the
  repository, compose file `/glotcast-api/docker-compose.yml`. Build contexts are relative to the compose file, so
  `../glotcast-admin` resolves.
- **Two resources.** If the API and the admin panel live in separate repositories: **New Resource → Dockerfile** for
  each (this repo's `Dockerfile`; the admin's own), with the variables of §2 split between them. The compose file
  then only documents the pairing.

Domains: `api` → `https://api.glotcast.app` (port 3000); `admin` → `https://admin.glotcast.app`. HTTPS certificates come
from Coolify. Optionally turn on automatic deployment on push.

## 2. Environment variables

Coolify lists every `${…}` of the compose file. `.env.example` says where each value comes from.

| Variable | Value | Secret |
|---|---|---|
| `DATABASE_URL` | Supabase → Connect → **Transaction pooler** (port 6543) | yes |
| `DATABASE_MIGRATION_URL` | Supabase → Connect → **Session pooler** (port 5432): `db-migrate` runs on it at every start | yes |
| `DATABASE_SSL` | `true` (default in the compose file) | |
| `DATABASE_SSL_CA` | the Supabase CA (Project Settings → Database → SSL Configuration → Download certificate): paste the PEM and tick *Is Multiline?* | |
| `SUPABASE_URL` | `https://aoayqnsusoxjodjoxqaj.supabase.co` | |
| `SUPABASE_SERVICE_ROLE_KEY` | Project Settings → API Keys → **Secret key** — deletes accounts and claimed guests | yes |
| `SUPABASE_JWT_SECRET` | only while the project still signs with the legacy HS256 secret | yes |
| `SUPABASE_PUBLISHABLE_KEY` | Project Settings → API Keys → **Publishable key** (the admin panel's sign-in) | |
| `CORS_ORIGINS` | `https://admin.glotcast.app` | |
| `ADMIN_API_URL` | `https://api.glotcast.app` | |
| `TRUST_PROXY` | `1` behind Coolify's proxy alone; **`2`** when Cloudflare proxies the domain (orange cloud) | |
| `GOOGLE_TRANSLATE_API_KEY` | Cloud Translation v2 key (server only) | yes |
| `YANDEX_DICT_KEY` | Yandex Dictionary key | yes |
| `R2_ACCOUNT_ID`, `R2_ACCESS_KEY_ID`, `R2_SECRET_ACCESS_KEY`, `R2_BUCKET`, `R2_PUBLIC_BASE_URL` | Cloudflare R2 (as in whisper-transcriber) | keys yes |
| `ASSEMBLYAI_API_KEY`, `OPENAI_API_KEY`, `GEMINI_API_KEY` | the content pipeline | yes |
| `APP_MIN_SUPPORTED_VERSION`, `APP_LATEST_VERSION` | what `GET /v1/app/config` tells the app | |
| `STRAPI_PUBLIC_URL` | the Strapi panel's URL, only for `migrate-strapi` (covers uploaded to Strapi) | |

Mark `ADMIN_API_URL`, `SUPABASE_URL` and `SUPABASE_PUBLISHABLE_KEY` as **build variables**: a Next.js build bakes
`NEXT_PUBLIC_*` values in. The compose file passes them as `NEXT_PUBLIC_API_URL`, `NEXT_PUBLIC_SUPABASE_URL` and
`NEXT_PUBLIC_SUPABASE_PUBLISHABLE_KEY` build args — check those names against glotcast-admin's Dockerfile.

The compose file fixes the rest (`NODE_ENV=production`, `PORT=3000`).

**Cloudflare in front** (proxied DNS record): SSL/TLS mode **Full** or **Full (strict)** — "Flexible" loops with
Coolify's HTTPS redirect.

## 3. Deploy

- **Build:** a few minutes (`npm ci`, `nest build`, `npm prune --omit=dev`; the image runs as `node`).
- **Migrations run on every start:** `node dist/cli.js db-migrate && exec node dist/main.js`. They only ever touch
  schema `app` (drizzle-kit sees nothing else) and are no-ops once applied. The first one creates schema `app`, the
  `unaccent` and `pg_trgm` extensions (in `extensions`, Supabase's default) and every table, with RLS on.
- **Check:** `https://api.glotcast.app/v1/health/ready` → `{"ok":true,"checks":{"database":"up"}}`. The container
  healthcheck calls `/v1/health/live`.
- **Logs:** per service in Coolify; JSON (pino) with a request id per line (`x-request-id` is echoed in responses;
  pass your own to correlate). Authorization headers are redacted. Swagger (`/docs`) is off in production.

## 4. After the first deploy

- **Content:** the production migration from Strapi — `docs/cutover.md` §3 (dry run, run, verify counts).
- **Admin access:** in the api container's terminal (Coolify → the resource → Terminal → `api`):
  `node dist/cli.js admin grant <email>` (a registered Supabase account), then sign in at `https://admin.glotcast.app`.
  `admin list` shows who has the role, `admin revoke <email>` removes it; the role reaches the token on the next
  sign-in or token refresh.
- **The app:** in the EAS environments, `EXPO_PUBLIC_API_URL=https://api.glotcast.app`, `EXPO_PUBLIC_SUPABASE_URL`
  and `EXPO_PUBLIC_SUPABASE_PUBLISHABLE_KEY`, then build. The Google Translate key no longer ships in the app.
- **Updates:** redeploy; migrations apply on start. `npm run db:generate` (locally) creates new migration files —
  commit them with the schema change. Never `drizzle-kit push` against Supabase.
