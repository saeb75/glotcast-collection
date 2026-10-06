import { Controller, Get, Param, Query, UseGuards } from "@nestjs/common"
import { ApiBearerAuth, ApiParam, ApiTags } from "@nestjs/swagger"
import { ZodResponse } from "nestjs-zod"
import { type AuthClaims } from "../auth/auth-verifier"
import { OptionalAuthGuard, OptionalUser } from "../auth/auth.guard"
import {
  EpisodeDetailDto,
  EpisodePageDto,
  EpisodesQueryDto,
  TranscriptDto,
  TranscriptQueryDto,
} from "../catalog/catalog.dto"
import { RefPipe } from "../catalog/ref.pipe"
import { EpisodesService } from "./episodes.service"

@ApiTags("catalog")
@ApiBearerAuth()
@UseGuards(OptionalAuthGuard)
@Controller({ path: "episodes", version: "1" })
export class EpisodesController {
  constructor(private readonly episodes: EpisodesService) {}

  /**
   * Episode feeds: `latest` (newest first), `following` (the caller's followed podcasts; needs a token),
   * `trending` (most distinct listeners over the last 14 days, then newest).
   */
  @Get()
  @ZodResponse({ type: EpisodePageDto, status: 200 })
  feed(@OptionalUser() user: AuthClaims | null, @Query() query: EpisodesQueryDto) {
    return this.episodes.feed(user, query)
  }

  @Get(":id")
  @ApiParam({ name: "id", description: "UUID or legacy Strapi documentId" })
  @ZodResponse({ type: EpisodeDetailDto, status: 200 })
  detail(@OptionalUser() user: AuthClaims | null, @Param("id", RefPipe) id: string) {
    return this.episodes.detail(user, id)
  }

  /** One level's timed transcript (seconds). */
  @Get(":id/transcript")
  @ApiParam({ name: "id", description: "UUID or legacy Strapi documentId" })
  @ZodResponse({ type: TranscriptDto, status: 200 })
  transcript(@Param("id", RefPipe) id: string, @Query() query: TranscriptQueryDto) {
    return this.episodes.transcript(id, query.level)
  }
}
