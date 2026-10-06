import { type ListInput, listDetailSchema, listsSchema } from "@/schemas/admin"
import { api } from "./client"

export async function listLists() {
  return listsSchema.parse((await api.get("/v1/admin/lists")).data)
}

export async function getList(id: string) {
  return listDetailSchema.parse((await api.get(`/v1/admin/lists/${id}`)).data)
}

export async function createList(body: ListInput & { name: string }) {
  return listDetailSchema.parse((await api.post("/v1/admin/lists", body)).data)
}

export async function updateList(id: string, body: ListInput) {
  return listDetailSchema.parse((await api.patch(`/v1/admin/lists/${id}`, body)).data)
}

export async function deleteList(id: string) {
  await api.delete(`/v1/admin/lists/${id}`)
}

/** Replaces the list's episodes, in this order. */
export async function setListEpisodes(id: string, episodeIds: string[]) {
  return listDetailSchema.parse((await api.put(`/v1/admin/lists/${id}/episodes`, { episodeIds })).data)
}
