import { createZodDto } from "nestjs-zod"
import { z } from "zod"
import { nullableString } from "../common/zod"
import { pageOf, pageQuerySchema } from "../common/pagination"
import { LEVELS } from "../database/schema/app"

/**
 * The contract's shared types (docs/contract-v1.md → "Shared types"). Named with `.meta({ id })` so the OpenAPI
 * document (and the clients generated from it) carry the contract's type names.
 */
export const levelSchema = z
  .enum(LEVELS)
  .meta({ id: "Level", description: "bg = beginner, in = intermediate, ad = advanced" })

const url = nullableString()

export const podcastSummarySchema = z
  .object({
    id: z.uuid(),
    slug: z.string(),
    name: z.string(),
    coverUrl: url,
    episodeCount: z.number().int().describe("published episodes"),
  })
  .meta({ id: "PodcastSummary" })

export const categoryRefSchema = z
  .object({ id: z.uuid(), slug: z.string(), name: z.string() })
  .meta({ id: "CategoryRef" })

export const categorySchema = z
  .object({
    ...categoryRefSchema.shape,
    description: nullableString(),
    podcastCount: z.number().int(),
    coverUrl: url,
  })
  .meta({ id: "Category" })

export const podcastDetailSchema = z
  .object({
    ...podcastSummarySchema.shape,
    description: nullableString(),
    categories: z.array(categoryRefSchema),
    isFollowing: z.boolean().describe("false without a token"),
    levels: z.array(levelSchema).describe("levels available across its episodes"),
  })
  .meta({ id: "PodcastDetail" })

export const episodeLevelSummarySchema = z
  .object({ level: levelSchema, durationSec: z.number(), description: nullableString() })
  .meta({ id: "EpisodeLevelSummary" })

export const episodeSummarySchema = z
  .object({
    id: z.uuid(),
    podcast: z.object({ id: z.uuid(), name: z.string(), coverUrl: url }),
    number: z.number().int().nullable(),
    title: z.string(),
    coverUrl: url,
    bannerUrl: url,
    isPro: z.boolean(),
    publishedAt: z.string(),
    levels: z.array(episodeLevelSummarySchema).describe("sorted bg, in, ad; only levels that have audio"),
  })
  .meta({ id: "EpisodeSummary" })

export const levelProgressSchema = z
  .object({
    level: levelSchema,
    positionSec: z.number(),
    durationSec: z.number(),
    completed: z.boolean(),
    updatedAt: z.string(),
  })
  .meta({ id: "LevelProgress" })

export const episodeDetailSchema = z
  .object({
    ...episodeSummarySchema.shape,
    description: nullableString(),
    podcast: podcastSummarySchema,
    levels: z.array(z.object({ ...episodeLevelSummarySchema.shape, audioUrl: z.string() })),
    isFavorite: z.boolean(),
    progress: z.array(levelProgressSchema).describe("the caller's per-level progress, [] for none"),
  })
  .meta({ id: "EpisodeDetail" })

export const transcriptWordSchema = z
  .object({ text: z.string(), start: z.number(), end: z.number() })
  .meta({ id: "TranscriptWord" })

export const transcriptChunkSchema = z
  .object({
    text: z.string(),
    speaker: nullableString().describe('"A", "B", … or null'),
    start: z.number().describe("seconds"),
    end: z.number().describe("seconds"),
    words: z.array(transcriptWordSchema).optional().describe("present for newly transcribed levels only"),
  })
  .meta({ id: "TranscriptChunk" })

export const transcriptSchema = z
  .object({ episodeId: z.uuid(), level: levelSchema, chunks: z.array(transcriptChunkSchema) })
  .meta({ id: "Transcript" })

export const listPreviewSchema = z
  .object({
    id: z.uuid(),
    slug: z.string(),
    name: z.string(),
    description: nullableString(),
    total: z.number().int(),
    episodes: z.array(episodeSummarySchema),
  })
  .meta({ id: "ListPreview" })

export const progressItemSchema = z
  .object({ episode: episodeSummarySchema, ...levelProgressSchema.shape })
  .meta({ id: "ProgressItem" })

export const homeSchema = z
  .object({
    slider: z.array(episodeSummarySchema).describe("the configured slider"),
    continueListening: z
      .array(progressItemSchema)
      .describe("signed in only: most recent first, not completed"),
    forYourLevel: z.array(episodeSummarySchema).describe("newest episodes that have the level"),
    lists: z.array(listPreviewSchema).describe("home lists in their configured order, 10 episodes each"),
    following: z.array(episodeSummarySchema).describe("the newest episode of each followed podcast"),
    latest: z.array(episodeSummarySchema),
  })
  .meta({ id: "Home" })

export const discoverSchema = z.object({
  categories: z.array(categorySchema),
  lists: z.array(listPreviewSchema),
  trending: z.array(episodeSummarySchema),
})

export const searchSchema = z.object({
  podcasts: z.array(podcastSummarySchema),
  episodes: z.array(episodeSummarySchema),
})

export type LevelValue = z.infer<typeof levelSchema>
export type PodcastSummary = z.infer<typeof podcastSummarySchema>
export type PodcastDetail = z.infer<typeof podcastDetailSchema>
export type CategoryRef = z.infer<typeof categoryRefSchema>
export type Category = z.infer<typeof categorySchema>
export type EpisodeSummary = z.infer<typeof episodeSummarySchema>
export type EpisodeDetail = z.infer<typeof episodeDetailSchema>
export type LevelProgress = z.infer<typeof levelProgressSchema>
export type Transcript = z.infer<typeof transcriptSchema>
export type ListPreview = z.infer<typeof listPreviewSchema>
export type ProgressItem = z.infer<typeof progressItemSchema>
export type Home = z.infer<typeof homeSchema>

/** A podcast or episode id: our UUID, or the legacy Strapi documentId (old deep links). */
export const refSchema = z
  .string()
  .min(1)
  .max(64)
  .regex(/^[A-Za-z0-9-]+$/, "an id")

export class HomeDto extends createZodDto(z.object(homeSchema.shape)) {}
export class DiscoverDto extends createZodDto(discoverSchema) {}
export class CategoriesDto extends createZodDto(z.array(categorySchema)) {}
export class PodcastDetailDto extends createZodDto(z.object(podcastDetailSchema.shape)) {}
export class PodcastPageDto extends createZodDto(pageOf(podcastSummarySchema)) {}
export class EpisodePageDto extends createZodDto(pageOf(episodeSummarySchema)) {}
export class EpisodeDetailDto extends createZodDto(z.object(episodeDetailSchema.shape)) {}
export class TranscriptDto extends createZodDto(z.object(transcriptSchema.shape)) {}
export class SearchDto extends createZodDto(searchSchema) {}
export class ListPageDto extends createZodDto(
  z.object({
    list: z.object({ id: z.uuid(), slug: z.string(), name: z.string(), description: nullableString() }),
    episodes: pageOf(episodeSummarySchema),
  }),
) {}

export class HomeQueryDto extends createZodDto(
  z.object({ level: levelSchema.optional().describe("default: the caller's level, else bg") }),
) {}
export class PodcastsQueryDto extends createZodDto(
  z.object({ category: z.string().max(80).optional().describe("a category slug"), ...pageQuerySchema.shape }),
) {}
export class PodcastEpisodesQueryDto extends createZodDto(
  z.object({
    sort: z.enum(["asc", "desc"]).default("asc").describe("by episode number"),
    ...pageQuerySchema.shape,
  }),
) {}
export class EpisodesQueryDto extends createZodDto(
  z.object({
    feed: z.enum(["latest", "following", "trending"]).default("latest"),
    level: levelSchema.optional().describe("only episodes that have this level"),
    ...pageQuerySchema.shape,
  }),
) {}
export class TranscriptQueryDto extends createZodDto(z.object({ level: levelSchema })) {}
export class PageQueryDto extends createZodDto(pageQuerySchema) {}
export class SearchQueryDto extends createZodDto(z.object({ q: z.string().trim().min(2).max(100) })) {}
