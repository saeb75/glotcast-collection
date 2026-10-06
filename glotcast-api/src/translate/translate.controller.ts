import { Body, Controller, Header, HttpCode, Post, UseGuards } from "@nestjs/common"
import { ApiBearerAuth, ApiTags } from "@nestjs/swagger"
import { ZodResponse } from "nestjs-zod"
import { AuthGuard } from "../auth/auth.guard"
import { UserRateLimit, UserRateLimitGuard } from "../common/user-rate-limit"
import {
  TextTranslationDto,
  TranscriptTranslationDto,
  TranslateTextDto,
  TranslateTranscriptDto,
} from "./translate.dto"
import { TranslateService } from "./translate.service"

/** Machine translation (Google Cloud Translation v2, source English). The key never ships in the app. */
@ApiTags("translate")
@ApiBearerAuth()
@UseGuards(AuthGuard, UserRateLimitGuard)
@Controller({ path: "translate", version: "1" })
export class TranslateController {
  constructor(private readonly translate: TranslateService) {}

  /** A level's whole transcript, index-aligned with its chunks; cached per (episode, level, target). */
  @Post("transcript")
  @HttpCode(200)
  @Header("Cache-Control", "private, no-store")
  @UserRateLimit({ limit: 30, windowMs: 60_000 })
  @ZodResponse({ type: TranscriptTranslationDto, status: 200 })
  transcript(@Body() body: TranslateTranscriptDto) {
    return this.translate.transcript(body.episodeId, body.level, body.target)
  }

  /** Up to 100 texts at once (a chunk, a sentence). */
  @Post("text")
  @HttpCode(200)
  @Header("Cache-Control", "private, no-store")
  @UserRateLimit({ limit: 60, windowMs: 60_000 })
  @ZodResponse({ type: TextTranslationDto, status: 200 })
  text(@Body() body: TranslateTextDto) {
    return this.translate.texts(body.texts, body.target)
  }
}
