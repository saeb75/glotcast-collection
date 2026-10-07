import {
  type Audience,
  type AutomationSettings,
  automationsSchema,
  type CampaignDelivery,
  type CampaignInput,
  campaignPageSchema,
  type CampaignPatch,
  campaignSchema,
  campaignStatsSchema,
  type CampaignStatus,
  type NotificationKind,
  notificationsStatusSchema,
  reachSchema,
  sendLogSchema,
  type SendStatus,
  type TestInput,
  testResultSchema,
  type TranslateInput,
  translationSchema,
} from "@/schemas/admin"
import { api } from "./client"

const BASE = "/v1/admin/notifications"

// The scheduler and the automations

/** OneSignal configured? NOTIFICATIONS_ENABLED? The last scheduler run, the queue. */
export async function getNotificationsStatus() {
  return notificationsStatusSchema.parse((await api.get(`${BASE}/status`)).data)
}

/** The settings, the status and the last 7 days per kind. */
export async function getAutomations() {
  return automationsSchema.parse((await api.get(`${BASE}/automations`)).data)
}

/** Replaces every setting (400 when a slot time falls inside the quiet hours). */
export async function putAutomations(body: AutomationSettings) {
  return automationsSchema.parse((await api.put(`${BASE}/automations`, body)).data)
}

// Campaigns

export async function listCampaigns(params: { status?: CampaignStatus; page: number; pageSize: number }) {
  return campaignPageSchema.parse((await api.get(`${BASE}/campaigns`, { params })).data)
}

export async function getCampaign(id: string) {
  return campaignSchema.parse((await api.get(`${BASE}/campaigns/${id}`)).data)
}

export async function createCampaign(body: CampaignInput) {
  return campaignSchema.parse((await api.post(`${BASE}/campaigns`, body)).data)
}

/** Drafts only (409 otherwise). */
export async function updateCampaign(id: string, body: CampaignPatch) {
  return campaignSchema.parse((await api.patch(`${BASE}/campaigns/${id}`, body)).data)
}

/** Drafts and finished campaigns, with their send log (409 while scheduled or sending). */
export async function deleteCampaign(id: string) {
  await api.delete(`${BASE}/campaigns/${id}`)
}

/** Queues a draft (400 without a source-language message or with a past time; 503 when sending is off). */
export async function sendCampaign(id: string, delivery: CampaignDelivery) {
  return campaignSchema.parse((await api.post(`${BASE}/campaigns/${id}/send`, { delivery })).data)
}

/** Stops a scheduled or sending campaign (its queued pushes are canceled). */
export async function cancelCampaign(id: string) {
  return campaignSchema.parse((await api.post(`${BASE}/campaigns/${id}/cancel`)).data)
}

/** To one user right now — the caller without `userId` / `email` (404, 409 no_subscription, 503). */
export async function testCampaign(id: string, body: TestInput) {
  return testResultSchema.parse((await api.post(`${BASE}/campaigns/${id}/test`, body)).data)
}

/** Our counts and OneSignal's (cached 5 minutes; `refresh` asks OneSignal now). */
export async function getCampaignStats(id: string, refresh = false) {
  const params = refresh ? { refresh: "1" } : undefined
  return campaignStatsSchema.parse((await api.get(`${BASE}/campaigns/${id}/stats`, { params })).data)
}

/** Title and body in all 16 app languages, cut to the limits (Google Translation). */
export async function translateMessage(body: TranslateInput) {
  return translationSchema.parse((await api.post(`${BASE}/translate`, body, { timeout: 60_000 })).data)
}

/** Users matching an audience, and those of them a campaign reaches. */
export async function getReach(audience: Audience) {
  return reachSchema.parse((await api.post(`${BASE}/reach`, { audience })).data)
}

// The send log

/** Newest first; `before` = the previous page's `nextBefore`. */
export async function listSends(query: {
  kind?: NotificationKind
  status?: SendStatus
  campaignId?: string
  userId?: string
  before?: number
}) {
  const params = { limit: 100, ...query }
  return sendLogSchema.parse((await api.get(`${BASE}/sends`, { params })).data)
}
