import { createZodDto } from "nestjs-zod"
import { z } from "zod"
import { levelSchema, transcriptChunkSchema } from "../../catalog/catalog.dto"
import { pageOf, pageQuerySchema } from "../../common/pagination"
import { nullableString } from "../../common/zod"
import { at, nullableAt, publishStatusSchema, textSchema, urlSchema } from "../common/admin.dto"

export const adminEpisodeLevelSchema = z
  .object({
    level: levelSchema,
    audioUrl: z.string(),
    durationSec: z.number(),
    description: nullableString(),
    chunkCount: z.number().int(),
    hasWordTimings: z.boolean().describe("the transcript carries word-level timestamps"),
    updatedAt: at,
  })
  .meta({ id: "AdminEpisodeLevel" })

export const adminEpisodeSchema = z
  .object({
    id: z.uuid(),
    podcast: z.object({ id: z.uuid(), name: z.string() }),
    number: z.number().int().nullable(),
    title: z.string(),
    description: nullableString(),
    coverUrl: nullableString(),
    bannerUrl: nullableString(),
    isPro: z.boolean(),
    status: publishStatusSchema,
    publishedAt: nullableAt,
    legacyDocumentId: nullableString(),
    levels: z.array(adminEpisodeLevelSchema),
    createdAt: at,
    updatedAt: at,
    notifyFollowers: z.boolean().describe("push the podcast's followers when it goes live"),
    followersNotifiedAt: nullableAt.describe("when it went live for the followers' push (once)"),
  })
  .meta({ id: "AdminEpisode" })
export type AdminEpisode = z.infer<typeof adminEpisodeSchema>

export const adminEpisodeDetailSchema = z.object({
  ...adminEpisodeSchema.shape,
  levels: z.array(
    z.object({
      ...adminEpisodeLevelSchema.shape,
      transcript: z.object({ chunks: z.array(transcriptChunkSchema) }),
    }),
  ),
})
export type AdminEpisodeDetail = z.infer<typeof adminEpisodeDetailSchema>

const fields = {
  podcastId: z.uuid(),
  title: textSchema(300).min(1),
  number: z.number().int().min(0).max(100_000).nullable().optional(),
  description: textSchema(5000).nullable().optional(),
  coverUrl: urlSchema.nullable().optional(),
  bannerUrl: urlSchema.nullable().optional(),
  isPro: z.boolean().optional().describe("default true"),
  publishedAt: z.iso
    .datetime({ offset: true })
    .nullable()
    .optional()
    .describe("schedule (future) or backdate; null = draft. POST …/publish publishes now"),
  notifyFollowers: z.boolean().optional().describe("default true: push followers when it goes live"),
}
export const createEpisodeSchema = z.object(fields)
export const updateEpisodeSchema = z.object(fields).partial()
export type EpisodeInput = z.infer<typeof updateEpisodeSchema>

export const putLevelSchema = z.object({
  audioUrl: urlSchema,
  durationSec: z
    .number()
    .min(0)
    .max(24 * 3600),
  description: textSchema(2000).nullable().optional(),
  transcript: z.object({ chunks: z.array(transcriptChunkSchema).max(50_000) }),
})
export type PutLevel = z.infer<typeof putLevelSchema>

export class AdminEpisodeDto extends createZodDto(z.object(adminEpisodeSchema.shape)) {}
export class AdminEpisodeDetailDto extends createZodDto(adminEpisodeDetailSchema) {}
export class AdminEpisodePageDto extends createZodDto(pageOf(adminEpisodeSchema)) {}
export class AdminEpisodesQueryDto extends createZodDto(
  z.object({
    q: z.string().trim().max(200).optional().describe("title contains (accent-insensitive)"),
    podcastId: z.uuid().optional(),
    status: z.enum(["published", "draft"]).optional().describe("draft includes scheduled episodes"),
    ...pageQuerySchema.shape,
  }),
) {}
export class CreateEpisodeDto extends createZodDto(createEpisodeSchema) {}
export class UpdateEpisodeDto extends createZodDto(updateEpisodeSchema) {}
export class PutLevelDto extends createZodDto(putLevelSchema) {}
// The body is optional: no body (Express leaves it undefined) = {}.
export class PublishEpisodeDto extends createZodDto(
  z
    .object({
      notifyFollowers: z
        .boolean()
        .optional()
        .describe("push the followers when it goes live (kept when absent)"),
    })
    .default({}),
) {}
export class LevelParamDto extends createZodDto(z.object({ id: z.uuid(), level: levelSchema })) {}
