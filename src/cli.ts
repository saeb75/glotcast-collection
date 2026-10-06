import "reflect-metadata"
import { writeFileSync } from "node:fs"
import { parseArgs } from "node:util"
import { NestFactory } from "@nestjs/core"
import { AppModule } from "./app.module"
import { AppConfig } from "./config/app-config.service"
import { AppConfigModule } from "./config/config.module"
import { migrateDatabase } from "./database/migrate"
import { buildOpenApi, configureApp } from "./setup-app"

async function main(): Promise<void> {
  const { positionals, values } = parseArgs({
    allowPositionals: true,
    options: { out: { type: "string", default: "openapi.json" } },
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
  }
}

main().catch((err: unknown) => {
  console.error(err)
  process.exit(1)
})
