import { z } from "zod"
import { levelSchema } from "../catalog/catalog.dto"
import { isDate } from "../common/dates"
import { type Locale, LOCALES } from "./locales"
import { type Audience } from "./audience"
import { campaignRef, LINK_TYPES, payloadHash, type PushData, type PushLink, pushData } from "./payload"
import { hmSchema } from "./settings"

export const campaignMessageSchema = z
  .object({ title: z.string().trim().min(1).max(60), body: z.string().trim().min(1).max(180) })
  .meta({ id: "CampaignMessage" })
export type CampaignMessage = z.infer<typeof campaignMessageSchema>

export const pushLinkSchema = z
  .object({
    type: z.enum(LINK_TYPES),
    id: z.uuid().optional().describe("episode (episode, player) or podcast id"),
    level: levelSchema.optional().describe("player only"),
  })
  .refine((l) => !["episode", "podcast", "player"].includes(l.type) || l.id, {
    message: "this link needs an id",
    path: ["id"],
  })
  .meta({ id: "PushLink" })

export const campaignDeliverySchema = z
  .discriminatedUnion("mode", [
    z.object({ mode: z.literal("now") }),
    z.object({ mode: z.literal("at"), sendAt: z.iso.datetime({ offset: true }) }),
    z.object({
      mode: z.literal("local"),
      date: z.string().refine(isDate, "a date as YYYY-MM-DD"),
      time: hmSchema.describe("each user's local time"),
    }),
  ])
  .meta({ id: "CampaignDelivery" })
export type CampaignDelivery = z.infer<typeof campaignDeliverySchema>

export const CAMPAIGN_SOURCES = ["en", "tr"] as const
export type CampaignSource = (typeof CAMPAIGN_SOURCES)[number]

/** A campaign as the expander needs it. */
export interface CampaignToSend {
  id: string
  name: string
  sourceLanguage: CampaignSource
  messages: Partial<Record<Locale, CampaignMessage>>
  audience: Audience
  link: PushLink
  imageUrl: string | null
  respectQuietHours: boolean
}

/** The message a user of `locale` gets: theirs, else English, else the source language. */
export function messageFor(
  c: Pick<CampaignToSend, "messages" | "sourceLanguage">,
  locale: Locale,
): { language: Locale; message: CampaignMessage } | null {
  for (const language of [locale, "en", c.sourceLanguage] as Locale[]) {
    const message = c.messages[language]
    if (message?.title.trim() && message.body.trim()) return { language, message }
  }
  return null
}

export interface RenderedCampaign {
  locale: Locale
  language: Locale
  title: string
  body: string
  hash: string
}

/** Every app language's push for a campaign (with the fallbacks), and the data they share. */
export function renderCampaign(c: CampaignToSend, group: "campaign" | "test" = "campaign") {
  const data: PushData = pushData(c.link, group, campaignRef(c.id))
  const messages: RenderedCampaign[] = []
  for (const locale of LOCALES) {
    const found = messageFor(c, locale)
    if (!found) continue
    const { title, body } = found.message
    messages.push({
      locale,
      language: found.language,
      title,
      body,
      hash: payloadHash({ language: found.language, title, body, data, imageUrl: c.imageUrl }),
    })
  }
  return { data, messages }
}

/**
 * When a campaign is expanded into sends: now, at the chosen instant, or — for each user's local time — as soon as
 * the first time zone (UTC+14) reaches it.
 */
export function expandAt(delivery: CampaignDelivery, now: Date): Date {
  if (delivery.mode === "now") return now
  if (delivery.mode === "at") return new Date(Math.max(now.getTime(), Date.parse(delivery.sendAt)))
  const earliest = Date.parse(`${delivery.date}T${delivery.time}:00Z`) - 14 * 3600_000
  return new Date(Math.max(now.getTime(), earliest))
}
