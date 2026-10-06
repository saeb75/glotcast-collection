import { Module } from "@nestjs/common"
import { UserRateLimitGuard } from "../common/user-rate-limit"
import { EpisodesModule } from "../episodes/episodes.module"
import { UsersModule } from "../users/users.module"
import { GoogleTranslateClient } from "./google-translate.client"
import { TranslateController } from "./translate.controller"
import { TranslateRepository } from "./translate.repository"
import { TranslateService } from "./translate.service"

@Module({
  imports: [UsersModule, EpisodesModule],
  controllers: [TranslateController],
  providers: [GoogleTranslateClient, TranslateRepository, TranslateService, UserRateLimitGuard],
  exports: [GoogleTranslateClient],
})
export class TranslateModule {}
