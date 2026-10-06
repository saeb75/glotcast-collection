import { createZodDto } from "nestjs-zod"
import { z } from "zod"
import { categoryRefSchema } from "../../catalog/catalog.dto"
import { pageOf } from "../../common/pagination"
import { nullableString } from "../../common/zod"
import {
  adminSearchSchema,
  at,
  nullableAt,
  publishStatusSchema,
  slugSchema,
  textSchema,
  urlSchema,
} from "../common/admin.dto"

export const adminPodcastSchema = z
  .object({
    id: z.uuid(),
    slug: z.string(),
    name: z.string(),
    description: nullableString(),
    coverUrl: nullableString(),
    categories: z.array(categoryRefSchema),
    status: publishStatusSchema,
    publishedAt: nullableAt,
    episodeCount: z.number().int().describe("all episodes, drafts included"),
    publishedEpisodeCount: z.number().int(),
    legacyDocumentId: nullableString().describe("Strapi documentId of a migrated podcast"),
    createdAt: at,
    updatedAt: at,
  })
  .meta({ id: "AdminPodcast" })
export type AdminPodcast = z.infer<typeof adminPodcastSchema>

const fields = {
  name: textSchema(200).min(1),
  slug: slugSchema.optional().describe("default: from the name"),
  description: textSchema(5000).nullable().optional(),
  coverUrl: urlSchema.nullable().optional(),
  categoryIds: z.array(z.uuid()).max(20).optional().describe("ordered; replaces the podcast's categories"),
  published: z.boolean().optional().describe("true = visible in the app (from now); false = draft"),
}

export const createPodcastSchema = z.object(fields)
export const updatePodcastSchema = z.object(fields).partial()
export type PodcastInput = z.infer<typeof updatePodcastSchema>

export class AdminPodcastDto extends createZodDto(z.object(adminPodcastSchema.shape)) {}
export class AdminPodcastPageDto extends createZodDto(pageOf(adminPodcastSchema)) {}
export class AdminPodcastsQueryDto extends createZodDto(adminSearchSchema) {}
export class CreatePodcastDto extends createZodDto(createPodcastSchema) {}
export class UpdatePodcastDto extends createZodDto(updatePodcastSchema) {}
