import { Controller, Get, Header, Query, UseGuards } from "@nestjs/common"
import { ApiBearerAuth, ApiTags } from "@nestjs/swagger"
import { ZodResponse } from "nestjs-zod"
import { AdminGuard } from "../admin.guard"
import { SendsPageDto, SendsQueryDto } from "./notifications.dto"
import { AdminNotificationsService } from "./notifications.service"

/** The send log: every push, skip and test, newest first. */
@ApiTags("admin")
@ApiBearerAuth()
@UseGuards(AdminGuard)
@Controller({ path: "admin/notifications", version: "1" })
export class AdminSendsController {
  constructor(private readonly notifications: AdminNotificationsService) {}

  @Get("sends")
  @Header("Cache-Control", "private, no-store")
  @ZodResponse({ type: SendsPageDto, status: 200 })
  list(@Query() query: SendsQueryDto) {
    return this.notifications.sends(query)
  }
}
