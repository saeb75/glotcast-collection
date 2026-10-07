# GlotCast server

The backend of GlotCast 2.0, deployed as one Coolify resource (`docker-compose.yml`):

- **[`glotcast-api/`](glotcast-api)** — NestJS 11 + Drizzle API on Supabase Postgres (schema `app`): auth (Supabase
  tokens), catalog, listening progress and streaks, words (Leitner), translation, the admin API and the content
  pipeline. The contract shared with the app and the admin panel: `glotcast-api/docs/contract-v1.md`.
- **[`glotcast-admin/`](glotcast-admin)** — Next.js admin panel (shadcn/ui), a client of `/v1/admin/*`.

The mobile app is a separate repository (`saeb75/glotcast-app`). Deploying: `glotcast-api/docs/deploy.md`;
switching over from Strapi: `glotcast-api/docs/cutover.md`.
