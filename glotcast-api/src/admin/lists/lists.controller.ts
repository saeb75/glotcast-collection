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
  UseGuards,
  UseInterceptors,
} from "@nestjs/common"
import { ApiBearerAuth, ApiTags } from "@nestjs/swagger"
import { ZodResponse } from "nestjs-zod"
import { AdminGuard } from "../admin.guard"
import { Audit } from "../audit/audit.decorator"
import { AdminAuditInterceptor } from "../audit/audit.interceptor"
import { AdminListDetailDto, AdminListsDto, CreateListDto, ListEpisodesDto, UpdateListDto } from "./lists.dto"
import { AdminListsService } from "./lists.service"

const uuid = new ParseUUIDPipe()

@ApiTags("admin")
@ApiBearerAuth()
@UseGuards(AdminGuard)
@UseInterceptors(AdminAuditInterceptor)
@Controller({ path: "admin/lists", version: "1" })
export class AdminListsController {
  constructor(private readonly lists: AdminListsService) {}

  @Get()
  @Header("Cache-Control", "private, no-store")
  @ZodResponse({ type: AdminListsDto, status: 200 })
  list() {
    return this.lists.list()
  }

  @Post()
  @Audit({ action: "list.create", target: { type: "list", response: "id" }, body: ["name", "slug"] })
  @ZodResponse({ type: AdminListDetailDto, status: 201 })
  create(@Body() body: CreateListDto) {
    return this.lists.create(body)
  }

  @Get(":id")
  @Header("Cache-Control", "private, no-store")
  @ZodResponse({ type: AdminListDetailDto, status: 200 })
  get(@Param("id", uuid) id: string) {
    return this.lists.get(id)
  }

  @Patch(":id")
  @Audit({ action: "list.update", target: { type: "list", param: "id" }, body: ["name", "slug"] })
  @ZodResponse({ type: AdminListDetailDto, status: 200 })
  update(@Param("id", uuid) id: string, @Body() body: UpdateListDto) {
    return this.lists.update(id, body)
  }

  @Delete(":id")
  @HttpCode(204)
  @Audit({ action: "list.delete", target: { type: "list", param: "id" } })
  async remove(@Param("id", uuid) id: string) {
    await this.lists.remove(id)
  }

  /** Replaces the list's episodes (ordered). */
  @Put(":id/episodes")
  @Audit({ action: "list.episodes", target: { type: "list", param: "id" }, body: ["episodeIds"] })
  @ZodResponse({ type: AdminListDetailDto, status: 200 })
  setEpisodes(@Param("id", uuid) id: string, @Body() body: ListEpisodesDto) {
    return this.lists.setEpisodes(id, body.episodeIds)
  }
}
