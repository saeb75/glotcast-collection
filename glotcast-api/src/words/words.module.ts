import { Module } from "@nestjs/common"
import { UserRateLimitGuard } from "../common/user-rate-limit"
import { TranslateModule } from "../translate/translate.module"
import { UsersModule } from "../users/users.module"
import { DictionaryClient } from "./dictionary.client"
import { WordsController } from "./words.controller"
import { WordsRepository } from "./words.repository"
import { WordsService } from "./words.service"

@Module({
  imports: [UsersModule, TranslateModule],
  controllers: [WordsController],
  providers: [DictionaryClient, WordsRepository, WordsService, UserRateLimitGuard],
})
export class WordsModule {}
