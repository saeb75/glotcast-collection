# GlotCast API v1 — contract

The single source of truth shared by `glotcast-api` (implements it), `glotcastapp` (mobile, consumes it) and
`glotcast-admin` (admin, consumes `/v1/admin/*`). Change this file first, then both sides.

Conventions
- Base path `/v1`. JSON, camelCase. Timestamps ISO-8601 strings (UTC). Durations and positions in **seconds** (float).
- IDs are UUIDs. Endpoints that take an episode/podcast id also accept the legacy Strapi `documentId`
  (deep links from the old app / AppsFlyer OneLink); responses always return the UUID.
- Errors: RFC 9457 `application/problem+json` `{ type, title, status, detail?, instance }`; a 400 from validation adds
  `errors` (the failed fields). 429 = rate limited (`Retry-After` header and `retryAfter` seconds).
- Auth: `Authorization: Bearer <Supabase access token>`. Anonymous (guest) Supabase sessions are valid users.
  - **public** = token optional (personal fields like `isFollowing` are false/empty without one); a token that is
    sent must be valid (401 otherwise), so an expired session is noticed
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
| GET | `/v1/episodes/:id/transcript?level=bg` | public | `Transcript` (`level` required; 404 when the episode has no such level) |
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
  timezone: string | null                  // IANA, e.g. "Europe/Istanbul" (reported by the device)
  pushEnabled: boolean                     // the device is opted in to push (OneSignal), reported by the device
  notifyReminders: boolean                 // daily reminder + streak saver (default true)
  notifyLearning: boolean                  // words due, finish an episode, weekly recap (default true)
  notifyNewEpisodes: boolean               // new episodes of followed podcasts (default true)
  notifyNews: boolean                      // admin campaigns: news & offers (default true)
  proActive: boolean                       // the app sees an active subscription; targeting only, never grants access
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

Legacy accounts: the first authenticated request of a registered (non-anonymous) account copies the data of the
old Strapi account with the same email (case-insensitive) — podcast subscriptions → follows, saved words with their
Leitner boxes → words, `featureAccess` — once. `claim-guest` also does it if it never happened.

| Method | Path | Auth | Body / Response |
|---|---|---|---|
| GET | `/v1/me` | user | `Me` |
| PATCH | `/v1/me` | user | partial of `name, nativeLanguage, translationLanguage, level, dailyGoalMin, interests, motivation, reminderTime` (profile fields) and `uiLanguage, timezone, pushEnabled, notifyReminders, notifyLearning, notifyNewEpisodes, notifyNews, proActive` (device/notification fields, synced by the app) → `Me`. An unknown `timezone` is a 400. Only profile fields mark the profile as set (see `claim-guest`) |
| DELETE | `/v1/me` | user | 204. Deletes all app rows and the Supabase auth user |
| POST | `/v1/me/claim-guest` | user (non-anonymous) | `{ guestAccessToken: string }` → `{ moved: { progress: number; words: number; follows: number; favorites: number } }`. Verifies the token is an anonymous user, moves its rows to the caller (caller wins on conflict; listening seconds of the same day are added up), deletes the guest. The guest's onboarding answers (level, languages, goal, interests, motivation, reminder) replace the profile of an account that never PATCHed a profile field of `/v1/me`, otherwise only fill its empty fields (a `uiLanguage` is never replaced by none). The guest's `timezone` fills an empty one, the newer push opt-in wins, and its pushes of the day count toward the account's caps. 403 for an anonymous caller or a non-anonymous `guestAccessToken`, 401 for an invalid one |
| GET | `/v1/me/stats?date=YYYY-MM-DD` | user | `Stats` (`date` = client's local today; default: today in UTC) |
| POST | `/v1/me/listening` | user | `{ episodeId; level; positionSec; durationSec; listenedSec; date: "YYYY-MM-DD" }` → `{ progress: LevelProgress; today: DayStats; goalMetNow: boolean; milestone: number \| null }`. `listenedSec` = delta since last heartbeat, clamped to [0, 120]. Completed when `positionSec >= durationSec * 0.95`. `goalMetNow` true only on the heartbeat that crosses the goal. `milestone` = the streak length (7, 30, 100, 365) on the heartbeat that makes today a streak day and reaches it, else null |
| GET | `/v1/me/progress?status=in_progress\|completed\|all&page&pageSize` | user | `Page<ProgressItem>` (most recent first) |
| GET | `/v1/me/follows?page&pageSize` | user | `Page<PodcastSummary>` |
| PUT | `/v1/me/follows/:podcastId` | user | 204 (idempotent) |
| DELETE | `/v1/me/follows/:podcastId` | user | 204 |
| GET | `/v1/me/favorites?page&pageSize` | user | `Page<EpisodeSummary>` |
| PUT | `/v1/me/favorites/:episodeId` | user | 204 |
| DELETE | `/v1/me/favorites/:episodeId` | user | 204 |
| POST | `/v1/me/notifications/opened` | user | `{ ref: string }` → 204. The app reports a tapped push (`PushData.ref`); marks the newest matching send of the last 3 days as opened (no-op when none) |

## Push notifications

The API decides who gets which push and when; OneSignal only delivers. The app logs every user — guests included —
in to OneSignal with `OneSignal.login(<Supabase user id>)` (external id), so the API targets users by id. The text
is rendered by the API in the user's `uiLanguage` (fallback `en`). Times are the user's local time (`timezone`);
users without a `timezone` or with `pushEnabled = false` get no automated pushes.

```ts
type Locale = "ar" | "de" | "en" | "es" | "fr" | "hi" | "id" | "it" | "ja" | "ko" | "pl" | "pt" | "ru" | "tr" | "vi" | "zh"
type PushGroup = "habit" | "learning" | "content" | "campaign" | "test"
type NotificationKind = "reminder" | "streak_saver" | "learning" | "new_episodes" | "campaign" | "test"
type PushLink = { type: "home" | "episode" | "podcast" | "player" | "paywall" | "review" | "words"; id?: string; level?: Level }
// The push's `additionalData` (OneSignal) — what the app routes on a tap:
type PushData = {
  t: PushLink["type"]; id?: string; lv?: Level
  k: PushGroup
  ref: string                              // kind ("reminder", "new_episodes", …) or "c:<campaignId>"; sent back to …/opened
}
```
- `player` opens the player for episode `id` at level `lv`; `episode`/`podcast` open those pages; `paywall`, `review`
  (Leitner review session), `words` (Words tab), `home`.
- Automations (each switched on/off in the admin; all start off):
  - `reminder` (group habit) at the user's `reminderTime` when `notifyReminders`: skipped when today's goal is met
    (then a words-due push if enough are due) or the user is listening right now; otherwise the most relevant of:
    weekly recap (Sunday), streak (≥ 3 days), continue an episode, words due, a new episode at their level, generic.
  - `streak_saver` (habit) at a fixed evening time when `notifyReminders`: only with a streak, nothing listened today
    and no reminder/learning push sent today (nor the user's own reminder still to come that evening).
  - `learning` at a fixed time for users without a reminder (or with `notifyReminders` off) when `notifyLearning`:
    weekly recap (Sunday), words due, or finish an episode; nothing otherwise.
  - `new_episodes` (content) when `notifyNewEpisodes`: once an episode is live (published now, or its scheduled
    `publishedAt` passed) and the admin left "notify followers" on, its podcast's followers who haven't started it get
    one push (several new episodes are bundled), at most one a day.
- Caps per user and local day: at most one `reminder`/`learning`/`streak_saver` push, at most two pushes in total.
  Campaigns (an admin's decision) are not held back by the caps but count toward them; test pushes don't count.
  Quiet hours 22:00–08:00 (the user's own `reminderTime` is always allowed; campaigns are deferred to 08:00).
- Campaigns (admin) reach users with `notifyNews` and `pushEnabled`.

## Translation (user)

| Method | Path | Body | Response |
|---|---|---|---|
| POST | `/v1/translate/transcript` | `{ episodeId; level; target }` | `{ target; chunks: string[] }` index-aligned with `Transcript.chunks`. Cached per (episode, level, target) |
| POST | `/v1/translate/text` | `{ texts: string[] (1–100); target }` | `{ target; texts: string[] }` |

Server uses Google Cloud Translation v2 (`source: "en"`, `format: "text"`). The key never ships in the app.
Rate limit per user: 30/min for `transcript`, 60/min for `text` (and 60/min for `/v1/words/lookup`). `target` is a
BCP-47-ish code; regional variants Google does not distinguish share a cache entry (`pt-BR` → `pt`), `en` returns the
source text.

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
| POST | `/v1/words` | `{ word; meaning; language; phonetic?; audioUrl?; detail?; source? }` → 201 `SavedWord` (upsert on user+lower(word): the content is updated, the Leitner state and the first `source` are kept) |
| DELETE | `/v1/words/:id` | 204 |
| GET | `/v1/words/review` | `SavedWord[]` due now (max 100, oldest due first) |
| POST | `/v1/words/:id/review` | `{ known: boolean }` → `SavedWord` |

## Admin (`/v1/admin/*`, admin)

All writes are audited (`app.admin_audit`; `GET /admin/audit?action&targetId&actorId&limit&before` reads it). Tag:
`admin` (OpenAPI), excluded from the mobile orval build. Lists take `page`/`pageSize` like the app's and return
`Page<T>`. The request and response types are in the appendix below.

- `GET /admin/me` → `{ id; email }` (200 = admin, 403 otherwise)
- `GET /admin/dashboard` → `{ users: { total; anonymous; last7Days }; dau: DayCount[] (30d); episodes: { published; drafts }; topEpisodes: { episode: EpisodeSummary; listeners: number }[] }`
- Podcasts: `GET /admin/podcasts?q&page`, `POST /admin/podcasts`, `GET|PATCH|DELETE /admin/podcasts/:id`
- Episodes: `GET /admin/episodes?q&podcastId&status=published|draft&page`, `POST /admin/episodes`,
  `GET|PATCH|DELETE /admin/episodes/:id`, `POST /admin/episodes/:id/publish` (optional body `{ notifyFollowers?: boolean }`),
  `POST /admin/episodes/:id/unpublish`
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
- Notifications (`/admin/notifications/*`):
  - `GET status` → `NotificationsStatus`
  - `GET|PUT automations` → `AutomationsView` (PUT body: `AutomationSettings`)
  - Campaigns: `GET campaigns?status&page`, `POST campaigns`, `GET|PATCH|DELETE campaigns/:id`,
    `POST campaigns/:id/send` `{ delivery: CampaignDelivery }`, `POST campaigns/:id/cancel`,
    `POST campaigns/:id/test` `{ language?: Locale; userId?: string; email?: string }` → `{ onesignalId: string | null }`,
    `GET campaigns/:id/stats?refresh=1` → `CampaignStats`
  - `POST translate` `{ source: "en"|"tr"; title; body }` → `{ messages: Record<Locale, CampaignMessage> }`
  - `POST reach` `{ audience: Audience }` → `{ matched: number; reachable: number; byLanguage: { language: Locale; reachable: number }[] }`
  - `GET sends?kind&status&campaignId&userId&limit&before` → `{ entries: SendRow[]; nextBefore?: number }` (newest first)

## Appendix: admin shapes

```ts
type PublishStatus = "draft" | "scheduled" | "published"   // no date / a date to come / live
type AdminPodcast = {
  id; slug; name; description: string | null; coverUrl: string | null; categories: CategoryRef[]
  status: PublishStatus; publishedAt: string | null; episodeCount: number; publishedEpisodeCount: number
  legacyDocumentId: string | null; createdAt; updatedAt
}
// POST (PATCH = partial): new podcasts are drafts; their episodes are visible only once the podcast is published
type PodcastInput = { name; slug?; description?; coverUrl?; categoryIds?: string[] /* ordered, replaces */; published?: boolean }

type AdminEpisodeLevel = { level: Level; audioUrl; durationSec; description: string | null; chunkCount: number;
                           hasWordTimings: boolean; updatedAt }
type AdminEpisode = {
  id; podcast: { id; name }; number: number | null; title; description: string | null; coverUrl: string | null
  bannerUrl: string | null; isPro: boolean; status: PublishStatus; publishedAt: string | null
  legacyDocumentId: string | null; levels: AdminEpisodeLevel[]; createdAt; updatedAt
  notifyFollowers: boolean; followersNotifiedAt: string | null      // when it was seen live and its followers' push
                                                                     // planned (once, never cleared; null while not live
                                                                     // or with notifyFollowers off)
}
type AdminEpisodeDetail = AdminEpisode & { levels: (AdminEpisodeLevel & { transcript: { chunks: TranscriptChunk[] } })[] }
// POST (PATCH = partial). publishedAt: future = scheduled, null = draft; …/publish = live now
type EpisodeInput = { podcastId; title; number?; description?; coverUrl?; bannerUrl?; isPro? /* default true */; publishedAt?;
                      notifyFollowers? /* default true: push followers when it goes live */ }
// GET /admin/episodes → Page<AdminEpisode>; GET|POST|PATCH /admin/episodes/:id and PUT …/levels/:level → AdminEpisodeDetail;
// …/publish, …/unpublish → AdminEpisode. PUT …/levels/:level drops that level's cached translations.

type AdminCategory = { id; slug; name; description: string | null; coverUrl: string | null; position: number;
                       podcastCount: number; createdAt; updatedAt }
type CategoryInput = { name; slug?; description?; coverUrl?; position? }          // GET → AdminCategory[]

type AdminList = { id; slug; name; description: string | null; episodeCount: number; legacyDocumentId: string | null; createdAt; updatedAt }
type AdminEpisodeRef = { id; title; number: number | null; podcast: { id; name }; coverUrl: string | null;
                         status: PublishStatus; publishedAt: string | null }
type AdminListDetail = AdminList & { episodes: AdminEpisodeRef[] }               // GET /admin/lists → AdminList[]
type ListInput = { name; slug?; description? }

type AdminUserRow = { id; email: string | null; name: string | null; isAnonymous: boolean; level: Level;
                      featureAccess: boolean; legacyStrapiUserId: number | null; createdAt; lastSeenAt }
type AdminUser = { user: Me & { lastSeenAt; legacyStrapiUserId: number | null }; stats: Stats }   // GET|PATCH /admin/users/:id
type DayCount = { date: string; count: number }

// Notifications
type NotificationsStatus = { configured: boolean /* OneSignal keys set */; enabled: boolean /* NOTIFICATIONS_ENABLED */;
                             lastTickAt: string | null; queued: number }
type AutomationSettings = {
  quietHours: { from: string; to: string }                       // "HH:mm", default 22:00–08:00
  reminder: { enabled: boolean; weeklyRecap: boolean; minDue: number /* 5 */ }
  streakSaver: { enabled: boolean; time: string /* "21:00" */; minStreak: number /* 2 */ }
  learning: { enabled: boolean; time: string /* "18:00" */ }
  newEpisodes: { enabled: boolean; debounceMin: number /* 15 */; freshHours: number /* 36 */ }
}
type AutomationsView = { settings: AutomationSettings; status: NotificationsStatus;
                         last7Days: { kind: NotificationKind; sent: number; opened: number }[] }
type CampaignMessage = { title: string /* ≤ 60 */; body: string /* ≤ 180 */ }
type Audience = {
  segment: "all" | "pro" | "free" | "guests" | "signedIn"          // pro = featureAccess or proActive
  levels?: Level[]; languages?: Locale[]                           // app language
  inactiveDays?: number; activeWithinDays?: number                 // by last seen
  podcastIds?: string[]                                            // followers of any of these
}
type CampaignDelivery = { mode: "now" } | { mode: "at"; sendAt: string }
                      | { mode: "local"; date: string /* YYYY-MM-DD */; time: string /* HH:mm, each user's local time */ }
type CampaignStatus = "draft" | "scheduled" | "sending" | "sent" | "canceled" | "failed"
type AdminCampaign = {
  id; name; status: CampaignStatus; sourceLanguage: "en" | "tr"
  messages: Partial<Record<Locale, CampaignMessage>>              // a user's language falls back to en, then the source
  audience: Audience; link: PushLink; imageUrl: string | null; respectQuietHours: boolean
  delivery: CampaignDelivery | null; recipients: number | null; sentAt: string | null
  createdBy: { id; email: string | null } | null; createdAt; updatedAt
}
// POST (PATCH = partial, drafts only → 409 otherwise); DELETE: drafts and finished campaigns
type CampaignInput = { name; sourceLanguage; messages; audience; link; imageUrl?; respectQuietHours? /* default true */ }
type CampaignStats = {
  recipients: number; queued: number; sent: number; failed: number; unreachable: number; skipped: number; opened: number
  onesignal: { successful: number; failed: number; errored: number; converted: number; received: number } | null
  byLanguage: { language: Locale; recipients: number; opened: number }[]
  refreshedAt: string | null
}
type SendStatus = "queued" | "sending" | "sent" | "failed" | "unreachable" | "expired" | "canceled" | "skipped"
type SendRow = {
  id: number; user: { id; email: string | null; isAnonymous: boolean }
  kind: NotificationKind; variant: string | null; campaignId: string | null
  status: SendStatus; skipReason: string | null; language: Locale; title; body; link: PushLink
  localDate: string; dueAt: string; sentAt: string | null; openedAt: string | null; createdAt
}
```
- Notifications: `campaigns/:id/send` needs a message in the source language (400) and OneSignal configured and
  `NOTIFICATIONS_ENABLED` (503); `mode: "now"` and `"at"` defer users in quiet hours to their 08:00 when
  `respectQuietHours`; `"local"` skips users whose time passed more than an hour ago. `cancel` stops queued rows of a
  `scheduled`/`sending` campaign. `test` sends the campaign (language: the given one, else the recipient's) to one
  user — the caller when no `userId`/`email` — right away, ignoring caps (409 `no_subscription` when that user has no
  push subscription; 404 when the user has no app account; 503 when OneSignal is not configured). `translate` uses
  Google Translation (texts over the limits are cut with "…"); `reach` counts users matching the audience
  (`matched`) and those of them with push on and `notifyNews` (`reachable`).
- `send`, `PATCH`: 409 unless the campaign is a draft; `send` with `mode: "at"` in the past is a 400. A campaign is
  `scheduled` until it is expanded into sends (now, at `sendAt`, or — for `"local"` — once the first time zone reaches
  the date and time), `sending` while sends are queued, then `sent` (`failed` when nothing could be sent).
- `CampaignStats`: `queued` includes sends in flight, `failed` includes expired ones, `skipped` includes canceled
  ones; `onesignal` sums OneSignal's numbers over the campaign's requests (cached 5 minutes, `refresh=1` asks now).
- Slugs default to the name (`-2`, `-3`… when taken); an explicit slug that is taken is a 409. A podcast that still
  has episodes cannot be deleted (409). Deleting an episode or a list also removes it from the home config.
- `PUT /admin/home-config`: every id must exist (400 otherwise); drafts are allowed (the app skips what is hidden).
- Dashboard: `dau` = distinct listeners per day (the users' local dates) for the 30 days up to today (UTC), oldest
  first;
  `topEpisodes` = most distinct listeners over the last 30 days (max 10).
- `POST /admin/media/presign`: `contentType` must be `audio/*` or `image/*`; the URL is valid 15 minutes; PUT the
  file with that same `Content-Type`.
- `POST /admin/transcribe` → 201. `covers/prompt`: `style` ∈ `vibrant-gradient | cinematic-photo | minimal-editorial
  | risograph | bold-pop` (default `vibrant-gradient`); `covers/image`: `model` defaults to `gemini`.

## Changelog

- v1.1.0 (push notifications):
  - `Me` gains `timezone`, `pushEnabled`, `notifyReminders`, `notifyLearning`, `notifyNewEpisodes`, `notifyNews`,
    `proActive` (PATCHable); device fields — these and `uiLanguage`, which the app syncs — no longer mark the profile
    as set;
  - `POST /v1/me/listening` returns `milestone`; `POST /v1/me/notifications/opened`;
  - the Push notifications section (`PushData`, automations, caps);
  - admin: `/admin/notifications/*`, `notifyFollowers` on episodes and on `…/publish`;
  - implementation notes: campaigns are not capped but count toward the caps; the streak saver leaves the evening to
    a later reminder; `followersNotifiedAt` stays null with `notifyFollowers` off; campaign status lifecycle, `send`
    and `test` errors, `translate` cutting to the limits, what `CampaignStats` buckets count.

- v1.0.1 (glotcast-api, first implementation) — clarifications, no breaking change:
  - errors carry `instance` (and `errors` on validation failures); 429 with `Retry-After`;
  - a token sent to a public route must be valid;
  - transcript `level` is required; `/v1/me/stats` `date` defaults to today (UTC);
  - claim-guest: same-day listening seconds add up, the guest's onboarding answers fill the account's profile,
    error statuses; legacy Strapi data is imported on a registered account's first request (and by claim-guest);
  - translation `target` normalization and the per-user rate limits;
  - `POST /v1/words` answers 201 and keeps the Leitner state and the first `source`;
  - `GET /admin/audit` added; the admin request/response shapes (appendix).

