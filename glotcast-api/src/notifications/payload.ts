import { createHash } from "node:crypto"
import { type Level } from "../database/schema/app"

export const PUSH_GROUPS = ["habit", "learning", "content", "campaign", "test"] as const
export type PushGroup = (typeof PUSH_GROUPS)[number]
export const NOTIFICATION_KINDS = [
  "reminder",
  "streak_saver",
  "learning",
  "new_episodes",
  "campaign",
  "test",
] as const
export type NotificationKind = (typeof NOTIFICATION_KINDS)[number]
export const SEND_STATUSES = [
  "queued",
  "sending",
  "sent",
  "failed",
  "unreachable",
  "expired",
  "canceled",
  "skipped",
] as const
export type SendStatus = (typeof SEND_STATUSES)[number]
export const LINK_TYPES = ["home", "episode", "podcast", "player", "paywall", "review", "words"] as const
export type LinkType = (typeof LINK_TYPES)[number]

/** Where a tap takes the user (contract: PushLink). */
export interface PushLink {
  type: LinkType
  id?: string
  level?: Level
}

/** The push's `additionalData` — what the app routes a tap on (contract: PushData). No per-user ids. */
export interface PushData {
  t: LinkType
  id?: string
  lv?: Level
  k: PushGroup
  ref: string
}

export const GROUP_OF: Record<NotificationKind, PushGroup> = {
  reminder: "habit",
  streak_saver: "habit",
  learning: "learning",
  new_episodes: "content",
  campaign: "campaign",
  test: "test",
}

/** The kinds that take the user's one daily habit/learning slot. */
export const DAILY_SLOT_KINDS: readonly NotificationKind[] = ["reminder", "streak_saver", "learning"]

/** How long OneSignal keeps trying to deliver: a reminder is stale after 2 h, news after a day. */
export const TTL_SECONDS: Record<PushGroup, number> = {
  habit: 2 * 3600,
  learning: 2 * 3600,
  content: 24 * 3600,
  campaign: 24 * 3600,
  test: 3600,
}

export const campaignRef = (campaignId: string): string => `c:${campaignId}`

export function pushData(link: PushLink, group: PushGroup, ref: string): PushData {
  return {
    t: link.type,
    ...(link.id ? { id: link.id } : {}),
    ...(link.level ? { lv: link.level } : {}),
    k: group,
    ref,
  }
}

export const linkOf = (data: Pick<PushData, "t" | "id" | "lv">): PushLink => ({
  type: data.t,
  ...(data.id ? { id: data.id } : {}),
  ...(data.lv ? { level: data.lv } : {}),
})

export interface Payload {
  language: string
  title: string
  body: string
  data: PushData
  imageUrl: string | null
}

/** Rows with the same hash get the very same push: one OneSignal request carries them all. */
export function payloadHash(p: Payload): string {
  const data = JSON.stringify(p.data, Object.keys(p.data).sort())
  return createHash("sha1")
    .update([p.language, p.title, p.body, data, p.imageUrl ?? ""].join("\u0000"))
    .digest("hex")
}
