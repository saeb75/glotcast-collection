import { type SQL, sql } from "drizzle-orm"
import { z } from "zod"
import { levelSchema } from "../catalog/catalog.dto"
import { LOCALES, localeSql } from "./locales"
import { ts, uuidArray } from "./sql"

export const localeSchema = z.enum(LOCALES).meta({ id: "Locale" })

export const AUDIENCE_SEGMENTS = ["all", "pro", "free", "guests", "signedIn"] as const

/** Who a campaign is for (contract: Audience). Filters combine with AND. */
export const audienceSchema = z
  .object({
    segment: z.enum(AUDIENCE_SEGMENTS).describe("pro = featureAccess or proActive"),
    levels: z.array(levelSchema).max(3).optional(),
    languages: z.array(localeSchema).max(LOCALES.length).optional().describe("the app language"),
    inactiveDays: z.number().int().min(1).max(3650).optional().describe("not seen for at least N days"),
    activeWithinDays: z.number().int().min(1).max(3650).optional().describe("seen within the last N days"),
    podcastIds: z.array(z.uuid()).max(100).optional().describe("followers of any of these podcasts"),
  })
  .meta({ id: "Audience" })
export type Audience = z.infer<typeof audienceSchema>

const PRO = sql`(u.feature_access OR u.pro_active)`

/** The audience as conditions over `app.users u` (always true for an empty audience). */
export function audienceWhere(a: Audience, now: Date): SQL {
  const parts: SQL[] = []
  if (a.segment === "pro") parts.push(PRO)
  if (a.segment === "free") parts.push(sql`NOT ${PRO}`)
  if (a.segment === "guests") parts.push(sql`u.is_anonymous`)
  if (a.segment === "signedIn") parts.push(sql`NOT u.is_anonymous`)
  if (a.levels?.length) parts.push(sql`u.level = ANY(${`{${a.levels.join(",")}}`}::app.level[])`)
  if (a.languages?.length)
    parts.push(sql`${localeSql(sql`u.ui_language`)} = ANY(${`{${a.languages.join(",")}}`}::text[])`)
  if (a.inactiveDays) parts.push(sql`u.last_seen_at <= ${ts(now)} - ${`${a.inactiveDays} days`}::interval`)
  if (a.activeWithinDays)
    parts.push(sql`u.last_seen_at > ${ts(now)} - ${`${a.activeWithinDays} days`}::interval`)
  if (a.podcastIds?.length)
    parts.push(
      sql`EXISTS (SELECT 1 FROM app.follows f WHERE f.user_id = u.id AND f.podcast_id = ANY(${uuidArray(a.podcastIds)}))`,
    )
  return parts.length ? sql.join(parts, sql` AND `) : sql`true`
}

/** Campaigns only reach users who allow pushes and news. */
export const REACHABLE = sql`(u.push_enabled AND u.notify_news)`
