# GlotCast — Admin

The operator panel for GlotCast, the English-learning podcast app where every episode comes in three levels
(bg / in / ad), each with its own audio and timed transcript. It replaces the Strapi admin (`../glotcast-panel`)
and absorbs the content tools of `../whisper-transcriber`. Next.js 16 (App Router) + React 19 + shadcn/ui,
talking to `../glotcast-api` (`/v1/admin/*`, contract: `../glotcast-api/docs/contract-v1.md`).

| Page | What it does |
|---|---|
| Dashboard `/` | users (total, guests, last 7 days), daily listeners over 30 days, published vs drafts, top episodes |
| Podcasts `/podcasts` · `/podcasts/new` · `/podcasts/:id` | search and pages; name, slug, description, ordered categories, cover (upload or generate), published; delete (refused while it has episodes) |
| Episodes `/episodes` · `/episodes/new` · `/episodes/:id` | filter by podcast and status, search; the episode editor (below) |
| Categories `/categories` | create, edit (name, slug, description, cover, order), delete |
| Lists `/lists` · `/lists/:id` | create, edit, delete; the episodes, picked and dragged into order |
| Home screen `/home` | the slider episodes, the home lists and the discover lists, each dragged into order |
| Users `/users` · `/users/:id` | search; profile, stats, the last 7 days, backend Pro (`featureAccess`) |
| Audit log `/audit` | every admin write and every user page or search opened; filter by action or record |

**The episode editor** — Details (podcast, title, number, description, Pro, cover and banner), publishing
(publish now, schedule, unpublish), then one tab per level:

1. **Audio**: upload a file — compressed to mono MP3 in the browser first (lamejs, 128 / 64 / 32 kbps; ported from
   whisper-transcriber) — PUT straight to R2 through a presigned URL (`POST /admin/media/presign`); or paste a URL.
2. **Transcription**: `POST /admin/transcribe`, then `GET /admin/transcribe/:id` every few seconds (AssemblyAI,
   speaker labels, word timings). It keeps polling while you work elsewhere in the panel.
3. **Lines**: utterances, sentences or paragraphs (switching is undoable).
4. **Transcript editor**: edit a line's text and speaker, nudge its start / end (±0.1 s, Shift ±1 s, ↑/↓ in the
   time field), set them to the playhead, split at the cursor (⌘↵), merge with the next line, delete; ⌘Z / ⌘⇧Z.
   Word timings survive edits that keep the words one-to-one. Problems (empty, backwards, overlapping lines) are
   flagged.
5. **Preview**: the player highlights the line being played and follows it; a click on a line plays from there.
   Space plays / pauses, ←/→ jump 5 s.
6. **Save**: `PUT /admin/episodes/:id/levels/:level` (`durationSec` comes from the audio element), ⌘S. Delete the
   level, or discard the changes.

The **Cover art** tab writes a prompt from any level's transcript (`POST /admin/covers/prompt`, five styles), draws it
(`POST /admin/covers/image`, Gemini or OpenAI, 3:4 / 4:3 / 1:1) and sets it as the cover or the banner. Podcasts get
the same generator from their description. ⌘K (Ctrl K) jumps to a page, a podcast or an episode.

## Run

```bash
npm install
cp .env.example .env.local        # NEXT_PUBLIC_SUPABASE_URL + NEXT_PUBLIC_SUPABASE_PUBLISHABLE_KEY
npm run dev                       # http://localhost:3001
```

The API runs on :3000 (`cd ../glotcast-api && npm run start:dev`, see its README). In development the panel calls
`/v1/…` on its own origin and `next dev` forwards it there (`API_PROXY_URL` to point elsewhere) — no CORS needed.
A build calls `NEXT_PUBLIC_API_URL` directly, so the API's `CORS_ORIGINS` must list the panel's origin
(its default, `http://localhost:3001`, matches `npm start`).

**Sign-in**: the email code of an existing Supabase account (`signInWithOtp({ shouldCreateUser: false })`, then
`verifyOtp`). `src/proxy.ts` (Next 16's name for `middleware.ts`) refreshes the session cookies and sends anyone
without a verified session to `/login`; the panel then asks `GET /v1/admin/me` — a 403 shows "No admin access".

**Granting an admin**: in the API (locally, or Coolify → the resource → Terminal → `api`):

```bash
node dist/cli.js admin grant you@example.com     # admin revoke <email> · admin list
```

The role reaches the token at the next sign-in or token refresh (the panel refreshes once when it gets a 403).

**Uploads** go from the browser straight to R2: the bucket's CORS policy must allow `PUT` from the panel's origin,
with the `Content-Type` header (playing and showing the files needs no CORS).

## Checks

`npm run typecheck` · `npm run lint` · `npm test` (the pure logic in `src/domain/`) · `npm run build`.
After an API change: `cd ../glotcast-api && npm run openapi`, then `npm run gen:schemas` here (orval, `admin` tag
only, into `src/schemas/api.gen.ts`).

## Deploy (Coolify)

`Dockerfile` (node:22-alpine, multi-stage, Next's `output: "standalone"` server on **port 3000**, runs as `node`,
healthcheck `/login`). It is the `admin` service of `../docker-compose.yml` at the repo root (build context
`./glotcast-admin`); `../glotcast-api/docs/deploy.md` walks through the resource. The three build arguments are baked
into the bundle, so mark them as **build variables** in Coolify:

| Build arg | Value |
|---|---|
| `NEXT_PUBLIC_API_URL` | `https://api.<domain>` (compose: `ADMIN_API_URL`) |
| `NEXT_PUBLIC_SUPABASE_URL` | `https://<project>.supabase.co` (compose: `SUPABASE_URL`) |
| `NEXT_PUBLIC_SUPABASE_PUBLISHABLE_KEY` | Project Settings → API Keys → Publishable key (compose: `SUPABASE_PUBLISHABLE_KEY`) |

Domain: `admin` → `https://admin.<domain>` (port 3000), and add that origin to the API's `CORS_ORIGINS` and to the
R2 bucket's CORS. On its own: `docker build -t glotcast-admin --build-arg NEXT_PUBLIC_API_URL=… --build-arg … .`

## Structure (binding)

Route (`src/app/(panel)/<area>/page.tsx`: a thin client page rendering a screen; `src/app/login/page.tsx`; the
panel layout is `shared/PanelLayout`) → Screen (`src/screens/<area>/`, reads stores, calls controllers) → Controller
(`src/controllers/`, static, stateless) → request (`src/api/<area>.ts`, one axios instance with the Supabase bearer)
→ `schema.parse` (`src/schemas/admin.ts` picks from the generated `api.gen.ts`, never edited; form schemas in
`schemas/forms.ts`) → Store (`src/stores/`, zustand: state + setters). Browser capabilities (Supabase Auth, R2
uploads, audio and image compression, the audio element, clipboard, toasts): `src/services/` (never know the store).
Pure logic: `src/domain/` (tested) — list queries live in the URL (`domain/lists.ts`), the transcript rules in
`domain/transcript.ts`, a level being edited in `domain/levelDraft.ts`. English copy: `src/copy/`. One component per
file in `src/screens/` and `src/shared/`; shared pieces: `PageHeader`, `TableCard`, `Pager`, `SearchField`,
`OptionSelect`, `PodcastSelect`, `EmptyState`, `ErrorState`, `StatCard`, `DailyBarChart`, `StatusBadge`,
`LevelBadges`, `CoverThumb`, `ImageField`, `CoverGenerator`, `EpisodePickerDialog`, `SortableList`, `ConfirmDialog`.
`src/components/ui/` and `src/hooks/` are shadcn CLI output (`radix-nova`) — add or update with
`npx shadcn@4.21.3 add <name>`, don't edit by hand. Colours come from the tokens in `src/app/globals.css` (neutral,
`brand` / `chart-1` GlotCast ember, `positive`, `warning`, `destructive`); light / dark / system via `next-themes`.
