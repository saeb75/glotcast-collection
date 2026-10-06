import { type INestApplication, VersioningType } from "@nestjs/common"
import { type NestExpressApplication } from "@nestjs/platform-express"
import { DocumentBuilder, type OpenAPIObject, SwaggerModule } from "@nestjs/swagger"
import compression from "compression"
import helmet from "helmet"
import { cleanupOpenApiDoc } from "nestjs-zod"
import { splitTypeUnions } from "./common/openapi-unions"
import { AppConfig } from "./config/app-config.service"

/** Shared by main.ts, e2e tests and the offline OpenAPI export so all three see the same app. */
export function configureApp(app: INestApplication): void {
  const config = app.get(AppConfig)
  // URI versioning (/v1/...) — no global prefix, otherwise paths become /v1/v1.
  app.enableVersioning({ type: VersioningType.URI, defaultVersion: "1" })
  // A level's transcript with word timings (admin PUT …/levels/:level) is a few MB of JSON.
  const express = app as NestExpressApplication
  if (typeof express.useBodyParser === "function") express.useBodyParser("json", { limit: "15mb" })
  // Swagger UI needs inline scripts; the API itself only serves JSON.
  app.use(helmet({ contentSecurityPolicy: config.get("NODE_ENV") === "production" ? undefined : false }))
  app.enableCors({
    origin: config.get("CORS_ORIGINS"),
    methods: ["GET", "POST", "PUT", "PATCH", "DELETE"],
    maxAge: 600,
  })
  // Transcripts and home payloads are large, repetitive JSON: gzip takes them down ~8×.
  app.use(compression())
  app.enableShutdownHooks()
}

export function buildOpenApi(app: INestApplication): OpenAPIObject {
  const doc = new DocumentBuilder()
    .setTitle("GlotCast API")
    .setDescription(
      "Podcasts in three English levels: catalog, listening, vocabulary, translation, and the admin content " +
        "pipeline. The contract is docs/contract-v1.md; `admin`-tagged operations are for the admin panel only.",
    )
    .setVersion("1")
    // 3.1: nullable fields are `type: [T, "null"]` (3.0's `nullable` output of nestjs-zod mangles top-level
    // nullable strings into arrays).
    .setOpenAPIVersion("3.1.0")
    .addBearerAuth()
    .build()
  return splitTypeUnions(cleanupOpenApiDoc(SwaggerModule.createDocument(app, doc)))
}
