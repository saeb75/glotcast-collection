import { createZodDto } from "nestjs-zod"
import { z } from "zod"
import { nullableString } from "../../common/zod"
import { at, nullableAt, publishStatusSchema, slugSchema, textSchema } from "../common/admin.dto"

export const adminListSchema = z
  .object({
    id: z.uuid(),
    slug: z.string(),
    name: z.string(),
    description: nullableString(),
    episodeCount: z.number().int().describe("all episodes in it, drafts included"),
    legacyDocumentId: nullableString(),
    createdAt: at,
    updatedAt: at,
  })
  .meta({ id: "AdminList" })
export type AdminList = z.infer<typeof adminListSchema>

export const adminEpisodeRefSchema = z
  .object({
    id: z.uuid(),
    title: z.string(),
    number: z.number().int().nullable(),
    podcast: z.object({ id: z.uuid(), name: z.string() }),
    coverUrl: nullableString(),
    status: publishStatusSchema,
    publishedAt: nullableAt,
  })
  .meta({ id: "AdminEpisodeRef" })
export type AdminEpisodeRef = z.infer<typeof adminEpisodeRefSchema>

export const adminListDetailSchema = z.object({
  ...adminListSchema.shape,
  episodes: z.array(adminEpisodeRefSchema),
})
export type AdminListDetail = z.infer<typeof adminListDetailSchema>

const fields = {
  name: textSchema(120).min(1),
  slug: slugSchema.optional().describe("default: from the name"),
  description: textSchema(2000).nullable().optional(),
}
export const createListSchema = z.object(fields)
export const updateListSchema = z.object(fields).partial()
export type ListInput = z.infer<typeof updateListSchema>

export class AdminListsDto extends createZodDto(z.array(adminListSchema)) {}
export class AdminListDetailDto extends createZodDto(adminListDetailSchema) {}
export class CreateListDto extends createZodDto(createListSchema) {}
export class UpdateListDto extends createZodDto(updateListSchema) {}
export class ListEpisodesDto extends createZodDto(
  z.object({ episodeIds: z.array(z.uuid()).max(500).describe("the whole list, in order") }),
) {}
