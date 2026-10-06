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
import { AdminGuard } from "../admin.guard"
import { Audit } from "../audit/audit.decorator"
import { AdminAuditInterceptor } from "../audit/audit.interceptor"
import {
  AdminPodcastDto,
  AdminPodcastPageDto,
  AdminPodcastsQueryDto,
  CreatePodcastDto,
  UpdatePodcastDto,
} from "./podcasts.dto"
import { AdminPodcastsService } from "./podcasts.service"

const uuid = new ParseUUIDPipe()
const FIELDS = ["name", "slug", "coverUrl", "categoryIds", "published"]

@ApiTags("admin")
@ApiBearerAuth()
@UseGuards(AdminGuard)
@UseInterceptors(AdminAuditInterceptor)
@Controller({ path: "admin/podcasts", version: "1" })
export class AdminPodcastsController {
  constructor(private readonly podcasts: AdminPodcastsService) {}

  /** Every podcast, drafts included, newest first; `q` searches the name and slug. */
  @Get()
  @Header("Cache-Control", "private, no-store")
  @ZodResponse({ type: AdminPodcastPageDto, status: 200 })
  list(@Query() query: AdminPodcastsQueryDto) {
    return this.podcasts.page(query)
  }

  @Post()
  @Audit({ action: "podcast.create", target: { type: "podcast", response: "id" }, body: FIELDS })
  @ZodResponse({ type: AdminPodcastDto, status: 201 })
  create(@Body() body: CreatePodcastDto) {
    return this.podcasts.create(body)
  }

  @Get(":id")
  @Header("Cache-Control", "private, no-store")
  @ZodResponse({ type: AdminPodcastDto, status: 200 })
  get(@Param("id", uuid) id: string) {
    return this.podcasts.get(id)
  }

  @Patch(":id")
  @Audit({ action: "podcast.update", target: { type: "podcast", param: "id" }, body: FIELDS })
  @ZodResponse({ type: AdminPodcastDto, status: 200 })
  update(@Param("id", uuid) id: string, @Body() body: UpdatePodcastDto) {
    return this.podcasts.update(id, body)
  }

  /** 409 while the podcast has episodes. */
  @Delete(":id")
  @HttpCode(204)
  @Audit({ action: "podcast.delete", target: { type: "podcast", param: "id" } })
  async remove(@Param("id", uuid) id: string) {
    await this.podcasts.remove(id)
  }
}
