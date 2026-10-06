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
  Put,
  Query,
  UseGuards,
  UseInterceptors,
} from "@nestjs/common"
import { ApiBearerAuth, ApiTags } from "@nestjs/swagger"
import { ZodResponse } from "nestjs-zod"
import { AdminGuard } from "../admin.guard"
import { Audit } from "../audit/audit.decorator"
import { AdminAuditInterceptor } from "../audit/audit.interceptor"
import {
  AdminEpisodeDetailDto,
  AdminEpisodeDto,
  AdminEpisodePageDto,
  AdminEpisodesQueryDto,
  CreateEpisodeDto,
  LevelParamDto,
  PutLevelDto,
  UpdateEpisodeDto,
} from "./episodes.dto"
import { AdminEpisodesService } from "./episodes.service"

const uuid = new ParseUUIDPipe()
const FIELDS = ["podcastId", "title", "number", "isPro", "publishedAt", "coverUrl", "bannerUrl"]

@ApiTags("admin")
@ApiBearerAuth()
@UseGuards(AdminGuard)
@UseInterceptors(AdminAuditInterceptor)
@Controller({ path: "admin/episodes", version: "1" })
export class AdminEpisodesController {
  constructor(private readonly episodes: AdminEpisodesService) {}

  /** Every episode with its levels (no transcripts); newest first. */
  @Get()
  @Header("Cache-Control", "private, no-store")
  @ZodResponse({ type: AdminEpisodePageDto, status: 200 })
  list(@Query() query: AdminEpisodesQueryDto) {
    return this.episodes.page(query)
  }

  /** A new episode (a draft unless `publishedAt` is given); levels are added with PUT …/levels/:level. */
  @Post()
  @Audit({ action: "episode.create", target: { type: "episode", response: "id" }, body: FIELDS })
  @ZodResponse({ type: AdminEpisodeDetailDto, status: 201 })
  create(@Body() body: CreateEpisodeDto) {
    return this.episodes.create(body)
  }

  /** The episode with every level's transcript. */
  @Get(":id")
  @Header("Cache-Control", "private, no-store")
  @ZodResponse({ type: AdminEpisodeDetailDto, status: 200 })
  get(@Param("id", uuid) id: string) {
    return this.episodes.detail(id)
  }

  @Patch(":id")
  @Audit({ action: "episode.update", target: { type: "episode", param: "id" }, body: FIELDS })
  @ZodResponse({ type: AdminEpisodeDetailDto, status: 200 })
  update(@Param("id", uuid) id: string, @Body() body: UpdateEpisodeDto) {
    return this.episodes.update(id, body)
  }

  @Delete(":id")
  @HttpCode(204)
  @Audit({ action: "episode.delete", target: { type: "episode", param: "id" } })
  async remove(@Param("id", uuid) id: string) {
    await this.episodes.remove(id)
  }

  @Post(":id/publish")
  @HttpCode(200)
  @Audit({ action: "episode.publish", target: { type: "episode", param: "id" } })
  @ZodResponse({ type: AdminEpisodeDto, status: 200 })
  publish(@Param("id", uuid) id: string) {
    return this.episodes.publish(id)
  }

  @Post(":id/unpublish")
  @HttpCode(200)
  @Audit({ action: "episode.unpublish", target: { type: "episode", param: "id" } })
  @ZodResponse({ type: AdminEpisodeDto, status: 200 })
  unpublish(@Param("id", uuid) id: string) {
    return this.episodes.unpublish(id)
  }

  /** Creates or replaces a level: audio, duration and its timed transcript (seconds). */
  @Put(":id/levels/:level")
  @Audit({
    action: "level.put",
    target: { type: "episode", param: "id" },
    params: ["level"],
    body: ["audioUrl", "durationSec"],
  })
  @ZodResponse({ type: AdminEpisodeDetailDto, status: 200 })
  putLevel(@Param() params: LevelParamDto, @Body() body: PutLevelDto) {
    return this.episodes.putLevel(params.id, params.level, body)
  }

  @Delete(":id/levels/:level")
  @HttpCode(204)
  @Audit({ action: "level.delete", target: { type: "episode", param: "id" }, params: ["level"] })
  async deleteLevel(@Param() params: LevelParamDto) {
    await this.episodes.deleteLevel(params.id, params.level)
  }
}
