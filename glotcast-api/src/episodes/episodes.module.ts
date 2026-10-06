import { Module } from "@nestjs/common"
import { MeModule } from "../me/me.module"
import { PodcastsModule } from "../podcasts/podcasts.module"
import { UsersModule } from "../users/users.module"
import { EpisodesController } from "./episodes.controller"
import { EpisodesRepository } from "./episodes.repository"
import { EpisodesService } from "./episodes.service"

@Module({
  imports: [UsersModule, PodcastsModule, MeModule],
  controllers: [EpisodesController],
  providers: [EpisodesRepository, EpisodesService],
  exports: [EpisodesRepository, EpisodesService],
})
export class EpisodesModule {}
