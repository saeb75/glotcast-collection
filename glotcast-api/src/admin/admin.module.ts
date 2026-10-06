import { Module } from "@nestjs/common"
import { HomeModule } from "../home/home.module"
import { MeModule } from "../me/me.module"
import { R2Storage } from "../storage/r2.service"
import { UsersModule } from "../users/users.module"
import { AdminGuard } from "./admin.guard"
import { AdminAuditController } from "./audit/audit.controller"
import { AdminAuditInterceptor } from "./audit/audit.interceptor"
import { AdminAuditRepository } from "./audit/audit.repository"
import { AdminCategoriesController } from "./categories/categories.controller"
import { AdminCategoriesService } from "./categories/categories.service"
import { AdminCoversController } from "./covers/covers.controller"
import { AdminCoversService } from "./covers/covers.service"
import { ImageModels } from "./covers/image-models"
import { AdminDashboardController } from "./dashboard/dashboard.controller"
import { AdminDashboardService } from "./dashboard/dashboard.service"
import { AdminEpisodesController } from "./episodes/episodes.controller"
import { AdminEpisodesRepository } from "./episodes/episodes.repository"
import { AdminEpisodesService } from "./episodes/episodes.service"
import { AdminHomeConfigController } from "./home-config/home-config.controller"
import { AdminHomeConfigService } from "./home-config/home-config.service"
import { AdminListsController } from "./lists/lists.controller"
import { AdminListsService } from "./lists/lists.service"
import { AdminMediaController } from "./media/media.controller"
import { AdminPodcastsController } from "./podcasts/podcasts.controller"
import { AdminPodcastsRepository } from "./podcasts/podcasts.repository"
import { AdminPodcastsService } from "./podcasts/podcasts.service"
import { AssemblyAiClient } from "./transcribe/assemblyai.client"
import { AdminTranscribeController } from "./transcribe/transcribe.controller"
import { AdminTranscribeService } from "./transcribe/transcribe.service"
import { AdminUsersController } from "./users/users.controller"
import { AdminUsersService } from "./users/users.service"

/** /v1/admin: content management and the content pipeline, for admins only; every write is audited. */
@Module({
  imports: [UsersModule, MeModule, HomeModule],
  controllers: [
    AdminDashboardController,
    AdminPodcastsController,
    AdminEpisodesController,
    AdminCategoriesController,
    AdminListsController,
    AdminHomeConfigController,
    AdminUsersController,
    AdminMediaController,
    AdminTranscribeController,
    AdminCoversController,
    AdminAuditController,
  ],
  providers: [
    AdminGuard,
    AdminAuditRepository,
    AdminAuditInterceptor,
    R2Storage,
    AdminDashboardService,
    AdminPodcastsRepository,
    AdminPodcastsService,
    AdminEpisodesRepository,
    AdminEpisodesService,
    AdminCategoriesService,
    AdminListsService,
    AdminHomeConfigService,
    AdminUsersService,
    AssemblyAiClient,
    AdminTranscribeService,
    ImageModels,
    AdminCoversService,
  ],
})
export class AdminModule {}
