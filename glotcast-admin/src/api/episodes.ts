import {
  type EpisodeCreateInput,
  type EpisodeInput,
  episodeDetailSchema,
  episodePageSchema,
  episodeSchema,
  type Level,
  type LevelInput,
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

/** Live now. */
export async function publishEpisode(id: string) {
  return episodeSchema.parse((await api.post(`/v1/admin/episodes/${id}/publish`)).data)
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
