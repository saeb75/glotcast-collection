import { Controller, Get, Query, UseGuards } from "@nestjs/common"
import { ApiBearerAuth, ApiTags } from "@nestjs/swagger"
import { ZodResponse } from "nestjs-zod"
import { type AuthClaims } from "../auth/auth-verifier"
import { OptionalAuthGuard, OptionalUser } from "../auth/auth.guard"
import { DiscoverDto, HomeDto, HomeQueryDto } from "../catalog/catalog.dto"
import { HomeService } from "./home.service"

@ApiTags("catalog")
@ApiBearerAuth()
@UseGuards(OptionalAuthGuard)
@Controller({ version: "1" })
export class HomeController {
  constructor(private readonly home: HomeService) {}

  /** The home screen in one call; `continueListening` and `following` are empty without a token. */
  @Get("home")
  @ZodResponse({ type: HomeDto, status: 200 })
  build(@OptionalUser() user: AuthClaims | null, @Query() query: HomeQueryDto) {
    return this.home.build(user, query.level)
  }

  /** Categories, the explore lists and trending episodes. */
  @Get("discover")
  @ZodResponse({ type: DiscoverDto, status: 200 })
  discover() {
    return this.home.discover()
  }
}
