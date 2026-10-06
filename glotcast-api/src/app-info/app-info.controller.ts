import { Controller, Get, Header } from "@nestjs/common"
import { ApiTags } from "@nestjs/swagger"
import { createZodDto, ZodResponse } from "nestjs-zod"
import { z } from "zod"
import { AppConfig } from "../config/app-config.service"

/** How much a non-Pro listener gets of a Pro episode. */
export const FREE_PREVIEW_SECONDS = 30
export const FREE_TRANSCRIPT_CHUNKS = 15

class AppConfigDto extends createZodDto(
  z.object({
    minSupportedVersion: z.string().describe("older app versions must update"),
    latestVersion: z.string(),
    freePreviewSeconds: z.literal(FREE_PREVIEW_SECONDS),
    freeTranscriptChunks: z.literal(FREE_TRANSCRIPT_CHUNKS),
  }),
) {}

@ApiTags("app")
@Controller({ path: "app", version: "1" })
export class AppInfoController {
  constructor(private readonly config: AppConfig) {}

  /** What the app needs at start: update prompts and the free-tier limits. */
  @Get("config")
  @Header("Cache-Control", "public, max-age=300")
  @ZodResponse({ type: AppConfigDto, status: 200 })
  get() {
    return {
      minSupportedVersion: this.config.get("APP_MIN_SUPPORTED_VERSION"),
      latestVersion: this.config.get("APP_LATEST_VERSION"),
      freePreviewSeconds: FREE_PREVIEW_SECONDS,
      freeTranscriptChunks: FREE_TRANSCRIPT_CHUNKS,
    } as const
  }
}
