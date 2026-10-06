import { Module } from "@nestjs/common"
import { UsersModule } from "../users/users.module"
import { CategoriesController, PodcastsController } from "./podcasts.controller"
import { PodcastsRepository } from "./podcasts.repository"
import { PodcastsService } from "./podcasts.service"

@Module({
  imports: [UsersModule],
  controllers: [CategoriesController, PodcastsController],
  providers: [PodcastsRepository, PodcastsService],
  exports: [PodcastsRepository, PodcastsService],
})
export class PodcastsModule {}
