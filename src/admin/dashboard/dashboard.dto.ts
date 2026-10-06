import { createZodDto } from "nestjs-zod"
import { z } from "zod"
import { episodeSummarySchema } from "../../catalog/catalog.dto"
import { nullableString } from "../../common/zod"

export const dayCountSchema = z.object({ date: z.string(), count: z.number().int() }).meta({ id: "DayCount" })

export const dashboardSchema = z.object({
  users: z.object({
    total: z.number().int(),
    anonymous: z.number().int(),
    last7Days: z.number().int().describe("created in the last 7 days"),
  }),
  dau: z.array(dayCountSchema).describe("distinct listeners per (local) day, the last 30 days, oldest first"),
  episodes: z.object({
    published: z.number().int(),
    drafts: z.number().int().describe("drafts and scheduled"),
  }),
  topEpisodes: z
    .array(z.object({ episode: episodeSummarySchema, listeners: z.number().int() }))
    .describe("most distinct listeners over the last 30 days"),
})
export type Dashboard = z.infer<typeof dashboardSchema>

export class DashboardDto extends createZodDto(dashboardSchema) {}
export class AdminMeDto extends createZodDto(z.object({ id: z.uuid(), email: nullableString() })) {}
