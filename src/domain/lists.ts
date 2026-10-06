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
export const podcastsRequest = (q: PodcastsQuery) => ({ q: q.q || undefined, page: q.page, pageSize: PAGE_SIZE })

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
export const parseUsers = (params: URLSearchParams): UsersQuery => ({ q: text(params, "q"), page: readPage(params) })
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
