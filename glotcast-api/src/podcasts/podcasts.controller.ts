import { Controller, Get, Param, Query, UseGuards } from "@nestjs/common"
import { ApiBearerAuth, ApiParam, ApiTags } from "@nestjs/swagger"
import { ZodResponse } from "nestjs-zod"
import { type AuthClaims } from "../auth/auth-verifier"
import { OptionalAuthGuard, OptionalUser } from "../auth/auth.guard"
import {
  CategoriesDto,
  EpisodePageDto,
  PodcastDetailDto,
  PodcastEpisodesQueryDto,
  PodcastPageDto,
  PodcastsQueryDto,
} from "../catalog/catalog.dto"
import { RefPipe } from "../catalog/ref.pipe"
import { PodcastsService } from "./podcasts.service"

@ApiTags("catalog")
@Controller({ path: "categories", version: "1" })
export class CategoriesController {
  constructor(private readonly podcasts: PodcastsService) {}

  /** Every category with its number of published podcasts. */
  @Get()
  @ZodResponse({ type: CategoriesDto, status: 200 })
  list() {
    return this.podcasts.categories()
  }
}

@ApiTags("catalog")
@ApiBearerAuth()
@UseGuards(OptionalAuthGuard)
@Controller({ path: "podcasts", version: "1" })
export class PodcastsController {
  constructor(private readonly podcasts: PodcastsService) {}

  /** Published podcasts (newest episode first), optionally in one category. */
  @Get()
  @ZodResponse({ type: PodcastPageDto, status: 200 })
  list(@Query() query: PodcastsQueryDto) {
    return this.podcasts.list(query)
  }

  @Get(":id")
  @ApiParam({ name: "id", description: "UUID or legacy Strapi documentId" })
  @ZodResponse({ type: PodcastDetailDto, status: 200 })
  detail(@OptionalUser() user: AuthClaims | null, @Param("id", RefPipe) id: string) {
    return this.podcasts.detail(user, id)
  }

  /** The podcast's published episodes by number. */
  @Get(":id/episodes")
  @ApiParam({ name: "id", description: "UUID or legacy Strapi documentId" })
  @ZodResponse({ type: EpisodePageDto, status: 200 })
  episodes(@Param("id", RefPipe) id: string, @Query() query: PodcastEpisodesQueryDto) {
    return this.podcasts.episodes(id, query)
  }
}
