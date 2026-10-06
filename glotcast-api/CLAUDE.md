# CLAUDE.md — glotcast-api

NestJS 11 + Drizzle (node-postgres) API for GlotCast. Read `README.md` for the overview and `docs/contract-v1.md`
before changing any endpoint. Conventions mirror `../../pokemon/api` (same developer).

## Hard rules

- **The contract is binding.** `docs/contract-v1.md` is what the mobile app and the admin panel are built against.
  Change the contract file first (and its Changelog), then the code, then regenerate `openapi.json`
  (`npm run openapi`) and commit both.
- **Never connect to the production database** from a development session, and never read real `.env` files of
  sibling projects (`../glotcast-panel/.env`, `../glotcast-vocab/.env`). Use the local cluster:
  `npm run db:local` (Postgres on :54329, data in `.pgdata/`).
- **Never write to schema `public`** (Strapi + glotcast-vocab live there). Migrations only touch schema `app`
  (`drizzle.config.ts` filters it); the legacy readers only `SELECT` (`migrate-strapi` in a READ ONLY transaction).
- Never `drizzle-kit push`. Change `src/database/schema/app.ts`, run `npm run db:generate`, review the SQL, commit it.
  Every new table gets `.enableRLS()`. Hand-written SQL (extensions, functions, expression indexes) goes in a
  `drizzle-kit generate --custom` migration.
- Package manager: **npm**. Do not modify `../glotcastapp`, `../glotcast-panel`, `../glotcast-vocab`,
  `../whisper-transcriber`.

## Commands

`npm test` (unit + e2e; the e2e global setup starts the local cluster if needed and rebuilds `glotcast_test` from
the migrations), `npm run lint`, `npm run typecheck`, `npm run build`, `npm run openapi`,
`node dist/cli.js db-migrate | migrate-strapi [--dry-run] | admin grant <email> | notify status|dry-run|test|tick`.

## Layout

- `src/<feature>/{module,controller,service,repository,dto}.ts` with `*.spec.ts` unit tests next to pure logic
  (`me/streak.ts`, `words/leitner.ts`, `words/lookup.ts`, `strapi/strapi-mapping.ts`, …).
- `src/catalog/` — the shared read side: `CatalogRepository` builds every `EpisodeSummary` / `PodcastSummary` list
  (`SUMMARY_COLUMNS`, `EPISODE_VISIBLE`); reuse it rather than writing new summary SQL.
- `src/admin/<area>/` — admin endpoints: `@ApiTags("admin")`, `@UseGuards(AdminGuard)`,
  `@UseInterceptors(AdminAuditInterceptor)` and an `@Audit({...})` on every write (record ids, never whole bodies).
- `src/notifications/` — push notifications (`NotificationsCoreModule`, used by the API and the CLI): pure rules /
  copy / payload with specs, the planner, content and campaign services, the OneSignal client and dispatcher, the
  scheduler. Planner SQL never calls `now()`: `$now` is a parameter (dry runs and tests travel in time). Push copy:
  `en.ts` defines `Copy`, every language `satisfies` it; `copy.spec.ts` checks parity, plurals and lengths.
- `src/strapi/` — `migrate-strapi` (reader, pure mapping, service). `src/users/` — provisioning, guest claim, legacy
  import. `src/cli.ts` — CLI entry (CLI-only modules: `StrapiModule`, `AdminRolesModule`).
- `test/` — e2e specs (`*.e2e-spec.ts`), `helpers.ts` (`createTestApp()` with locally signed ES256 tokens and fakes
  for Supabase admin, Google Translate, the dictionary, R2, AssemblyAI, OpenAI/Gemini), fixtures (`auth.sql` = fake
  Supabase auth schema, `strapi.sql` = real Strapi v5 rows). Specs share one database: make assertions about your
  own rows (random user ids), and call `t.migrate()` for the legacy content.

## Gotchas

- **nestjs-zod / OpenAPI:** use `nullableString()` (`src/common/zod.ts`) instead of `z.string().nullable()` —
  an unconstrained nullable primitive becomes `type: [string, null]`, which @nestjs/swagger turns into an array on a
  DTO's top-level properties. Shared contract types carry `.meta({ id })`; a DTO **root** must not (wrap it:
  `createZodDto(z.object(schema.shape))`), or nestjs-zod registers the name twice. The document is OpenAPI 3.1.
- Drizzle's `sql` expands JS arrays into parameter lists: pass uuid arrays as a literal,
  ``sql`${`{${ids.join(",")}}`}::uuid[]` `` (ids are validated UUIDs).
- Raw row types for `db.execute<T>` must be `type` aliases (not interfaces).
- `AppConfig.get` treats `""` as unset; optional services answer 503 when their key is missing.
- Visibility: an episode is public when its `published_at` has come **and** its podcast's has too.
- Timestamps from Strapi are zone-less (server local time); `migrate-strapi --timezone` reads them.
