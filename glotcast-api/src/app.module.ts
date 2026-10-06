import { randomUUID } from "node:crypto"
import { Module } from "@nestjs/common"
import { APP_FILTER, APP_GUARD, APP_INTERCEPTOR, APP_PIPE } from "@nestjs/core"
import { ScheduleModule } from "@nestjs/schedule"
import { ThrottlerGuard, ThrottlerModule } from "@nestjs/throttler"
import { LoggerModule } from "nestjs-pino"
import { ZodSerializerInterceptor, ZodValidationPipe } from "nestjs-zod"
import { AdminModule } from "./admin/admin.module"
import { AppInfoModule } from "./app-info/app-info.module"
import { CatalogModule } from "./catalog/catalog.module"
import { ProblemDetailsFilter } from "./common/problem-details.filter"
import { AppConfig } from "./config/app-config.service"
import { AppConfigModule } from "./config/config.module"
import { DatabaseModule } from "./database/database.module"
import { EpisodesModule } from "./episodes/episodes.module"
import { HealthModule } from "./health/health.module"
import { HomeModule } from "./home/home.module"
import { ListsModule } from "./lists/lists.module"
import { MeModule } from "./me/me.module"
import { NotificationsCoreModule } from "./notifications/notifications-core.module"
import { PodcastsModule } from "./podcasts/podcasts.module"
import { SearchModule } from "./search/search.module"
import { TranslateModule } from "./translate/translate.module"
import { WordsModule } from "./words/words.module"

@Module({
  imports: [
    AppConfigModule,
    LoggerModule.forRootAsync({
      inject: [AppConfig],
      useFactory: (config: AppConfig) => ({
        pinoHttp: {
          level: config.get("LOG_LEVEL"),
          genReqId: (req, res) => {
            const id = (req.headers["x-request-id"] as string | undefined) ?? randomUUID()
            res.setHeader("x-request-id", id)
            return id
          },
          redact: ["req.headers.authorization", "req.headers.cookie"],
          transport:
            config.get("NODE_ENV") === "development"
              ? { target: "pino-pretty", options: { singleLine: true } }
              : undefined,
          autoLogging: { ignore: (req) => req.url?.startsWith("/v1/health") ?? false },
        },
      }),
    }),
    ThrottlerModule.forRootAsync({
      inject: [AppConfig],
      useFactory: (config: AppConfig) => [
        { name: "default", ttl: 60_000, limit: config.get("RATE_LIMIT_PER_MINUTE") },
      ],
    }),
    DatabaseModule,
    // The notification scheduler's cron (only the API server runs it; the CLI uses the services directly).
    ScheduleModule.forRoot(),
    NotificationsCoreModule,
    CatalogModule,
    HealthModule,
    AppInfoModule,
    HomeModule,
    PodcastsModule,
    EpisodesModule,
    ListsModule,
    SearchModule,
    MeModule,
    TranslateModule,
    WordsModule,
    AdminModule,
  ],
  providers: [
    { provide: APP_PIPE, useClass: ZodValidationPipe },
    { provide: APP_INTERCEPTOR, useClass: ZodSerializerInterceptor },
    { provide: APP_GUARD, useClass: ThrottlerGuard },
    { provide: APP_FILTER, useClass: ProblemDetailsFilter },
  ],
})
export class AppModule {}
