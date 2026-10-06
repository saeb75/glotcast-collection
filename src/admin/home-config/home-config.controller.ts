import { Body, Controller, Get, Header, Put, UseGuards, UseInterceptors } from "@nestjs/common"
import { ApiBearerAuth, ApiTags } from "@nestjs/swagger"
import { ZodResponse } from "nestjs-zod"
import { AdminGuard } from "../admin.guard"
import { Audit } from "../audit/audit.decorator"
import { AdminAuditInterceptor } from "../audit/audit.interceptor"
import { HomeConfigDto } from "./home-config.dto"
import { AdminHomeConfigService } from "./home-config.service"

/** The editorial home: slider episodes, home lists, explore lists. */
@ApiTags("admin")
@ApiBearerAuth()
@UseGuards(AdminGuard)
@UseInterceptors(AdminAuditInterceptor)
@Controller({ path: "admin/home-config", version: "1" })
export class AdminHomeConfigController {
  constructor(private readonly homeConfig: AdminHomeConfigService) {}

  @Get()
  @Header("Cache-Control", "private, no-store")
  @ZodResponse({ type: HomeConfigDto, status: 200 })
  get() {
    return this.homeConfig.get()
  }

  /** Replaces the whole configuration; unknown ids are a 400. */
  @Put()
  @Audit({ action: "home-config.update", body: ["sliderEpisodeIds", "homeListIds", "exploreListIds"] })
  @ZodResponse({ type: HomeConfigDto, status: 200 })
  put(@Body() body: HomeConfigDto) {
    return this.homeConfig.put(body)
  }
}
