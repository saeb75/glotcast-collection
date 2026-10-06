import "reflect-metadata"
import { NestFactory } from "@nestjs/core"
import { type NestExpressApplication } from "@nestjs/platform-express"
import { SwaggerModule } from "@nestjs/swagger"
import { Logger } from "nestjs-pino"
import { AppModule } from "./app.module"
import { AppConfig } from "./config/app-config.service"
import { buildOpenApi, configureApp } from "./setup-app"

async function bootstrap(): Promise<void> {
  const app = await NestFactory.create<NestExpressApplication>(AppModule, { bufferLogs: true })
  app.useLogger(app.get(Logger))
  configureApp(app)

  const config = app.get(AppConfig)
  const proxies = config.get("TRUST_PROXY")
  if (proxies > 0) app.set("trust proxy", proxies)
  if (config.get("NODE_ENV") !== "production") {
    SwaggerModule.setup("docs", app, buildOpenApi(app))
  }
  await app.listen(config.get("PORT"), "0.0.0.0")
}

void bootstrap()
