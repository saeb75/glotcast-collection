import { z } from "zod"
import { nullableString } from "../../common/zod"
import { pageQuerySchema } from "../../common/pagination"
import { SLUG_RE } from "./slugs"

export const slugSchema = z
  .string()
  .trim()
  .min(1)
  .max(80)
  .regex(SLUG_RE, "lowercase letters, digits and dashes")
export const urlSchema = z.string().trim().url().max(2000)
export const textSchema = (max: number) => z.string().trim().max(max)

/** `?q&page&pageSize` of the admin lists. */
export const adminSearchSchema = z.object({
  q: z.string().trim().max(200).optional(),
  ...pageQuerySchema.shape,
})

/** draft = no publish date; scheduled = a date still to come; published = live in the app. */
export const publishStatusSchema = z.enum(["draft", "scheduled", "published"])

export const at = z.string().describe("ISO timestamp")
export const nullableAt = nullableString().describe("ISO timestamp")
