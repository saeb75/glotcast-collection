import {
  Body,
  Controller,
  Delete,
  Get,
  Header,
  HttpCode,
  Param,
  Patch,
  Post,
  Put,
  Query,
  UseGuards,
} from "@nestjs/common"
import { ApiBearerAuth, ApiParam, ApiTags } from "@nestjs/swagger"
import { ZodResponse } from "nestjs-zod"
import { type AuthClaims } from "../auth/auth-verifier"
import { AuthGuard, CurrentUser } from "../auth/auth.guard"
import { PageQueryDto } from "../catalog/catalog.dto"
import { RefPipe } from "../catalog/ref.pipe"
import {
  ClaimGuestDto,
  ClaimGuestResultDto,
  FavoritesPageDto,
  FollowsPageDto,
  ListeningDto,
  ListeningResultDto,
  MeDto,
  NotificationOpenedDto,
  ProgressPageDto,
  ProgressQueryDto,
  StatsDto,
  StatsQueryDto,
  UpdateMeDto,
} from "./me.dto"
import { MeService } from "./me.service"

/** The signed-in (or guest) user's own data. Every response is private. */
@ApiTags("me")
@ApiBearerAuth()
@UseGuards(AuthGuard)
@Controller({ path: "me", version: "1" })
export class MeController {
  constructor(private readonly me: MeService) {}

  /** The caller's profile; the first call creates the user (and copies a legacy account's data). */
  @Get()
  @Header("Cache-Control", "private, no-store")
  @ZodResponse({ type: MeDto, status: 200 })
  get(@CurrentUser() user: AuthClaims) {
    return this.me.me(user.userId)
  }

  @Patch()
  @Header("Cache-Control", "private, no-store")
  @ZodResponse({ type: MeDto, status: 200 })
  update(@CurrentUser() user: AuthClaims, @Body() body: UpdateMeDto) {
    return this.me.update(user.userId, body)
  }

  /** Deletes every app row of the account and the Supabase auth user. */
  @Delete()
  @HttpCode(204)
  async remove(@CurrentUser() user: AuthClaims) {
    await this.me.delete(user.userId)
  }

  /**
   * Signed in to an account from a guest session: the guest's progress, words, follows and favorites move here
   * (the account's rows win on conflict) and the guest is deleted. Also copies the account's legacy data.
   */
  @Post("claim-guest")
  @HttpCode(200)
  @Header("Cache-Control", "private, no-store")
  @ZodResponse({ type: ClaimGuestResultDto, status: 200 })
  claimGuest(@CurrentUser() user: AuthClaims, @Body() body: ClaimGuestDto) {
    return this.me.claimGuest(user, body.guestAccessToken)
  }

  /** Streaks, today's goal, totals and the last 7 days, for the client's local `date`. */
  @Get("stats")
  @Header("Cache-Control", "private, no-store")
  @ZodResponse({ type: StatsDto, status: 200 })
  stats(@CurrentUser() user: AuthClaims, @Query() query: StatsQueryDto) {
    return this.me.stats(user.userId, query.date)
  }

  /** Player heartbeat: progress for the level and the seconds listened today. */
  @Post("listening")
  @HttpCode(200)
  @Header("Cache-Control", "private, no-store")
  @ZodResponse({ type: ListeningResultDto, status: 200 })
  listening(@CurrentUser() user: AuthClaims, @Body() body: ListeningDto) {
    return this.me.listen(user.userId, body)
  }

  /** The app reports a tapped push (its `PushData.ref`): the newest matching send is marked opened. */
  @Post("notifications/opened")
  @HttpCode(204)
  async notificationOpened(@CurrentUser() user: AuthClaims, @Body() body: NotificationOpenedDto) {
    await this.me.notificationOpened(user.userId, body.ref)
  }

  @Get("progress")
  @Header("Cache-Control", "private, no-store")
  @ZodResponse({ type: ProgressPageDto, status: 200 })
  progress(@CurrentUser() user: AuthClaims, @Query() query: ProgressQueryDto) {
    return this.me.progressPage(user.userId, query)
  }

  @Get("follows")
  @Header("Cache-Control", "private, no-store")
  @ZodResponse({ type: FollowsPageDto, status: 200 })
  follows(@CurrentUser() user: AuthClaims, @Query() query: PageQueryDto) {
    return this.me.follows(user.userId, query)
  }

  @Put("follows/:podcastId")
  @HttpCode(204)
  @ApiParam({ name: "podcastId", description: "UUID or legacy Strapi documentId" })
  async follow(@CurrentUser() user: AuthClaims, @Param("podcastId", RefPipe) podcastId: string) {
    await this.me.follow(user.userId, podcastId)
  }

  @Delete("follows/:podcastId")
  @HttpCode(204)
  @ApiParam({ name: "podcastId", description: "UUID or legacy Strapi documentId" })
  async unfollow(@CurrentUser() user: AuthClaims, @Param("podcastId", RefPipe) podcastId: string) {
    await this.me.unfollow(user.userId, podcastId)
  }

  @Get("favorites")
  @Header("Cache-Control", "private, no-store")
  @ZodResponse({ type: FavoritesPageDto, status: 200 })
  favorites(@CurrentUser() user: AuthClaims, @Query() query: PageQueryDto) {
    return this.me.favorites(user.userId, query)
  }

  @Put("favorites/:episodeId")
  @HttpCode(204)
  @ApiParam({ name: "episodeId", description: "UUID or legacy Strapi documentId" })
  async favorite(@CurrentUser() user: AuthClaims, @Param("episodeId", RefPipe) episodeId: string) {
    await this.me.favorite(user.userId, episodeId)
  }

  @Delete("favorites/:episodeId")
  @HttpCode(204)
  @ApiParam({ name: "episodeId", description: "UUID or legacy Strapi documentId" })
  async unfavorite(@CurrentUser() user: AuthClaims, @Param("episodeId", RefPipe) episodeId: string) {
    await this.me.unfavorite(user.userId, episodeId)
  }
}
