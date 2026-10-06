import { join } from "node:path"
import { drizzle } from "drizzle-orm/node-postgres"
import { migrate } from "drizzle-orm/node-postgres/migrator"
import { Pool } from "pg"
import { type AppConfig } from "../config/app-config.service"
import { sslConfig } from "./database.module"

export const MIGRATIONS_SCHEMA = "app"
export const MIGRATIONS_TABLE = "__drizzle_migrations"

/**
 * Applies drizzle/ (schema `app`) the way `npm run db:migrate` (drizzle-kit) does — same journal table
 * app.__drizzle_migrations — so the production image needs no dev tooling. A session connection
 * (DATABASE_MIGRATION_URL, Supabase :5432) when set: the transaction pooler can't run migrations.
 */
export async function migrateDatabase(config: AppConfig): Promise<void> {
  const pool = new Pool({
    connectionString: config.get("DATABASE_MIGRATION_URL") ?? config.get("DATABASE_URL"),
    max: 1,
    ssl: sslConfig(config),
    application_name: "glotcast-api-migrate",
  })
  try {
    await migrate(drizzle(pool), {
      migrationsFolder: join(__dirname, "..", "..", "drizzle"),
      migrationsSchema: MIGRATIONS_SCHEMA,
      migrationsTable: MIGRATIONS_TABLE,
    })
  } finally {
    await pool.end()
  }
}
