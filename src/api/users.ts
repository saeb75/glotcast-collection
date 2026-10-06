import { userPageSchema, userSchema } from "@/schemas/admin"
import { api } from "./client"

/** App users, newest first; `q` = email, name or id prefix (searches are audited). */
export async function listUsers(params: { q?: string; page: number; pageSize: number }) {
  return userPageSchema.parse((await api.get("/v1/admin/users", { params })).data)
}

/** Profile and stats (audited). */
export async function getUser(id: string) {
  return userSchema.parse((await api.get(`/v1/admin/users/${id}`)).data)
}

/** Grants or removes backend Pro. */
export async function setFeatureAccess(id: string, featureAccess: boolean) {
  return userSchema.parse((await api.patch(`/v1/admin/users/${id}`, { featureAccess })).data)
}
