import { type PublishStatus } from "@/schemas/admin"

export const STATUS_LABELS: Record<PublishStatus, string> = {
  draft: "Draft",
  scheduled: "Scheduled",
  published: "Published",
}

export const LEVEL_LABELS = { bg: "Beginner", in: "Intermediate", ad: "Advanced" } as const
export const LEVEL_SHORT = { bg: "BG", in: "IN", ad: "AD" } as const
