import {
  Body,
  Controller,
  Delete,
  Get,
  Header,
  HttpCode,
  Param,
  ParseUUIDPipe,
  Post,
  Query,
  UseGuards,
} from "@nestjs/common"
import { ApiBearerAuth, ApiTags } from "@nestjs/swagger"
import { ZodResponse } from "nestjs-zod"
import { type AuthClaims } from "../auth/auth-verifier"
import { AuthGuard, CurrentUser } from "../auth/auth.guard"
import { UserRateLimit, UserRateLimitGuard } from "../common/user-rate-limit"
import {
  LookupDto,
  ReviewDto,
  SavedWordDto,
  SavedWordsDto,
  SaveWordDto,
  WordLookupDto,
  WordsPageDto,
  WordsQueryDto,
  WordStatsDto,
} from "./words.dto"
import { WordsService } from "./words.service"

const uuid = new ParseUUIDPipe()

/** Vocabulary: dictionary lookup and the user's saved words in Leitner boxes. */
@ApiTags("words")
@ApiBearerAuth()
@UseGuards(AuthGuard, UserRateLimitGuard)
@Controller({ path: "words", version: "1" })
export class WordsController {
  constructor(private readonly words: WordsService) {}

  /** Translations (Yandex, else Google), English definitions, phonetic and audio for a tapped word. */
  @Post("lookup")
  @HttpCode(200)
  @UserRateLimit({ limit: 60, windowMs: 60_000 })
  @ZodResponse({ type: WordLookupDto, status: 200 })
  lookup(@Body() body: LookupDto) {
    return this.words.lookup(body.word, body.target)
  }

  /** Saved words, newest first. */
  @Get()
  @Header("Cache-Control", "private, no-store")
  @ZodResponse({ type: WordsPageDto, status: 200 })
  list(@CurrentUser() user: AuthClaims, @Query() query: WordsQueryDto) {
    return this.words.page(user.userId, query)
  }

  @Get("stats")
  @Header("Cache-Control", "private, no-store")
  @ZodResponse({ type: WordStatsDto, status: 200 })
  stats(@CurrentUser() user: AuthClaims) {
    return this.words.stats(user.userId)
  }

  /** Words due now (at most 100), the longest overdue first. */
  @Get("review")
  @Header("Cache-Control", "private, no-store")
  @ZodResponse({ type: SavedWordsDto, status: 200 })
  due(@CurrentUser() user: AuthClaims) {
    return this.words.due(user.userId)
  }

  /** Saves a word (box 1, due now) — or updates the one already saved with the same spelling. */
  @Post()
  @Header("Cache-Control", "private, no-store")
  @ZodResponse({ type: SavedWordDto, status: 201 })
  save(@CurrentUser() user: AuthClaims, @Body() body: SaveWordDto) {
    return this.words.save(user.userId, body)
  }

  @Delete(":id")
  @HttpCode(204)
  async remove(@CurrentUser() user: AuthClaims, @Param("id", uuid) id: string) {
    await this.words.remove(user.userId, id)
  }

  /** Known → next box; unknown → box 1. */
  @Post(":id/review")
  @HttpCode(200)
  @Header("Cache-Control", "private, no-store")
  @ZodResponse({ type: SavedWordDto, status: 200 })
  review(@CurrentUser() user: AuthClaims, @Param("id", uuid) id: string, @Body() body: ReviewDto) {
    return this.words.review(user.userId, id, body.known)
  }
}
