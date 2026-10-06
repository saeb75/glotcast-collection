import { Body, Controller, Get, Header, Put, UseGuards, UseInterceptors } from "@nestjs/common"
import { ApiBearerAuth, ApiTags } from "@nestjs/swagger"
import { ZodResponse } from "nestjs-zod"
import { type AuthClaims } from "../../auth/auth-verifier"
import { CurrentUser } from "../../auth/auth.guard"
import { AdminGuard } from "../admin.guard"
import { Audit } from "../audit/audit.decorator"
import { AdminAuditInterceptor } from "../audit/audit.interceptor"
import { AutomationSettingsDto, AutomationsViewDto, NotificationsStatusDto } from "./notifications.dto"
import { AdminNotificationsService } from "./notifications.service"

/** Whether pushes go out at all, and the automations' switches and parameters. */
@ApiTags("admin")
@ApiBearerAuth()
@UseGuards(AdminGuard)
@UseInterceptors(AdminAuditInterceptor)
@Controller({ path: "admin/notifications", version: "1" })
export class AdminAutomationsController {
  constructor(private readonly notifications: AdminNotificationsService) {}

  @Get("status")
  @Header("Cache-Control", "private, no-store")
  @ZodResponse({ type: NotificationsStatusDto, status: 200 })
  status() {
    return this.notifications.status()
  }

  /** The settings, the status and the last 7 days per kind. */
  @Get("automations")
  @Header("Cache-Control", "private, no-store")
  @ZodResponse({ type: AutomationsViewDto, status: 200 })
  automations() {
    return this.notifications.automations()
  }

  /** Replaces the settings (the slot times must be outside the quiet hours). */
  @Put("automations")
  @Audit({ action: "automations.update" })
  @ZodResponse({ type: AutomationsViewDto, status: 200 })
  put(@Body() body: AutomationSettingsDto, @CurrentUser() admin: AuthClaims) {
    return this.notifications.putAutomations(body, admin.userId)
  }
}
