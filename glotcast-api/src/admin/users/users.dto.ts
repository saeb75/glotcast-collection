import { createZodDto } from "nestjs-zod"
import { z } from "zod"
import { levelSchema } from "../../catalog/catalog.dto"
import { pageOf } from "../../common/pagination"
import { nullableString } from "../../common/zod"
import { meSchema, statsSchema } from "../../me/me.dto"
import { adminSearchSchema, at } from "../common/admin.dto"

export const adminUserRowSchema = z
  .object({
    id: z.uuid(),
    email: nullableString(),
    name: nullableString(),
    isAnonymous: z.boolean(),
    level: levelSchema,
    featureAccess: z.boolean(),
    legacyStrapiUserId: z.number().int().nullable().describe("the Strapi account its legacy data came from"),
    createdAt: at,
    lastSeenAt: at.describe("last API call; updated at most once an hour"),
  })
  .meta({ id: "AdminUserRow" })
export type AdminUserRow = z.infer<typeof adminUserRowSchema>

export const adminUserSchema = z.object({
  user: z.object({ ...meSchema.shape, lastSeenAt: at, legacyStrapiUserId: z.number().int().nullable() }),
  stats: statsSchema.describe("as of today (UTC)"),
})
export type AdminUser = z.infer<typeof adminUserSchema>

export class AdminUsersQueryDto extends createZodDto(
  adminSearchSchema.describe("q: email, name or id prefix"),
) {}
export class AdminUserPageDto extends createZodDto(pageOf(adminUserRowSchema)) {}
export class AdminUserDto extends createZodDto(adminUserSchema) {}
export class UpdateAdminUserDto extends createZodDto(
  z.object({ featureAccess: z.boolean().describe("backend-granted Pro") }),
) {}
