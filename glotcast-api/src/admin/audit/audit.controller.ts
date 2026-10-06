import { Controller, Get, Header, Query, UseGuards } from "@nestjs/common"
import { ApiBearerAuth, ApiTags } from "@nestjs/swagger"
import { ZodResponse } from "nestjs-zod"
import { AdminGuard } from "../admin.guard"
import { AdminAuditDto, AdminAuditQueryDto } from "./audit.dto"
import { AdminAuditRepository } from "./audit.repository"

@ApiTags("admin")
@ApiBearerAuth()
@UseGuards(AdminGuard)
@Controller({ path: "admin/audit", version: "1" })
export class AdminAuditController {
  constructor(private readonly audit: AdminAuditRepository) {}

  /** What admins changed, newest first. */
  @Get()
  @Header("Cache-Control", "private, no-store")
  @ZodResponse({ type: AdminAuditDto, status: 200 })
  list(@Query() query: AdminAuditQueryDto) {
    return this.audit.list(query)
  }
}
