import { type z } from "zod"
import * as gen from "./api.gen"

// Every admin response is parsed with one of these (picked from the generated api.gen.ts); types via z.infer.

// The signed-in admin and the dashboard
export const adminMeSchema = gen.adminDashboardControllerMeV1200Response
export const dashboardSchema = gen.adminDashboardControllerGetV1200Response
export type AdminMe = z.infer<typeof adminMeSchema>
export type Dashboard = z.infer<typeof dashboardSchema>
export type DayCount = Dashboard["dau"][number]
export type TopEpisode = Dashboard["topEpisodes"][number]
export type EpisodeSummary = TopEpisode["episode"]

// Podcasts
export const podcastPageSchema = gen.adminPodcastsControllerListV1200Response
export const podcastSchema = gen.adminPodcastsControllerGetV1200Response
export type PodcastPage = z.infer<typeof podcastPageSchema>
export type AdminPodcast = z.infer<typeof podcastSchema>
export type CategoryRef = AdminPodcast["categories"][number]
export type PublishStatus = AdminPodcast["status"]
export type PodcastInput = z.input<typeof gen.adminPodcastsControllerUpdateV1Body>

// Episodes and their levels
export const episodePageSchema = gen.adminEpisodesControllerListV1200Response
export const episodeDetailSchema = gen.adminEpisodesControllerGetV1200Response
export const episodeSchema = gen.adminEpisodesControllerPublishV1200Response
export type EpisodePage = z.infer<typeof episodePageSchema>
export type AdminEpisode = z.infer<typeof episodeSchema>
export type AdminEpisodeLevel = AdminEpisode["levels"][number]
export type AdminEpisodeDetail = z.infer<typeof episodeDetailSchema>
export type AdminEpisodeLevelDetail = AdminEpisodeDetail["levels"][number]
export type TranscriptChunk = AdminEpisodeLevelDetail["transcript"]["chunks"][number]
export type TranscriptWord = NonNullable<TranscriptChunk["words"]>[number]
export type Level = AdminEpisodeLevel["level"]
export type EpisodeInput = z.input<typeof gen.adminEpisodesControllerUpdateV1Body>
export type EpisodeCreateInput = z.input<typeof gen.adminEpisodesControllerCreateV1Body>
export type LevelInput = z.input<typeof gen.adminEpisodesControllerPutLevelV1Body>
export type PublishInput = z.input<typeof gen.adminEpisodesControllerPublishV1Body>

// Categories
export const categoriesSchema = gen.adminCategoriesControllerListV1200Response
export const categorySchema = gen.adminCategoriesControllerCreateV1201Response
export type AdminCategory = z.infer<typeof categorySchema>
export type CategoryInput = z.input<typeof gen.adminCategoriesControllerUpdateV1Body>

// Lists
export const listsSchema = gen.adminListsControllerListV1200Response
export const listDetailSchema = gen.adminListsControllerGetV1200Response
export type AdminList = z.infer<typeof listsSchema>[number]
export type AdminListDetail = z.infer<typeof listDetailSchema>
export type AdminEpisodeRef = AdminListDetail["episodes"][number]
export type ListInput = z.input<typeof gen.adminListsControllerUpdateV1Body>

// Home config
export const homeConfigSchema = gen.adminHomeConfigControllerGetV1200Response
export type HomeConfig = z.infer<typeof homeConfigSchema>

// Users
export const userPageSchema = gen.adminUsersControllerListV1200Response
export const userSchema = gen.adminUsersControllerGetV1200Response
export type UserPage = z.infer<typeof userPageSchema>
export type AdminUserRow = UserPage["items"][number]
export type AdminUser = z.infer<typeof userSchema>
export type UserProfile = AdminUser["user"]
export type UserStats = AdminUser["stats"]

// Media and the content pipeline
export const presignedSchema = gen.adminMediaControllerPresignV1200Response
export const transcribeJobSchema = gen.adminTranscribeControllerSubmitV1201Response
export const transcriptionSchema = gen.adminTranscribeControllerGetV1200Response
export const coverPromptSchema = gen.adminCoversControllerPromptV1200Response
export const coverImageSchema = gen.adminCoversControllerImageV1200Response
export type Presigned = z.infer<typeof presignedSchema>
export type Transcription = z.infer<typeof transcriptionSchema>
export type CoverStyle = z.input<typeof gen.adminCoversControllerPromptV1Body>["style"] & string
export type CoverModel = z.input<typeof gen.adminCoversControllerImageV1Body>["model"] & string
export type CoverAspect = z.input<typeof gen.adminCoversControllerImageV1Body>["aspect"]
export type MediaFolder = z.input<typeof gen.adminMediaControllerPresignV1Body>["folder"]

// Audit log
export const auditSchema = gen.adminAuditControllerListV1200Response
export type Audit = z.infer<typeof auditSchema>
export type AuditEntry = Audit["entries"][number]

// Push notifications: the scheduler's status and the automations
export const notificationsStatusSchema = gen.adminAutomationsControllerStatusV1200Response
export const automationsSchema = gen.adminAutomationsControllerAutomationsV1200Response
export type NotificationsStatus = z.infer<typeof notificationsStatusSchema>
export type AutomationsView = z.infer<typeof automationsSchema>
export type AutomationSettings = AutomationsView["settings"]
export type KindCount = AutomationsView["last7Days"][number]
export type NotificationKind = KindCount["kind"]

// Push campaigns
export const campaignPageSchema = gen.adminCampaignsControllerListV1200Response
export const campaignSchema = gen.adminCampaignsControllerGetV1200Response
export const campaignStatsSchema = gen.adminCampaignsControllerStatsV1200Response
export const testResultSchema = gen.adminCampaignsControllerTestV1200Response
export const translationSchema = gen.adminCampaignsControllerTranslateV1200Response
export const reachSchema = gen.adminCampaignsControllerReachV1200Response
export type CampaignPage = z.infer<typeof campaignPageSchema>
export type AdminCampaign = z.infer<typeof campaignSchema>
export type CampaignStatus = AdminCampaign["status"]
export type CampaignSource = AdminCampaign["sourceLanguage"]
export type CampaignMessage = AdminCampaign["messages"][string]
export type Audience = AdminCampaign["audience"]
export type AudienceSegment = Audience["segment"]
export type Locale = NonNullable<Audience["languages"]>[number]
export type PushLink = AdminCampaign["link"]
export type PushLinkType = PushLink["type"]
export type CampaignDelivery = NonNullable<AdminCampaign["delivery"]>
export type CampaignInput = z.input<typeof gen.adminCampaignsControllerCreateV1Body>
export type CampaignPatch = z.input<typeof gen.adminCampaignsControllerUpdateV1Body>
export type CampaignStats = z.infer<typeof campaignStatsSchema>
export type TestInput = z.input<typeof gen.adminCampaignsControllerTestV1Body>
export type TranslateInput = z.input<typeof gen.adminCampaignsControllerTranslateV1Body>
export type Reach = z.infer<typeof reachSchema>

// The send log
export const sendLogSchema = gen.adminSendsControllerListV1200Response
export type SendLog = z.infer<typeof sendLogSchema>
export type SendRow = SendLog["entries"][number]
export type SendStatus = SendRow["status"]
