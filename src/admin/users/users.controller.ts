import {
  Body,
  Controller,
  Get,
  Header,
  Param,
  ParseUUIDPipe,
  Patch,
  Query,
  UseGuards,
  UseInterceptors,
} from "@nestjs/common"
import { ApiBearerAuth, ApiTags } from "@nestjs/swagger"
import { ZodResponse } from "nestjs-zod"
import { AdminGuard } from "../admin.guard"
import { Audit } from "../audit/audit.decorator"
import { AdminAuditInterceptor } from "../audit/audit.interceptor"
import { AdminUserDto, AdminUserPageDto, AdminUsersQueryDto, UpdateAdminUserDto } from "./users.dto"
import { AdminUsersService } from "./users.service"

const uuid = new ParseUUIDPipe()

@ApiTags("admin")
@ApiBearerAuth()
@UseGuards(AdminGuard)
@UseInterceptors(AdminAuditInterceptor)
@Controller({ path: "admin/users", version: "1" })
export class AdminUsersController {
  constructor(private readonly users: AdminUsersService) {}

  /** App users, newest first; `q` = email, name or id prefix (a search is recorded in the audit log). */
  @Get()
  @Header("Cache-Control", "private, no-store")
  @Audit({ action: "users.search", onlyWith: "q", query: ["q"] })
  @ZodResponse({ type: AdminUserPageDto, status: 200 })
  list(@Query() query: AdminUsersQueryDto) {
    return this.users.page(query)
  }

  /** Profile and stats (recorded in the audit log). */
  @Get(":id")
  @Header("Cache-Control", "private, no-store")
  @Audit({ action: "user.view", target: { type: "user", param: "id" } })
  @ZodResponse({ type: AdminUserDto, status: 200 })
  get(@Param("id", uuid) id: string) {
    return this.users.get(id)
  }

  /** Grants or removes backend Pro (`featureAccess`). */
  @Patch(":id")
  @Header("Cache-Control", "private, no-store")
  @Audit({ action: "user.update", target: { type: "user", param: "id" }, body: ["featureAccess"] })
  @ZodResponse({ type: AdminUserDto, status: 200 })
  update(@Param("id", uuid) id: string, @Body() body: UpdateAdminUserDto) {
    return this.users.update(id, body.featureAccess)
  }
}
