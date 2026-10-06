# GlotCast API v1 — contract

The single source of truth shared by `glotcast-api` (implements it), `glotcastapp` (mobile, consumes it) and
`glotcast-admin` (admin, consumes `/v1/admin/*`). Change this file first, then both sides.

Conventions
- Base path `/v1`. JSON, camelCase. Timestamps ISO-8601 strings (UTC). Durations and positions in **seconds** (float).
- IDs are UUIDs. Endpoints that take an episode/podcast id also accept the legacy Strapi `documentId`
  (deep links from the old app / AppsFlyer OneLink); responses always return the UUID.
- Errors: RFC 9457 `application/problem+json` `{ type, title, status, detail? }`.
- Auth: `Authorization: Bearer <Supabase access token>`. Anonymous (guest) Supabase sessions are valid users.
  - **public** = token optional (personal fields like `isFollowing` are false/empty without one)
  - **user** = token required (anonymous OK)
  - **admin** = token required, `app_metadata.role === "admin"`, never anonymous
- Pagination query: `page` (1-based, default 1), `pageSize` (default 20, max 50). Paginated response:
  `Page<T> = { items: T[]; page: number; pageSize: number; total: number; hasMore: boolean }`.

## Shared types

```ts
type Level = "bg" | "in" | "ad"            // beginner, intermediate, advanced

type PodcastSummary = {
  id: string; slug: string; name: string; coverUrl: string | null; episodeCount: number
}
type PodcastDetail = PodcastSummary & {
  description: string | null
  categories: CategoryRef[]
  isFollowing: boolean
  levels: Level[]                          // levels available across its episodes
}
type CategoryRef = { id: string; slug: string; name: string }
type Category = CategoryRef & { description: string | null; podcastCount: number; coverUrl: string | null }

type EpisodeLevelSummary = { level: Level; durationSec: number; description: string | null }
type EpisodeSummary = {
  id: string
  podcast: { id: string; name: string; coverUrl: string | null }
  number: number | null
  title: string
  coverUrl: string | null
  bannerUrl: string | null
  isPro: boolean
  publishedAt: string
  levels: EpisodeLevelSummary[]            // sorted bg, in, ad; only levels that have audio
}
type LevelProgress = { level: Level; positionSec: number; durationSec: number; completed: boolean; updatedAt: string }
type EpisodeDetail = EpisodeSummary & {
  description: string | null
  podcast: PodcastSummary
  levels: (EpisodeLevelSummary & { audioUrl: string })[]
  isFavorite: boolean
  progress: LevelProgress[]                // current user's per-level progress, [] for none
}

type TranscriptWord = { text: string; start: number; end: number }
type TranscriptChunk = {
  text: string
  speaker: string | null                   // "A", "B", … or null
  start: number                            // seconds
  end: number                              // seconds
  words?: TranscriptWord[]                 // present for newly transcribed levels only
}
type Transcript = { episodeId: string; level: Level; chunks: TranscriptChunk[] }

type ListPreview = { id: string; slug: string; name: string; description: string | null; total: number; episodes: EpisodeSummary[] }
type ProgressItem = { episode: EpisodeSummary } & LevelProgress
```

## App

| Method | Path | Auth | Response |
|---|---|---|---|
| GET | `/v1/health/live` | public | `{ ok: true }` |
| GET | `/v1/app/config` | public | `{ minSupportedVersion: string; latestVersion: string; freePreviewSeconds: 30; freeTranscriptChunks: 15 }` |

## Catalog

| Method | Path | Auth | Response |
|---|---|---|---|
| GET | `/v1/home?level=bg\|in\|ad` | public | `Home` |
| GET | `/v1/discover` | public | `{ categories: Category[]; lists: ListPreview[]; trending: EpisodeSummary[] }` |
| GET | `/v1/categories` | public | `Category[]` |
| GET | `/v1/podcasts?category=<slug>&page&pageSize` | public | `Page<PodcastSummary>` |
| GET | `/v1/podcasts/:id` | public | `PodcastDetail` |
| GET | `/v1/podcasts/:id/episodes?sort=asc\|desc&page&pageSize` | public | `Page<EpisodeSummary>` (sort by number, default asc) |
| GET | `/v1/episodes?feed=latest\|following\|trending&level=&page&pageSize` | public (`following` needs user) | `Page<EpisodeSummary>` |
| GET | `/v1/episodes/:id` | public | `EpisodeDetail` |
| GET | `/v1/episodes/:id/transcript?level=bg` | public | `Transcript` |
| GET | `/v1/lists/:slug?page&pageSize` | public | `{ list: { id; slug; name; description }; episodes: Page<EpisodeSummary> }` |
| GET | `/v1/search?q=<min 2 chars>` | public | `{ podcasts: PodcastSummary[]; episodes: EpisodeSummary[] }` (max 10 each, case/accent-insensitive on name/title/description) |

```ts
type Home = {
  slider: EpisodeSummary[]                 // project slider, bannerUrl set
  continueListening: ProgressItem[]        // user only, most recent first, not completed, max 10
  forYourLevel: EpisodeSummary[]           // newest episodes that have `level` (query or user's level), max 10
  lists: ListPreview[]                     // home lists in configured order, 10 episodes each
  following: EpisodeSummary[]              // newest episode per followed podcast, max 10
  latest: EpisodeSummary[]                 // newest 10
}
```
Trending = most distinct listeners in `listening_progress` over the last 14 days (fallback: latest).

## Me (user)

```ts
type Me = {
  id: string; isAnonymous: boolean; email: string | null; name: string | null; avatarUrl: string | null
  nativeLanguage: string | null            // BCP-47-ish code, e.g. "tr", "pt-BR"
  uiLanguage: string | null
  translationLanguage: string | null
  level: Level                             // default "bg"
  dailyGoalMin: number                     // default 10
  interests: string[]
  motivation: "career" | "travel" | "exams" | "fun" | "other" | null
  reminderTime: string | null              // "HH:mm" local
  featureAccess: boolean                   // backend-granted Pro
  createdAt: string
}
type DayStats = { date: string; seconds: number }   // date = user's local "YYYY-MM-DD"
type Stats = {
  streakDays: number; bestStreakDays: number
  todaySec: number; dailyGoalSec: number; goalMetToday: boolean
  totalSec: number; episodesCompleted: number
  wordsTotal: number; wordsMastered: number; wordsDue: number
  last7Days: DayStats[]                    // oldest → today, zero-filled
}
```
A streak day = a local day with `seconds >= 60`. The streak counts back from today (or from yesterday if today
has no qualifying listening yet).

| Method | Path | Auth | Body / Response |
|---|---|---|---|
| GET | `/v1/me` | user | `Me` |
| PATCH | `/v1/me` | user | partial of `name, nativeLanguage, uiLanguage, translationLanguage, level, dailyGoalMin, interests, motivation, reminderTime` → `Me` |
| DELETE | `/v1/me` | user | 204. Deletes all app rows and the Supabase auth user |
| POST | `/v1/me/claim-guest` | user (non-anonymous) | `{ guestAccessToken: string }` → `{ moved: { progress: number; words: number; follows: number; favorites: number } }`. Verifies the token is an anonymous user, moves its rows to the caller (caller wins on conflict), deletes the guest |
| GET | `/v1/me/stats?date=YYYY-MM-DD` | user | `Stats` (`date` = client's local today) |
| POST | `/v1/me/listening` | user | `{ episodeId; level; positionSec; durationSec; listenedSec; date: "YYYY-MM-DD" }` → `{ progress: LevelProgress; today: DayStats; goalMetNow: boolean }`. `listenedSec` = delta since last heartbeat, clamped to [0, 120]. Completed when `positionSec >= durationSec * 0.95`. `goalMetNow` true only on the heartbeat that crosses the goal |
| GET | `/v1/me/progress?status=in_progress\|completed\|all&page&pageSize` | user | `Page<ProgressItem>` (most recent first) |
| GET | `/v1/me/follows?page&pageSize` | user | `Page<PodcastSummary>` |
| PUT | `/v1/me/follows/:podcastId` | user | 204 (idempotent) |
| DELETE | `/v1/me/follows/:podcastId` | user | 204 |
| GET | `/v1/me/favorites?page&pageSize` | user | `Page<EpisodeSummary>` |
| PUT | `/v1/me/favorites/:episodeId` | user | 204 |
| DELETE | `/v1/me/favorites/:episodeId` | user | 204 |

## Translation (user)

| Method | Path | Body | Response |
|---|---|---|---|
| POST | `/v1/translate/transcript` | `{ episodeId; level; target }` | `{ target; chunks: string[] }` index-aligned with `Transcript.chunks`. Cached per (episode, level, target) |
| POST | `/v1/translate/text` | `{ texts: string[] (1–100); target }` | `{ target; texts: string[] }` |

Server uses Google Cloud Translation v2 (`source: "en"`, `format: "text"`). The key never ships in the app.
Rate limit per user.

## Words / Leitner (user)

```ts
type WordLookup = {
  word: string; lemma: string; phonetic: string | null; audioUrl: string | null
  translations: { partOfSpeech: string | null; terms: string[] }[]
  definitions: { partOfSpeech: string | null; definition: string; example: string | null }[]
}
type SavedWord = {
  id: string; word: string; meaning: string; phonetic: string | null; audioUrl: string | null
  detail: unknown | null; language: string
  box: 1 | 2 | 3 | 4 | 5; nextReviewAt: string; lastReviewedAt: string | null
  correctCount: number; incorrectCount: number; createdAt: string
  source: { episodeId: string; level: Level; chunkIndex: number } | null
}
```
Leitner: known → box+1 (max 5), unknown → box 1. Next review after 1/2/4/8/16 days for boxes 1–5. A new word is
box 1, due now.

| Method | Path | Body / Response |
|---|---|---|
| POST | `/v1/words/lookup` | `{ word; target }` → `WordLookup` |
| GET | `/v1/words?box=1..5&q=&page&pageSize` | `Page<SavedWord>` newest first |
| GET | `/v1/words/stats` | `{ total; byBox: { "1": n, "2": n, "3": n, "4": n, "5": n }; due: number }` |
| POST | `/v1/words` | `{ word; meaning; language; phonetic?; audioUrl?; detail?; source? }` → `SavedWord` (upsert on user+lower(word)) |
| DELETE | `/v1/words/:id` | 204 |
| GET | `/v1/words/review` | `SavedWord[]` due now (max 100, oldest due first) |
| POST | `/v1/words/:id/review` | `{ known: boolean }` → `SavedWord` |

## Admin (`/v1/admin/*`, admin)

All writes are audited (`app.admin_audit`). Tag: `admin` (OpenAPI), excluded from the mobile orval build.

- `GET /admin/me` → `{ id; email }` (200 = admin, 403 otherwise)
- `GET /admin/dashboard` → `{ users: { total; anonymous; last7Days }; dau: DayCount[] (30d); episodes: { published; drafts }; topEpisodes: { episode: EpisodeSummary; listeners: number }[] }`
- Podcasts: `GET /admin/podcasts?q&page`, `POST /admin/podcasts`, `GET|PATCH|DELETE /admin/podcasts/:id`
- Episodes: `GET /admin/episodes?q&podcastId&status=published|draft&page`, `POST /admin/episodes`,
  `GET|PATCH|DELETE /admin/episodes/:id`, `POST /admin/episodes/:id/publish`, `POST /admin/episodes/:id/unpublish`
- Levels: `PUT /admin/episodes/:id/levels/:level` `{ audioUrl; durationSec; description?; transcript: { chunks } }`, `DELETE /admin/episodes/:id/levels/:level`
- Categories: `GET|POST /admin/categories`, `PATCH|DELETE /admin/categories/:id`
- Lists: `GET|POST /admin/lists`, `GET|PATCH|DELETE /admin/lists/:id`, `PUT /admin/lists/:id/episodes` `{ episodeIds: string[] }` (ordered)
- Home config: `GET|PUT /admin/home-config` `{ sliderEpisodeIds: string[]; homeListIds: string[]; exploreListIds: string[] }`
- Users: `GET /admin/users?q&page`, `GET /admin/users/:id` (profile + stats), `PATCH /admin/users/:id` `{ featureAccess }`
- Media: `POST /admin/media/presign` `{ folder: "podcasts"|"images"; filename; contentType }` → `{ uploadUrl; publicUrl; expiresAt }` (R2 presigned PUT)
- Pipeline:
  - `POST /admin/transcribe` `{ audioUrl }` → `{ jobId }`; `GET /admin/transcribe/:jobId` → `{ status: "queued"|"processing"|"completed"|"error"; error?; durationSec?; utterances?; sentences?; paragraphs? }` where each grouping is `TranscriptChunk[]` (with `words`)
  - `POST /admin/covers/prompt` `{ podcastName; episodeTitle; transcriptText; style }` → `{ prompt }`
  - `POST /admin/covers/image` `{ prompt; model: "gemini"|"openai"; aspect: "3:4"|"4:3"|"1:1" }` → `{ url }` (uploaded to R2 `images/`)
