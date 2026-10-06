import { iso, type Stamp } from "../../common/rows"

export type PublishStatus = "draft" | "scheduled" | "published"

export function publishStatus(publishedAt: Stamp, now = new Date()): PublishStatus {
  if (publishedAt === null) return "draft"
  return new Date(iso(publishedAt)!).getTime() > now.getTime() ? "scheduled" : "published"
}
