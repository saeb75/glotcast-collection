import { auditSchema } from "@/schemas/admin"
import { api } from "./client"

/** What admins changed, newest first; `before` = the previous page's `nextBefore`. */
export async function getAudit(query: { action?: string; targetId?: string; before?: number }) {
  const params = { limit: 50, ...query }
  return auditSchema.parse((await api.get("/v1/admin/audit", { params })).data)
}
