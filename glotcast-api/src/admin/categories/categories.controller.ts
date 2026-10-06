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
  UseGuards,
  UseInterceptors,
} from "@nestjs/common"
import { ApiBearerAuth, ApiTags } from "@nestjs/swagger"
import { ZodResponse } from "nestjs-zod"
import { AdminGuard } from "../admin.guard"
import { Audit } from "../audit/audit.decorator"
import { AdminAuditInterceptor } from "../audit/audit.interceptor"
import { AdminCategoriesDto, AdminCategoryDto, CreateCategoryDto, UpdateCategoryDto } from "./categories.dto"
import { AdminCategoriesService } from "./categories.service"

const uuid = new ParseUUIDPipe()
const FIELDS = ["name", "slug", "position", "coverUrl"]

@ApiTags("admin")
@ApiBearerAuth()
@UseGuards(AdminGuard)
@UseInterceptors(AdminAuditInterceptor)
@Controller({ path: "admin/categories", version: "1" })
export class AdminCategoriesController {
  constructor(private readonly categories: AdminCategoriesService) {}

  @Get()
  @Header("Cache-Control", "private, no-store")
  @ZodResponse({ type: AdminCategoriesDto, status: 200 })
  list() {
    return this.categories.list()
  }

  @Post()
  @Audit({ action: "category.create", target: { type: "category", response: "id" }, body: FIELDS })
  @ZodResponse({ type: AdminCategoryDto, status: 201 })
  create(@Body() body: CreateCategoryDto) {
    return this.categories.create(body)
  }

  @Patch(":id")
  @Audit({ action: "category.update", target: { type: "category", param: "id" }, body: FIELDS })
  @ZodResponse({ type: AdminCategoryDto, status: 200 })
  update(@Param("id", uuid) id: string, @Body() body: UpdateCategoryDto) {
    return this.categories.update(id, body)
  }

  @Delete(":id")
  @HttpCode(204)
  @Audit({ action: "category.delete", target: { type: "category", param: "id" } })
  async remove(@Param("id", uuid) id: string) {
    await this.categories.remove(id)
  }
}
