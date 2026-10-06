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
 *   notify status   OneSignal configured?, NOTIFICATIONS_ENABLED, last tick, the automations, last 24 h by status
 *   notify dry-run [--at ISO] [--window MIN] [--user id|email] [--all-on]
 *                  what a tick at --at (default now) would plan — live episodes, the daily pushes due in the last
 *                  --window minutes (default 5), new episodes, due campaigns — as a table; written in one
 *                  transaction that is rolled back, nothing is sent. --all-on: as if every automation were on
 *   notify test <email|--user uuid> [--kind reminder|streak_saver|learning|new_episodes] [--lang tr]
 *                  a sample push of that kind to one user now (outside caps and quiet hours)
 *   notify tick    one scheduler run now (needs NOTIFICATIONS_ENABLED and OneSignal)
 *
 * Runs on a slim application context (no HTTP server).
 */
import "./cli-env"
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
import { type DryRunRow, NotifyCliService } from "./notifications/notify-cli.service"
import { NotificationsCoreModule } from "./notifications/notifications-core.module"
import { MigrateStrapiService } from "./strapi/migrate-strapi.service"
import { StrapiModule } from "./strapi/strapi.module"

@Module({
  imports: [AppConfigModule, DatabaseModule, AdminRolesModule, StrapiModule, NotificationsCoreModule],
})
class CliModule {}

const USAGE =
  "usage: node dist/cli.js <db-migrate | openapi [--out file] | admin grant|revoke <email> | admin list | " +
  "migrate-strapi [--dry-run] [--timezone UTC] | notify status | notify dry-run [--at ISO] [--window MIN] " +
  "[--user id|email] [--all-on] | notify test <email|--user uuid> [--kind reminder] [--lang tr] | notify tick>"

/** A fixed-width table for the terminal (long cells are cut). */
function printTable(rows: DryRunRow[]): void {
  const columns: [keyof DryRunRow, string, number][] = [
    ["user", "user", 26],
    ["timezone", "tz", 20],
    ["localTime", "local", 9],
    ["kind", "kind", 12],
    ["status", "status", 22],
    ["variant", "variant", 20],
    ["language", "lang", 4],
    ["title", "title", 40],
    ["body", "body", 70],
    ["due", "due (UTC)", 24],
  ]
  const cell = (text: string, width: number) => {
    const chars = [...text.replace(/\s+/g, " ")]
    return (chars.length > width ? `${chars.slice(0, width - 1).join("")}…` : chars.join("")).padEnd(width)
  }
  console.log(columns.map(([, label, w]) => cell(label, w)).join("  "))
  for (const row of rows) console.log(columns.map(([key, , w]) => cell(String(row[key]), w)).join("  "))
}

async function notify(
  ctx: { get: <T>(type: new (...args: never[]) => T) => T },
  args: string[],
  values: { at?: string; window?: string; user?: string; kind?: string; lang?: string; "all-on"?: boolean },
) {
  const cli = ctx.get(NotifyCliService)
  const action = args[0]
  if (action === "status") {
    console.log(JSON.stringify(await cli.status(), null, 2))
  } else if (action === "dry-run") {
    const at = values.at ? new Date(values.at) : new Date()
    const windowMin = Number(values.window ?? 5)
    if (Number.isNaN(at.getTime()) || !(windowMin > 0))
      throw new Error("--at must be an ISO time, --window minutes")
    const out = await cli.dryRun({ at, windowMin, user: values.user, allOn: values["all-on"] })
    console.log(
      `window ${out.window}; ${out.live} episodes went live${values["all-on"] ? "; every automation assumed on" : ""}`,
    )
    printTable(out.rows)
    console.log(`${out.rows.length} rows — dry run: rolled back, nothing was written or sent`)
  } else if (action === "test") {
    const user = values.user ?? args[1]
    if (!user) throw new Error("usage: notify test <email|--user uuid> [--kind reminder] [--lang tr]")
    console.log(JSON.stringify(await cli.test({ user, kind: values.kind, lang: values.lang }), null, 2))
  } else if (action === "tick") {
    console.log(JSON.stringify(await cli.tick(), null, 2))
  } else {
    console.error(USAGE)
    process.exitCode = 2
  }
}

async function main(): Promise<void> {
  const { positionals, values } = parseArgs({
    allowPositionals: true,
    options: {
      out: { type: "string", default: "openapi.json" },
      "dry-run": { type: "boolean", default: false },
      timezone: { type: "string", default: "UTC" },
      at: { type: "string" },
      window: { type: "string" },
      user: { type: "string" },
      kind: { type: "string" },
      lang: { type: "string" },
      "all-on": { type: "boolean", default: false },
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

  if (command !== "admin" && command !== "migrate-strapi" && command !== "notify") {
    console.error(USAGE)
    process.exitCode = 2
    return
  }

  const ctx = await NestFactory.createApplicationContext(CliModule, { logger: ["log", "warn", "error"] })
  try {
    if (command === "notify") {
      await notify(ctx, positionals.slice(1), values)
    } else if (command === "admin") {
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
