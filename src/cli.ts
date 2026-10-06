/**
 * Operational commands, one entry point: `node dist/cli.js <command> [options]`.
 *
 *   db-migrate     apply drizzle/ (schema app) — what `npm run db:migrate` does, without dev tooling; the server
 *                  image runs it on every start
 *   openapi [--out openapi.json]
 *                  write the OpenAPI document (no server, no database needed)
 *   admin grant <email> | admin revoke <email> | admin list
 *                  who may use /v1/admin (Supabase app_metadata.role = "admin" on a registered account); the role
 *                  reaches the token on the next sign-in or token refresh
 *   migrate-strapi [--dry-run] [--timezone UTC]
 *                  copy Strapi's published content (categories, podcasts, episodes + levels, lists, the project
 *                  config) into schema app, upserting by Strapi documentId; reads STRAPI_DATABASE_URL (default
 *                  DATABASE_URL) read-only. --dry-run does every write, prints the counts and rolls back.
 *                  --timezone: the Strapi server's time zone (its timestamps have none)
 *
 * Runs on a slim application context (no HTTP server).
 */
import "reflect-metadata"
import { writeFileSync } from "node:fs"
import { parseArgs } from "node:util"
import { Module } from "@nestjs/common"
import { NestFactory } from "@nestjs/core"
import { AdminRolesModule } from "./admin/admin-roles.module"
import { AdminRolesService } from "./admin/admin-roles.service"
import { AppModule } from "./app.module"
import { AppConfig } from "./config/app-config.service"
import { AppConfigModule } from "./config/config.module"
import { DatabaseModule } from "./database/database.module"
import { migrateDatabase } from "./database/migrate"
import { buildOpenApi, configureApp } from "./setup-app"
import { MigrateStrapiService } from "./strapi/migrate-strapi.service"
import { StrapiModule } from "./strapi/strapi.module"

@Module({ imports: [AppConfigModule, DatabaseModule, AdminRolesModule, StrapiModule] })
class CliModule {}

const USAGE =
  "usage: node dist/cli.js <db-migrate | openapi [--out file] | admin grant|revoke <email> | admin list | " +
  "migrate-strapi [--dry-run] [--timezone UTC]>"

async function main(): Promise<void> {
  const { positionals, values } = parseArgs({
    allowPositionals: true,
    options: {
      out: { type: "string", default: "openapi.json" },
      "dry-run": { type: "boolean", default: false },
      timezone: { type: "string", default: "UTC" },
    },
  })
  const command = positionals[0]

  if (command === "openapi") {
    const app = await NestFactory.create(AppModule, { logger: ["error", "warn"] })
    configureApp(app)
    writeFileSync(values.out, JSON.stringify(buildOpenApi(app), null, 2) + "\n")
    await app.close()
    console.log(`wrote ${values.out}`)
    return
  }

  if (command === "db-migrate") {
    const app = await NestFactory.createApplicationContext(AppConfigModule, { logger: ["error", "warn"] })
    try {
      await migrateDatabase(app.get(AppConfig))
    } finally {
      await app.close()
    }
    console.log("migrations applied")
    return
  }

  if (command !== "admin" && command !== "migrate-strapi") {
    console.error(USAGE)
    process.exitCode = 2
    return
  }

  const ctx = await NestFactory.createApplicationContext(CliModule, { logger: ["log", "warn", "error"] })
  try {
    if (command === "admin") {
      const [action, email] = [positionals[1], positionals[2]]
      const roles = ctx.get(AdminRolesService)
      if (action === "list") console.log(JSON.stringify(await roles.list(), null, 2))
      else if ((action === "grant" || action === "revoke") && email)
        console.log(JSON.stringify(await roles[action](email), null, 2))
      else {
        console.error("usage: admin grant <email> | admin revoke <email> | admin list")
        process.exitCode = 2
      }
    } else {
      const report = await ctx
        .get(MigrateStrapiService)
        .run({ dryRun: values["dry-run"], timezone: values.timezone })
      console.log(JSON.stringify(report, null, 2))
      if (report.dryRun) console.log("dry run: nothing was written")
    }
  } finally {
    await ctx.close()
  }
}

main().catch((err: unknown) => {
  console.error(err)
  process.exit(1)
})
