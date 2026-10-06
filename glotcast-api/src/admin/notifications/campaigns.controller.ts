import {
  Body,
  Controller,
  Delete,
  Get,
  Header,
  HttpCode,
  Param,
  ParseUUIDPipe,
  Patch,
  Post,
  Query,
  UseGuards,
  UseInterceptors,
} from "@nestjs/common"
import { ApiBearerAuth, ApiTags } from "@nestjs/swagger"
import { ZodResponse } from "nestjs-zod"
import { type AuthClaims } from "../../auth/auth-verifier"
import { CurrentUser } from "../../auth/auth.guard"
import { AdminGuard } from "../admin.guard"
import { Audit } from "../audit/audit.decorator"
import { AdminAuditInterceptor } from "../audit/audit.interceptor"
import { AdminCampaignsService } from "./campaigns.service"
import {
  AdminCampaignDto,
  AdminCampaignPageDto,
  CampaignsQueryDto,
  CampaignStatsDto,
  CampaignStatsQueryDto,
  CreateCampaignDto,
  ReachDto,
  ReachResultDto,
  SendCampaignDto,
  TestCampaignDto,
  TestResultDto,
  TranslateCampaignDto,
  TranslatedCampaignDto,
  UpdateCampaignDto,
} from "./notifications.dto"

const uuid = new ParseUUIDPipe()

/** Push campaigns: compose (16 languages), target, deliver, test and measure. */
@ApiTags("admin")
@ApiBearerAuth()
@UseGuards(AdminGuard)
@UseInterceptors(AdminAuditInterceptor)
@Controller({ path: "admin/notifications", version: "1" })
export class AdminCampaignsController {
  constructor(private readonly campaigns: AdminCampaignsService) {}

  /** Newest first. */
  @Get("campaigns")
  @Header("Cache-Control", "private, no-store")
  @ZodResponse({ type: AdminCampaignPageDto, status: 200 })
  list(@Query() query: CampaignsQueryDto) {
    return this.campaigns.page(query)
  }

  @Post("campaigns")
  @Audit({ action: "campaign.create", target: { type: "campaign", response: "id" } })
  @ZodResponse({ type: AdminCampaignDto, status: 201 })
  create(@Body() body: CreateCampaignDto, @CurrentUser() admin: AuthClaims) {
    return this.campaigns.create(body, admin)
  }

  @Get("campaigns/:id")
  @Header("Cache-Control", "private, no-store")
  @ZodResponse({ type: AdminCampaignDto, status: 200 })
  get(@Param("id", uuid) id: string) {
    return this.campaigns.get(id)
  }

  /** Drafts only (409 otherwise). */
  @Patch("campaigns/:id")
  @Audit({ action: "campaign.update", target: { type: "campaign", param: "id" } })
  @ZodResponse({ type: AdminCampaignDto, status: 200 })
  update(@Param("id", uuid) id: string, @Body() body: UpdateCampaignDto) {
    return this.campaigns.update(id, body)
  }

  /** Drafts and finished campaigns, with their send log (409 while scheduled or sending). */
  @Delete("campaigns/:id")
  @HttpCode(204)
  @Audit({ action: "campaign.delete", target: { type: "campaign", param: "id" } })
  async remove(@Param("id", uuid) id: string) {
    await this.campaigns.remove(id)
  }

  /** Queues a draft (400 without a source-language message; 503 when OneSignal or the scheduler is off). */
  @Post("campaigns/:id/send")
  @HttpCode(200)
  @Audit({ action: "campaign.send", target: { type: "campaign", param: "id" } })
  @ZodResponse({ type: AdminCampaignDto, status: 200 })
  send(@Param("id", uuid) id: string, @Body() body: SendCampaignDto) {
    return this.campaigns.send(id, body.delivery)
  }

  @Post("campaigns/:id/cancel")
  @HttpCode(200)
  @Audit({ action: "campaign.cancel", target: { type: "campaign", param: "id" } })
  @ZodResponse({ type: AdminCampaignDto, status: 200 })
  cancel(@Param("id", uuid) id: string) {
    return this.campaigns.cancel(id)
  }

  /** To one user now (the caller by default); 409 `no_subscription` when they have no push subscription. */
  @Post("campaigns/:id/test")
  @HttpCode(200)
  @Audit({ action: "campaign.test", target: { type: "campaign", param: "id" }, body: ["userId", "language"] })
  @ZodResponse({ type: TestResultDto, status: 200 })
  test(@Param("id", uuid) id: string, @Body() body: TestCampaignDto, @CurrentUser() admin: AuthClaims) {
    return this.campaigns.test(id, body, admin)
  }

  @Get("campaigns/:id/stats")
  @Header("Cache-Control", "private, no-store")
  @ZodResponse({ type: CampaignStatsDto, status: 200 })
  stats(@Param("id", uuid) id: string, @Query() query: CampaignStatsQueryDto) {
    return this.campaigns.stats(id, query.refresh === "1")
  }

  /** Title and body in all 16 app languages (Google Translation from `source`). */
  @Post("translate")
  @HttpCode(200)
  @ZodResponse({ type: TranslatedCampaignDto, status: 200 })
  translate(@Body() body: TranslateCampaignDto) {
    return this.campaigns.translate(body.source, body.title, body.body)
  }

  /** Users matching an audience, and those a campaign would reach. */
  @Post("reach")
  @HttpCode(200)
  @ZodResponse({ type: ReachResultDto, status: 200 })
  reach(@Body() body: ReachDto) {
    return this.campaigns.reach(body.audience)
  }
}
