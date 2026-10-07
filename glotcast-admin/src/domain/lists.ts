/** The list pages' queries as they live in the URL: parsing, defaults, the cache key, the request. */
import { keyOf, pickEnum, readPage, unlessAll, writeParams } from "./query"

export const PAGE_SIZE = 20

const text = (params: URLSearchParams, key: string) => (params.get(key) ?? "").trim()

// Podcasts
export interface PodcastsQuery {
  q: string
  page: number
}
export const parsePodcasts = (params: URLSearchParams): PodcastsQuery => ({
  q: text(params, "q"),
  page: readPage(params),
})
export const podcastsParams = (q: PodcastsQuery) => writeParams({ ...q }, { page: 1 })
export const podcastsKey = (q: PodcastsQuery) => keyOf(q.q, q.page)
export const podcastsRequest = (q: PodcastsQuery) => ({
  q: q.q || undefined,
  page: q.page,
  pageSize: PAGE_SIZE,
})

// Episodes
export const EPISODE_STATUSES = ["all", "published", "draft"] as const
export type EpisodeStatusFilter = (typeof EPISODE_STATUSES)[number]

export interface EpisodesQuery {
  q: string
  podcast: string // a podcast id or "all"
  status: EpisodeStatusFilter
  page: number
}
const EPISODE_DEFAULTS = { podcast: "all", status: "all", page: 1 } as const

export const parseEpisodes = (params: URLSearchParams): EpisodesQuery => ({
  q: text(params, "q"),
  podcast: text(params, "podcast") || "all",
  status: pickEnum(params.get("status"), EPISODE_STATUSES, "all"),
  page: readPage(params),
})
export const episodesParams = (q: EpisodesQuery) => writeParams({ ...q }, EPISODE_DEFAULTS)
export const episodesKey = (q: EpisodesQuery) => keyOf(q.q, q.podcast, q.status, q.page)
export const episodesRequest = (q: EpisodesQuery) => ({
  q: q.q || undefined,
  podcastId: unlessAll(q.podcast),
  status: unlessAll(q.status),
  page: q.page,
  pageSize: PAGE_SIZE,
})

// Users
export interface UsersQuery {
  q: string
  page: number
}
export const parseUsers = (params: URLSearchParams): UsersQuery => ({
  q: text(params, "q"),
  page: readPage(params),
})
export const usersParams = (q: UsersQuery) => writeParams({ ...q }, { page: 1 })
export const usersKey = (q: UsersQuery) => keyOf(q.q, q.page)
export const usersRequest = (q: UsersQuery) => ({ q: q.q || undefined, page: q.page, pageSize: PAGE_SIZE })

// Audit log
export interface AuditQuery {
  action: string // "all" or an action
  target: string // a record id, or ""
}
export const parseAudit = (params: URLSearchParams): AuditQuery => ({
  action: text(params, "action") || "all",
  target: text(params, "target"),
})
export const auditParams = (q: AuditQuery) => writeParams({ ...q }, { action: "all", target: "" })
export const auditKey = (q: AuditQuery) => keyOf(q.action, q.target)
export const auditRequest = (q: AuditQuery) => ({
  action: unlessAll(q.action),
  targetId: q.target || undefined,
})

// Push campaigns
export const CAMPAIGN_STATUSES = [
  "all",
  "draft",
  "scheduled",
  "sending",
  "sent",
  "canceled",
  "failed",
] as const
export type CampaignStatusFilter = (typeof CAMPAIGN_STATUSES)[number]

export interface CampaignsQuery {
  status: CampaignStatusFilter
  page: number
}
export const parseCampaigns = (params: URLSearchParams): CampaignsQuery => ({
  status: pickEnum(params.get("status"), CAMPAIGN_STATUSES, "all"),
  page: readPage(params),
})
export const campaignsParams = (q: CampaignsQuery) => writeParams({ ...q }, { status: "all", page: 1 })
export const campaignsKey = (q: CampaignsQuery) => keyOf(q.status, q.page)
export const campaignsRequest = (q: CampaignsQuery) => ({
  status: unlessAll(q.status),
  page: q.page,
  pageSize: PAGE_SIZE,
})

// The send log
export const SEND_KINDS = [
  "all",
  "reminder",
  "streak_saver",
  "learning",
  "new_episodes",
  "campaign",
  "test",
] as const
export type SendKindFilter = (typeof SEND_KINDS)[number]
export const SEND_STATUSES = [
  "all",
  "queued",
  "sending",
  "sent",
  "failed",
  "unreachable",
  "expired",
  "canceled",
  "skipped",
] as const
export type SendStatusFilter = (typeof SEND_STATUSES)[number]

const UUID_RE = /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i

export interface SendLogQuery {
  kind: SendKindFilter
  status: SendStatusFilter
  campaign: string // a campaign id or "all"
  user: string // a user id, or ""
}
const SEND_LOG_DEFAULTS = { kind: "all", status: "all", campaign: "all", user: "" } as const

export const parseSendLog = (params: URLSearchParams): SendLogQuery => ({
  kind: pickEnum(params.get("kind"), SEND_KINDS, "all"),
  status: pickEnum(params.get("status"), SEND_STATUSES, "all"),
  campaign: text(params, "campaign") || "all",
  user: text(params, "user"),
})
export const sendLogParams = (q: SendLogQuery) => writeParams({ ...q }, SEND_LOG_DEFAULTS)
export const sendLogKey = (q: SendLogQuery) => keyOf(q.kind, q.status, q.campaign, q.user)
/** Ids that aren't uuids are left out (the API would refuse the whole request). */
export const sendLogRequest = (q: SendLogQuery) => ({
  kind: unlessAll(q.kind),
  status: unlessAll(q.status),
  campaignId: UUID_RE.test(q.campaign) ? q.campaign : undefined,
  userId: UUID_RE.test(q.user) ? q.user.toLowerCase() : undefined,
})
