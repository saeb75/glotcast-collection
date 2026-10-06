import { adminMeSchema, dashboardSchema } from "@/schemas/admin"
import { api } from "./client"

/** The signed-in admin; 403 for any other account. */
export async function getMe() {
  return adminMeSchema.parse((await api.get("/v1/admin/me")).data)
}

/** Users, daily listeners (30 days), published vs drafts, the most listened episodes. */
export async function getDashboard() {
  return dashboardSchema.parse((await api.get("/v1/admin/dashboard")).data)
}
