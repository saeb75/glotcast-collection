import { z } from "zod"
import { AUTOMATIONS } from "@/copy/automations"
import { CAMPAIGNS } from "@/copy/campaigns"
import { CATEGORIES } from "@/copy/categories"
import { EPISODES } from "@/copy/episodes"
import { LISTS } from "@/copy/lists"
import { PODCASTS } from "@/copy/podcasts"
import { inQuietHours } from "@/domain/automations"
import {
  BODY_MAX,
  DAYS_MAX,
  HM_RE,
  LINK_TYPES,
  linkNeedsId,
  LOCALES,
  NAME_MAX,
  SEGMENTS,
  SOURCE_LANGUAGES,
  TITLE_MAX,
} from "@/domain/campaign"
import { LEVELS } from "@/domain/levels"
import { SLUG_RE } from "@/domain/slug"

// What the forms check before sending (the API checks again); messages are the admin's, not zod's.

const slug = (message: string) => z.string().trim().max(80).regex(SLUG_RE, message).or(z.literal(""))
const imageUrl = (message: string) =>
  z
    .string()
    .trim()
    .max(2000)
    .refine((v) => /^https?:\/\/\S+$/i.test(v), message)
    .nullable()

export const podcastFormSchema = z.object({
  name: z.string().trim().min(1, PODCASTS.errors.name).max(200),
  slug: slug(PODCASTS.errors.slug),
  description: z.string().max(5000),
  coverUrl: imageUrl(PODCASTS.errors.url),
  categoryIds: z.array(z.string()).max(20),
  published: z.boolean(),
})
export type PodcastForm = z.infer<typeof podcastFormSchema>

export const episodeFormSchema = z.object({
  podcastId: z.string().min(1, EPISODES.errors.podcast),
  title: z.string().trim().min(1, EPISODES.errors.title).max(300),
  number: z
    .number({ message: EPISODES.errors.number })
    .int(EPISODES.errors.number)
    .min(0, EPISODES.errors.number)
    .max(100_000)
    .nullable(),
  description: z.string().max(5000),
  coverUrl: imageUrl(EPISODES.errors.url),
  bannerUrl: imageUrl(EPISODES.errors.url),
  isPro: z.boolean(),
})
export type EpisodeForm = z.infer<typeof episodeFormSchema>

export const categoryFormSchema = z.object({
  name: z.string().trim().min(1, CATEGORIES.errors.name).max(120),
  slug: slug(CATEGORIES.errors.slug),
  description: z.string().max(2000),
  coverUrl: imageUrl(PODCASTS.errors.url),
  position: z
    .number({ message: CATEGORIES.errors.position })
    .int(CATEGORIES.errors.position)
    .min(0, CATEGORIES.errors.position)
    .max(10_000)
    .nullable(),
})
export type CategoryForm = z.infer<typeof categoryFormSchema>

export const listFormSchema = z.object({
  name: z.string().trim().min(1, LISTS.errors.name).max(120),
  slug: slug(LISTS.errors.slug),
  description: z.string().max(2000),
})
export type ListForm = z.infer<typeof listFormSchema>

// Push campaigns: what a draft needs before it is saved (the source message is checked when sending).
const C = CAMPAIGNS.errors
const days = z.number({ message: C.days }).int(C.days).min(1, C.days).max(DAYS_MAX, C.days).nullable()

export const campaignFormSchema = z.object({
  name: z.string().trim().min(1, C.name).max(NAME_MAX, C.nameLong),
  sourceLanguage: z.enum(SOURCE_LANGUAGES),
  // Only the languages with some text: each needs both, within the limits.
  messages: z.partialRecord(
    z.enum(LOCALES),
    z.object({
      title: z.string().trim().min(1, C.titleMissing).max(TITLE_MAX, C.titleLong),
      body: z.string().trim().min(1, C.bodyMissing).max(BODY_MAX, C.bodyLong),
    }),
  ),
  audience: z.object({
    segment: z.enum(SEGMENTS),
    levels: z.array(z.enum(LEVELS)),
    languages: z.array(z.enum(LOCALES)),
    inactiveDays: days,
    activeWithinDays: days,
    podcastIds: z.array(z.string()).max(100, C.podcasts),
  }),
  link: z
    .object({ type: z.enum(LINK_TYPES), id: z.string(), level: z.enum(LEVELS).or(z.literal("")) })
    .superRefine((link, ctx) => {
      if (linkNeedsId(link.type) && !link.id)
        ctx.addIssue({
          code: "custom",
          path: ["id"],
          message: link.type === "podcast" ? C.podcast : C.episode,
        })
    }),
  imageUrl: imageUrl(C.url),
  respectQuietHours: z.boolean(),
})
export type CampaignForm = z.infer<typeof campaignFormSchema>

// Automations: whole numbers in the API's ranges; the slot times outside the quiet hours (the API checks again).
const A = AUTOMATIONS.errors
const time = z.string().regex(HM_RE, A.time)
const whole = (min: number, max: number) =>
  z
    .number({ message: A.number(min, max) })
    .int(A.number(min, max))
    .min(min, A.number(min, max))
    .max(max, A.number(min, max))

export const automationsFormSchema = z
  .object({
    quietHours: z.object({ from: time, to: time }),
    reminder: z.object({ enabled: z.boolean(), weeklyRecap: z.boolean(), minDue: whole(1, 500) }),
    streakSaver: z.object({ enabled: z.boolean(), time, minStreak: whole(1, 365) }),
    learning: z.object({ enabled: z.boolean(), time }),
    newEpisodes: z.object({
      enabled: z.boolean(),
      debounceMin: whole(0, 24 * 60),
      freshHours: whole(1, 7 * 24),
    }),
  })
  .superRefine((s, ctx) => {
    if (!HM_RE.test(s.quietHours.from) || !HM_RE.test(s.quietHours.to)) return
    for (const [section, value] of [
      ["streakSaver", s.streakSaver.time],
      ["learning", s.learning.time],
    ] as const)
      if (HM_RE.test(value) && inQuietHours(value, s.quietHours))
        ctx.addIssue({ code: "custom", path: [section, "time"], message: A.quiet })
  })
export type AutomationsFormValues = z.infer<typeof automationsFormSchema>
