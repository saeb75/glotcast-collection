import { createZodDto } from "nestjs-zod"
import { z } from "zod"
import { pageOf, pageQuerySchema } from "../../common/pagination"
import { nullableString } from "../../common/zod"
import { audienceSchema, localeSchema } from "../../notifications/audience"
import {
  CAMPAIGN_SOURCES,
  campaignDeliverySchema,
  campaignMessageSchema,
  pushLinkSchema,
} from "../../notifications/campaigns"
import { NOTIFICATION_KINDS, SEND_STATUSES } from "../../notifications/payload"
import { automationSettingsSchema } from "../../notifications/settings"
import { CAMPAIGN_STATUSES } from "../../database/schema/app"
import { at, nullableAt, urlSchema } from "../common/admin.dto"

export const notificationKindSchema = z.enum(NOTIFICATION_KINDS).meta({ id: "NotificationKind" })
export const sendStatusSchema = z.enum(SEND_STATUSES).meta({ id: "SendStatus" })
export const campaignStatusSchema = z.enum(CAMPAIGN_STATUSES).meta({ id: "CampaignStatus" })
const settingsSchema = automationSettingsSchema.meta({ id: "AutomationSettings" })

export const notificationsStatusSchema = z
  .object({
    configured: z.boolean().describe("OneSignal keys set"),
    enabled: z.boolean().describe("NOTIFICATIONS_ENABLED"),
    lastTickAt: nullableAt.describe("the scheduler's last completed run"),
    queued: z.number().int().describe("sends waiting to go out"),
  })
  .meta({ id: "NotificationsStatus" })
export type NotificationsStatus = z.infer<typeof notificationsStatusSchema>

export const automationsViewSchema = z
  .object({
    settings: settingsSchema,
    status: notificationsStatusSchema,
    last7Days: z.array(
      z.object({ kind: notificationKindSchema, sent: z.number().int(), opened: z.number().int() }),
    ),
  })
  .meta({ id: "AutomationsView" })
export type AutomationsView = z.infer<typeof automationsViewSchema>

const messagesSchema = z
  .partialRecord(localeSchema, campaignMessageSchema)
  .describe("by app language; a user's language falls back to en, then the source")

export const adminCampaignSchema = z
  .object({
    id: z.uuid(),
    name: z.string(),
    status: campaignStatusSchema,
    sourceLanguage: z.enum(CAMPAIGN_SOURCES),
    messages: messagesSchema,
    audience: audienceSchema,
    link: pushLinkSchema,
    imageUrl: nullableString(),
    respectQuietHours: z.boolean(),
    delivery: campaignDeliverySchema.nullable(),
    recipients: z.number().int().nullable().describe("users it was queued for (set when sending starts)"),
    sentAt: nullableAt,
    createdBy: z.object({ id: z.uuid(), email: nullableString() }).nullable(),
    createdAt: at,
    updatedAt: at,
  })
  .meta({ id: "AdminCampaign" })
export type AdminCampaign = z.infer<typeof adminCampaignSchema>

const campaignFields = {
  name: z.string().trim().min(1).max(120),
  sourceLanguage: z.enum(CAMPAIGN_SOURCES),
  messages: messagesSchema,
  audience: audienceSchema,
  link: pushLinkSchema,
  imageUrl: urlSchema.nullable().optional(),
  respectQuietHours: z.boolean().optional().describe("default true"),
}
export const campaignInputSchema = z.object(campaignFields)
export type CampaignInput = z.infer<typeof campaignInputSchema>
export const campaignPatchSchema = z.object(campaignFields).partial()
export type CampaignPatch = z.infer<typeof campaignPatchSchema>

export const campaignStatsSchema = z
  .object({
    recipients: z.number().int(),
    queued: z.number().int(),
    sent: z.number().int(),
    failed: z.number().int(),
    unreachable: z.number().int(),
    skipped: z.number().int(),
    opened: z.number().int(),
    onesignal: z
      .object({
        successful: z.number().int(),
        failed: z.number().int(),
        errored: z.number().int(),
        converted: z.number().int(),
        received: z.number().int(),
      })
      .nullable(),
    byLanguage: z.array(
      z.object({ language: localeSchema, recipients: z.number().int(), opened: z.number().int() }),
    ),
    refreshedAt: nullableAt,
  })
  .meta({ id: "CampaignStats" })
export type CampaignStats = z.infer<typeof campaignStatsSchema>

export const sendRowSchema = z
  .object({
    id: z.number().int(),
    user: z.object({ id: z.uuid(), email: nullableString(), isAnonymous: z.boolean() }),
    kind: notificationKindSchema,
    variant: nullableString(),
    campaignId: z.uuid().nullable(),
    status: sendStatusSchema,
    skipReason: nullableString(),
    language: localeSchema,
    title: z.string(),
    body: z.string(),
    link: pushLinkSchema,
    localDate: z.string(),
    dueAt: at,
    sentAt: nullableAt,
    openedAt: nullableAt,
    createdAt: at,
  })
  .meta({ id: "SendRow" })
export type SendRow = z.infer<typeof sendRowSchema>

export class NotificationsStatusDto extends createZodDto(z.object(notificationsStatusSchema.shape)) {}
export class AutomationsViewDto extends createZodDto(z.object(automationsViewSchema.shape)) {}
export class AutomationSettingsDto extends createZodDto(automationSettingsSchema) {}
export class AdminCampaignDto extends createZodDto(z.object(adminCampaignSchema.shape)) {}
export class AdminCampaignPageDto extends createZodDto(pageOf(adminCampaignSchema)) {}
export class CampaignsQueryDto extends createZodDto(
  z.object({ status: campaignStatusSchema.optional(), ...pageQuerySchema.shape }),
) {}
export class CreateCampaignDto extends createZodDto(campaignInputSchema) {}
export class UpdateCampaignDto extends createZodDto(campaignPatchSchema) {}
export class SendCampaignDto extends createZodDto(z.object({ delivery: campaignDeliverySchema })) {}
export class TestCampaignDto extends createZodDto(
  z.object({
    language: localeSchema.optional().describe("default: the recipient's app language"),
    userId: z.uuid().optional(),
    email: z.email().optional(),
  }),
) {}
export class TestResultDto extends createZodDto(z.object({ onesignalId: nullableString() })) {}
export class CampaignStatsDto extends createZodDto(z.object(campaignStatsSchema.shape)) {}
export class CampaignStatsQueryDto extends createZodDto(
  z.object({ refresh: z.enum(["0", "1"]).optional().describe("1 = ask OneSignal now (else cached 5 min)") }),
) {}
export class TranslateCampaignDto extends createZodDto(
  z.object({
    source: z.enum(CAMPAIGN_SOURCES),
    title: z.string().trim().min(1).max(60),
    body: z.string().trim().min(1).max(180),
  }),
) {}
export class TranslatedCampaignDto extends createZodDto(
  z.object({ messages: z.record(localeSchema, campaignMessageSchema) }),
) {}
export class ReachDto extends createZodDto(z.object({ audience: audienceSchema })) {}
export class ReachResultDto extends createZodDto(
  z.object({
    matched: z.number().int().describe("users matching the audience"),
    reachable: z.number().int().describe("of them, with push on and notifyNews"),
    byLanguage: z.array(z.object({ language: localeSchema, reachable: z.number().int() })),
  }),
) {}
export class SendsQueryDto extends createZodDto(
  z.object({
    kind: notificationKindSchema.optional(),
    status: sendStatusSchema.optional(),
    campaignId: z.uuid().optional(),
    userId: z.uuid().optional(),
    limit: z.coerce.number().int().min(1).max(200).default(50),
    before: z.coerce.number().int().positive().optional().describe("an id: older entries"),
  }),
) {}
export class SendsPageDto extends createZodDto(
  z.object({
    entries: z.array(sendRowSchema),
    nextBefore: z.number().int().optional().describe("pass as ?before= for older entries; absent at the end"),
  }),
) {}
