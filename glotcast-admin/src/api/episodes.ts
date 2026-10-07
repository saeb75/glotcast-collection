import {
  type AdminEpisode,
  type EpisodeCreateInput,
  type EpisodeInput,
  episodeDetailSchema,
  episodePageSchema,
  episodeSchema,
  type Level,
  type LevelInput,
  type PublishInput,
} from "@/schemas/admin"
import { api } from "./client"

export async function listEpisodes(params: {
  q?: string
  podcastId?: string
  status?: "published" | "draft"
  page: number
  pageSize: number
}) {
  return episodePageSchema.parse((await api.get("/v1/admin/episodes", { params })).data)
}

/**
 * Episodes known only by id (the home slider, a push's link): found by paging the list, newest first —
 * without their transcripts. Ids not among the latest 1,500 stay unknown.
 */
export async function findEpisodes(ids: string[]): Promise<AdminEpisode[]> {
  const missing = new Set(ids)
  const found: AdminEpisode[] = []
  for (let page = 1; missing.size > 0 && page <= 30; page++) {
    const result = await listEpisodes({ page, pageSize: 50 })
    for (const e of result.items) if (missing.delete(e.id)) found.push(e)
    if (!result.hasMore) break
  }
  return found
}

/** The episode with every level's transcript (can be a few MB). */
export async function getEpisode(id: string) {
  return episodeDetailSchema.parse((await api.get(`/v1/admin/episodes/${id}`, { timeout: 60_000 })).data)
}

export async function createEpisode(body: EpisodeCreateInput) {
  return episodeDetailSchema.parse((await api.post("/v1/admin/episodes", body)).data)
}

export async function updateEpisode(id: string, body: EpisodeInput) {
  return episodeDetailSchema.parse(
    (await api.patch(`/v1/admin/episodes/${id}`, body, { timeout: 60_000 })).data,
  )
}

export async function deleteEpisode(id: string) {
  await api.delete(`/v1/admin/episodes/${id}`)
}

/** Live now; `notifyFollowers` (absent: kept as it is) decides whether its followers get a push. */
export async function publishEpisode(id: string, body: PublishInput = {}) {
  return episodeSchema.parse((await api.post(`/v1/admin/episodes/${id}/publish`, body)).data)
}

/** Back to draft. */
export async function unpublishEpisode(id: string) {
  return episodeSchema.parse((await api.post(`/v1/admin/episodes/${id}/unpublish`)).data)
}

/** Creates or replaces a level (audio, duration, timed transcript); answers the whole episode. */
export async function putLevel(id: string, level: Level, body: LevelInput) {
  return episodeDetailSchema.parse(
    (await api.put(`/v1/admin/episodes/${id}/levels/${level}`, body, { timeout: 120_000 })).data,
  )
}

export async function deleteLevel(id: string, level: Level) {
  await api.delete(`/v1/admin/episodes/${id}/levels/${level}`)
}
