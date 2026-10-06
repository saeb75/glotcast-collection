import { Controller, Get, Header, UseGuards } from "@nestjs/common"
import { ApiBearerAuth, ApiTags } from "@nestjs/swagger"
import { ZodResponse } from "nestjs-zod"
import { type AuthClaims } from "../../auth/auth-verifier"
import { CurrentUser } from "../../auth/auth.guard"
import { AdminGuard } from "../admin.guard"
import { AdminMeDto, DashboardDto } from "./dashboard.dto"
import { AdminDashboardService } from "./dashboard.service"

@ApiTags("admin")
@ApiBearerAuth()
@UseGuards(AdminGuard)
@Controller({ path: "admin", version: "1" })
export class AdminDashboardController {
  constructor(private readonly dashboard: AdminDashboardService) {}

  /** The signed-in admin: the panel's gate (403 for everyone else). */
  @Get("me")
  @Header("Cache-Control", "private, no-store")
  @ZodResponse({ type: AdminMeDto, status: 200 })
  me(@CurrentUser() admin: AuthClaims) {
    return { id: admin.userId, email: admin.email }
  }

  /** Users, daily listeners (30 days), episode counts and the most listened episodes. */
  @Get("dashboard")
  @Header("Cache-Control", "private, no-store")
  @ZodResponse({ type: DashboardDto, status: 200 })
  get() {
    return this.dashboard.dashboard()
  }
}
