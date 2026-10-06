import { z } from "zod"
import { CATEGORIES } from "@/copy/categories"
import { EPISODES } from "@/copy/episodes"
import { LISTS } from "@/copy/lists"
import { PODCASTS } from "@/copy/podcasts"
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
  number: z.number({ message: EPISODES.errors.number }).int(EPISODES.errors.number).min(0, EPISODES.errors.number).max(100_000).nullable(),
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
  position: z.number({ message: CATEGORIES.errors.position }).int(CATEGORIES.errors.position).min(0, CATEGORIES.errors.position).max(10_000).nullable(),
})
export type CategoryForm = z.infer<typeof categoryFormSchema>

export const listFormSchema = z.object({
  name: z.string().trim().min(1, LISTS.errors.name).max(120),
  slug: slug(LISTS.errors.slug),
  description: z.string().max(2000),
})
export type ListForm = z.infer<typeof listFormSchema>
