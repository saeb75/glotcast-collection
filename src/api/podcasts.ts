import { type PodcastInput, podcastPageSchema, podcastSchema } from "@/schemas/admin"
import { api } from "./client"

export async function listPodcasts(params: { q?: string; page: number; pageSize: number }) {
  return podcastPageSchema.parse((await api.get("/v1/admin/podcasts", { params })).data)
}

export async function getPodcast(id: string) {
  return podcastSchema.parse((await api.get(`/v1/admin/podcasts/${id}`)).data)
}

export async function createPodcast(body: PodcastInput & { name: string }) {
  return podcastSchema.parse((await api.post("/v1/admin/podcasts", body)).data)
}

export async function updatePodcast(id: string, body: PodcastInput) {
  return podcastSchema.parse((await api.patch(`/v1/admin/podcasts/${id}`, body)).data)
}

/** 409 while the podcast still has episodes. */
export async function deletePodcast(id: string) {
  await api.delete(`/v1/admin/podcasts/${id}`)
}
