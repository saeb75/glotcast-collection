import { createZodDto } from "nestjs-zod"
import { z } from "zod"
import { nullableString } from "../common/zod"
import {
  episodeSummarySchema,
  levelProgressSchema,
  levelSchema,
  podcastSummarySchema,
  progressItemSchema,
  refSchema,
} from "../catalog/catalog.dto"
import { isDate } from "../common/dates"
import { pageOf, pageQuerySchema } from "../common/pagination"
import { MOTIVATIONS } from "../database/schema/app"

/** BCP-47-ish language code: "tr", "pt-BR", "zh-Hant". */
export const languageSchema = z
  .string()
  .trim()
  .regex(/^[A-Za-z]{2,3}(-[A-Za-z0-9]{2,8})*$/, "a language code like tr or pt-BR")
export const dateSchema = z.string().refine(isDate, "a date as YYYY-MM-DD")

export const meSchema = z
  .object({
    id: z.uuid(),
    isAnonymous: z.boolean(),
    email: nullableString(),
    name: nullableString(),
    avatarUrl: nullableString(),
    nativeLanguage: nullableString().describe('BCP-47-ish code, e.g. "tr", "pt-BR"'),
    uiLanguage: nullableString(),
    translationLanguage: nullableString(),
    level: levelSchema,
    dailyGoalMin: z.number().int(),
    interests: z.array(z.string()),
    motivation: z.enum(MOTIVATIONS).nullable(),
    reminderTime: nullableString().describe('"HH:mm", local time'),
    featureAccess: z.boolean().describe("backend-granted Pro"),
    timezone: nullableString().describe('IANA zone reported by the device, e.g. "Europe/Istanbul"'),
    pushEnabled: z.boolean().describe("the device is opted in to push (OneSignal)"),
    notifyReminders: z.boolean().describe("daily reminder + streak saver"),
    notifyLearning: z.boolean().describe("words due, finish an episode, weekly recap"),
    notifyNewEpisodes: z.boolean().describe("new episodes of followed podcasts"),
    notifyNews: z.boolean().describe("admin campaigns: news & offers"),
    proActive: z
      .boolean()
      .describe("the app sees an active subscription; targeting only, never grants access"),
    createdAt: z.string(),
  })
  .meta({ id: "Me" })
export type Me = z.infer<typeof meSchema>

export const updateMeSchema = z
  .object({
    name: z.string().trim().min(1).max(80).nullable(),
    nativeLanguage: languageSchema.nullable(),
    uiLanguage: languageSchema.nullable(),
    translationLanguage: languageSchema.nullable(),
    level: levelSchema,
    dailyGoalMin: z.number().int().min(1).max(600),
    interests: z.array(z.string().trim().min(1).max(40)).max(30),
    motivation: z.enum(MOTIVATIONS).nullable(),
    reminderTime: z
      .string()
      .regex(/^([01]\d|2[0-3]):[0-5]\d$/, '"HH:mm"')
      .nullable(),
    // Device and notification fields (with uiLanguage above): they never mark the profile as set.
    timezone: z.string().trim().min(1).max(64).nullable().describe("IANA zone; an unknown one is a 400"),
    pushEnabled: z.boolean(),
    notifyReminders: z.boolean(),
    notifyLearning: z.boolean(),
    notifyNewEpisodes: z.boolean(),
    notifyNews: z.boolean(),
    proActive: z.boolean(),
  })
  .partial()
export type UpdateMe = z.infer<typeof updateMeSchema>

/**
 * The PATCH fields that are the user's profile (onboarding answers). The rest describe the device — the app syncs
 * `uiLanguage` (its display language), the time zone, the push opt-in and the toggles on every launch.
 */
export const PROFILE_FIELDS = [
  "name",
  "nativeLanguage",
  "translationLanguage",
  "level",
  "dailyGoalMin",
  "interests",
  "motivation",
  "reminderTime",
] as const satisfies readonly (keyof UpdateMe)[]

export const dayStatsSchema = z
  .object({ date: z.string().describe('the user\'s local "YYYY-MM-DD"'), seconds: z.number() })
  .meta({ id: "DayStats" })

export const statsSchema = z
  .object({
    streakDays: z.number().int(),
    bestStreakDays: z.number().int(),
    todaySec: z.number(),
    dailyGoalSec: z.number(),
    goalMetToday: z.boolean(),
    totalSec: z.number(),
    episodesCompleted: z.number().int(),
    wordsTotal: z.number().int(),
    wordsMastered: z.number().int(),
    wordsDue: z.number().int(),
    last7Days: z.array(dayStatsSchema).describe("oldest → today, zero-filled"),
  })
  .meta({ id: "Stats" })
export type Stats = z.infer<typeof statsSchema>

export const listeningSchema = z.object({
  episodeId: refSchema,
  level: levelSchema,
  positionSec: z.number().min(0),
  durationSec: z.number().min(0),
  listenedSec: z.number().describe("seconds listened since the last heartbeat; clamped to [0, 120]"),
  date: dateSchema.describe("the client's local today"),
})

export class MeDto extends createZodDto(z.object(meSchema.shape)) {}
export class UpdateMeDto extends createZodDto(updateMeSchema) {}
export class ClaimGuestDto extends createZodDto(
  z.object({ guestAccessToken: z.string().min(20).describe("the guest (anonymous) session's access token") }),
) {}
export class ClaimGuestResultDto extends createZodDto(
  z.object({
    moved: z.object({
      progress: z.number().int(),
      words: z.number().int(),
      follows: z.number().int(),
      favorites: z.number().int(),
    }),
  }),
) {}
export class StatsDto extends createZodDto(z.object(statsSchema.shape)) {}
export class StatsQueryDto extends createZodDto(
  z.object({ date: dateSchema.optional().describe("the client's local today (default: today in UTC)") }),
) {}
export class ListeningDto extends createZodDto(listeningSchema) {}
export class ListeningResultDto extends createZodDto(
  z.object({
    progress: levelProgressSchema,
    today: dayStatsSchema,
    goalMetNow: z.boolean().describe("true only on the heartbeat that crosses the daily goal"),
    milestone: z
      .number()
      .int()
      .nullable()
      .describe(
        "7, 30, 100 or 365: the streak reached on the heartbeat that makes today a streak day, else null",
      ),
  }),
) {}
export class NotificationOpenedDto extends createZodDto(
  z.object({ ref: z.string().trim().min(1).max(80).describe("PushData.ref of the tapped push") }),
) {}
export class ProgressQueryDto extends createZodDto(
  z.object({ status: z.enum(["in_progress", "completed", "all"]).default("all"), ...pageQuerySchema.shape }),
) {}
export class ProgressPageDto extends createZodDto(pageOf(progressItemSchema)) {}
export class FollowsPageDto extends createZodDto(pageOf(podcastSummarySchema)) {}
export class FavoritesPageDto extends createZodDto(pageOf(episodeSummarySchema)) {}
