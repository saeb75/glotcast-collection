# Cutover: Strapi + glotcast-vocab → glotcast-api

What changes: the app stops calling Strapi (`/api/*`, Strapi JWTs) and the Express vocab service, and calls this API
with **Supabase** sessions instead. Content moves from Strapi's tables to schema `app` with `migrate-strapi`; each
legacy user's follows, words and Pro flag move on their first sign-in.

What does not change: the legacy tables. Strapi lives in `public` of the same Supabase Postgres; this API only ever
**reads** them (`migrate-strapi` in a `READ ONLY` transaction, the per-user legacy import with plain `SELECT`s) and
its migrations only touch schema `app`. Old app versions keep working against Strapi until they are retired, and a
rollback is just "keep using the old stack".

## 1. Supabase dashboard (project `aoayqnsusoxjodjoxqaj`)

1. **Anonymous sign-ins** — Authentication → Sign In / Providers → *Allow anonymous sign-ins*: on. Guests are real
   users of the API. Consider Authentication → Rate Limits (anonymous sign-ins per hour) and a CAPTCHA (Attack
   Protection → Turnstile) against abuse.
2. **Google** — Authentication → Sign In / Providers → Google: on.
   - *Client IDs*: the Web client ID, plus the iOS and Android client IDs the app signs in with (native
     `signInWithIdToken` checks the token's audience against this list).
   - *Client Secret*: the Web client's secret (Google Cloud Console → APIs & Services → Credentials).
   - *Skip nonce checks*: on if the iOS Google Sign-In SDK is used without a nonce.
3. **Apple** — Authentication → Sign In / Providers → Apple: on.
   - *Client IDs*: the app's bundle ID (native Sign in with Apple), plus the Services ID if web/Android OAuth is
     used (with its secret key, generated from the `.p8` key — it expires every 6 months).
   - Use the same Apple developer team as the old app: Apple's "Hide my email" relay addresses are per team, and
     the legacy data is matched by email.
4. **Linking guests** — Authentication → Sign In / Providers → *Allow manual linking*: on if the app upgrades a
   guest in place with `linkIdentity()` (same user id, nothing to claim). When the user signs in to an existing
   account instead, the app calls `POST /v1/me/claim-guest` with the guest's access token.
5. **Redirect URLs** — Authentication → URL Configuration: the app's scheme (e.g. `glotcast://**`) and
   `https://admin.glotcast.com/**`.
6. **Signing keys** — Project Settings → JWT Keys: use asymmetric signing keys (the API verifies tokens against the
   project's JWKS and needs no secret). While the project still signs with the legacy HS256 secret, set
   `SUPABASE_JWT_SECRET`; remove it once the legacy key is revoked.
7. **API keys** — Project Settings → API Keys: the *publishable* key goes into the app and the admin panel, the
   *secret* key into the API (`SUPABASE_SERVICE_ROLE_KEY`) only.
8. **Database** — Connect: the *Transaction pooler* URL (`DATABASE_URL`, port 6543) and the *Session pooler* URL
   (`DATABASE_MIGRATION_URL`, port 5432); Project Settings → Database → SSL Configuration → download the CA
   (`DATABASE_SSL_CA`, with `DATABASE_SSL=true`).
9. **Data API** — Project Settings → Data API → Exposed schemas: leave `app` **out** (every `app` table has RLS on and
   no policies anyway; the API connects as the owner).
10. **Extensions** — nothing to do: the first migration creates `unaccent` and `pg_trgm` in schema `extensions`.

## 2. Environment variables

Every variable, and where its value comes from, is in `.env.example`; the deploy table is in `docs/deploy.md` §2.
The cutover needs at least `DATABASE_URL`, `DATABASE_MIGRATION_URL`, `DATABASE_SSL(_CA)`, `SUPABASE_URL`,
`SUPABASE_SERVICE_ROLE_KEY`, and for covers uploaded to Strapi, `STRAPI_PUBLIC_URL` (the panel's public URL, which
prefixes `/uploads/…` paths). `STRAPI_DATABASE_URL` stays empty: Strapi's tables are in the same database.

## 3. Production migration

Run in the API container's terminal (Coolify → the resource → Terminal → `api`), after the first deploy has run
`db-migrate` (schema `app` exists). Nothing below writes to `public`.

1. **Freeze Strapi editing** (tell editors); content edited in Strapi after the last run is not copied.
2. **Backup check** — Supabase → Database → Backups: a recent backup (or PITR) exists.
3. **Count what Strapi published** — Supabase → SQL Editor:
   ```sql
   SELECT 'podcasts' AS what, count(DISTINCT document_id) FROM public.podcasts WHERE published_at IS NOT NULL
   UNION ALL SELECT 'episodes', count(DISTINCT document_id) FROM public.episodes WHERE published_at IS NOT NULL
   UNION ALL SELECT 'categories', count(DISTINCT document_id) FROM public.categories WHERE published_at IS NOT NULL
   UNION ALL SELECT 'lists', count(DISTINCT document_id) FROM public.lists WHERE published_at IS NOT NULL;
   ```
4. **Dry run** — every write happens in one transaction that is rolled back, so the counts are real:
   ```sh
   node dist/cli.js migrate-strapi --dry-run
   ```
   Check the report:
   - `source.*` equals step 3, and `source.missingTables` is `[]`;
   - `episodes.skippedNoPodcast`: published episodes whose podcast is not published (or not linked) — publish the
     podcast in Strapi or accept the skip;
   - `levels.skippedUnknownLevel` (a level value that is not BG/IN/AD in any spelling), `levels.skippedNoAudio`
     (a level without a URL), `levels.duplicates` (two components of one level: the first wins);
   - `levels.msTranscripts`: transcripts that were in milliseconds (converted);
   - `podcasts.relativeCovers` must be `0` (else set `STRAPI_PUBLIC_URL`), `podcasts.withoutCover` is informative;
   - `homeConfig.unmapped`: slider episodes / lists that are not published.

   Strapi's timestamps have no time zone (they are in the Strapi server's zone). If Strapi did not run in UTC, add
   `--timezone <zone>` (e.g. `--timezone Europe/Istanbul`) to both the dry run and the run.
5. **Run**:
   ```sh
   node dist/cli.js migrate-strapi
   ```
   It upserts by Strapi `documentId`, so it can be re-run (after more Strapi edits, until editing moves to the admin
   panel). A re-run updates the migrated rows (not their slugs), replaces their categories, levels and list
   episodes, drops cached translations of changed transcripts — and overwrites edits made in the admin panel to
   migrated rows. It never deletes a podcast or episode that disappeared from Strapi: unpublish those in the admin.
6. **Verify counts**:
   ```sql
   SELECT 'podcasts' AS what, count(*) FROM app.podcasts WHERE legacy_document_id IS NOT NULL
   UNION ALL SELECT 'episodes', count(*) FROM app.episodes WHERE legacy_document_id IS NOT NULL
   UNION ALL SELECT 'levels', count(*) FROM app.episode_levels
   UNION ALL SELECT 'categories', count(*) FROM app.categories WHERE legacy_document_id IS NOT NULL
   UNION ALL SELECT 'lists', count(*) FROM app.lists WHERE legacy_document_id IS NOT NULL;

   -- Published in Strapi but not migrated (expected: the skippedNoPodcast episodes only).
   SELECT e.document_id, e.title
   FROM (SELECT DISTINCT ON (document_id) document_id, title FROM public.episodes
         WHERE published_at IS NOT NULL ORDER BY document_id, published_at DESC) e
   WHERE NOT EXISTS (SELECT 1 FROM app.episodes a WHERE a.legacy_document_id = e.document_id);

   -- Migrated episodes without a playable level (the app lists them with no level).
   SELECT e.id, e.title FROM app.episodes e
   WHERE NOT EXISTS (SELECT 1 FROM app.episode_levels l WHERE l.episode_id = e.id AND l.audio_url <> '');
   ```
   Podcasts, episodes, categories and lists must equal step 3 (episodes minus `skippedNoPodcast`). Then spot-check
   the API: `GET /v1/home`, `GET /v1/podcasts`, an old deep link `GET /v1/episodes/<Strapi documentId>`, and
   `GET /v1/episodes/<id>/transcript?level=bg` (seconds, not milliseconds).
7. **Admin access** — the account must exist in Supabase Auth first (sign up in the admin panel, or Authentication →
   Users → Add user), then:
   ```sh
   node dist/cli.js admin grant <email>
   node dist/cli.js admin list
   ```
   The role reaches the token at the next sign-in (or token refresh). Grants are written to `app.admin_audit`.
8. **Legacy users** — nothing to run. A registered account's first request copies the Strapi account with the same
   email (case-insensitive): subscriptions → follows (through the podcasts' `documentId`, so step 5 must have run),
   glotcast-vocab words with their Leitner state → words, `featureAccess`. It happens once per account
   (`app.users.legacy_strapi_user_id`, `legacy_checked_at`); a word the user deletes later never comes back. Check
   with a known account: `GET /v1/me` (`featureAccess`), `GET /v1/me/follows`, `GET /v1/words`.
   ```sql
   SELECT (SELECT count(*) FROM public.up_users) AS strapi_users,
          (SELECT count(*) FROM app.users WHERE legacy_strapi_user_id IS NOT NULL) AS claimed;
   ```
9. **Push notifications** — deploy with `NOTIFICATIONS_ENABLED=false`; the go-live (OneSignal keys, dry run, the
   reminder alone first) is `docs/deploy.md` §5. `migrate-strapi` marks the migrated episodes as announced, so the
   back catalog never reaches followers.
10. **Release** — the new app (pointing at `https://api.glotcast.com`), the admin panel for editors. Old app versions
   keep using Strapi and the vocab service: what they write there after a user's first sign-in to the new app is not
   copied again. Raise `APP_MIN_SUPPORTED_VERSION` to retire them, then stop Strapi and glotcast-vocab (keep their
   tables until you no longer need them).

**Rollback**: nothing in `public` was changed — the old app and Strapi keep working. Abandoning the new stack
entirely: `DROP SCHEMA app CASCADE;` (this also deletes every account's data created in it).
