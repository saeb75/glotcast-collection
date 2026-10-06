import { createZodDto } from "nestjs-zod"
import { z } from "zod"
import { nullableString } from "../../common/zod"
import { at, slugSchema, textSchema, urlSchema } from "../common/admin.dto"

export const adminCategorySchema = z
  .object({
    id: z.uuid(),
    slug: z.string(),
    name: z.string(),
    description: nullableString(),
    coverUrl: nullableString(),
    position: z.number().int().describe("display order (ascending)"),
    podcastCount: z.number().int().describe("all podcasts, drafts included"),
    createdAt: at,
    updatedAt: at,
  })
  .meta({ id: "AdminCategory" })
export type AdminCategory = z.infer<typeof adminCategorySchema>

const fields = {
  name: textSchema(120).min(1),
  slug: slugSchema.optional().describe("default: from the name"),
  description: textSchema(2000).nullable().optional(),
  coverUrl: urlSchema.nullable().optional(),
  position: z.number().int().min(0).max(10_000).optional(),
}
export const createCategorySchema = z.object(fields)
export const updateCategorySchema = z.object(fields).partial()
export type CategoryInput = z.infer<typeof updateCategorySchema>

export class AdminCategoryDto extends createZodDto(z.object(adminCategorySchema.shape)) {}
export class AdminCategoriesDto extends createZodDto(z.array(adminCategorySchema)) {}
export class CreateCategoryDto extends createZodDto(createCategorySchema) {}
export class UpdateCategoryDto extends createZodDto(updateCategorySchema) {}
