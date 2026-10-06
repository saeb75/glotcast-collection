import { Body, Controller, HttpCode, Post, UseGuards, UseInterceptors } from "@nestjs/common"
import { ApiBearerAuth, ApiTags } from "@nestjs/swagger"
import { ZodResponse } from "nestjs-zod"
import { AdminGuard } from "../admin.guard"
import { Audit } from "../audit/audit.decorator"
import { AdminAuditInterceptor } from "../audit/audit.interceptor"
import { CoverImageDto, CoverImageResultDto, CoverPromptDto, CoverPromptResultDto } from "./covers.dto"
import { AdminCoversService } from "./covers.service"

@ApiTags("admin")
@ApiBearerAuth()
@UseGuards(AdminGuard)
@UseInterceptors(AdminAuditInterceptor)
@Controller({ path: "admin/covers", version: "1" })
export class AdminCoversController {
  constructor(private readonly covers: AdminCoversService) {}

  /** A cover-image prompt (gpt-4o-mini) in one of 5 styles, written from the transcript. */
  @Post("prompt")
  @HttpCode(200)
  @Audit({ action: "cover.prompt", body: ["podcastName", "episodeTitle", "style"] })
  @ZodResponse({ type: CoverPromptResultDto, status: 200 })
  prompt(@Body() body: CoverPromptDto) {
    return this.covers.prompt(body)
  }

  /** Generates the image (Gemini by default, or gpt-image-1) and uploads it to R2 `images/`. */
  @Post("image")
  @HttpCode(200)
  @Audit({ action: "cover.image", body: ["model", "aspect"] })
  @ZodResponse({ type: CoverImageResultDto, status: 200 })
  image(@Body() body: CoverImageDto) {
    return this.covers.image(body)
  }
}
