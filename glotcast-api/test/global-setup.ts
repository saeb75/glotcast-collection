/**
 * Builds `glotcast_test` from scratch for the e2e suite, in production order: Supabase's `auth` schema (a
 * stand-in), the legacy Strapi + glotcast-vocab tables in `public` (real Strapi v5 rows, see the fixture), then this
 * API's Drizzle migrations.
 *
 * Postgres: TEST_ADMIN_URL / TEST_DATABASE_URL when set (CI); otherwise the project's throwaway local cluster on
 * :54329 (`scripts/local-db.sh`), started here if it is not running and stopped again afterwards.
 */
import { execFileSync } from "node:child_process"
import { readFileSync } from "node:fs"
import { join } from "node:path"
import { drizzle } from "drizzle-orm/node-postgres"
import { migrate } from "drizzle-orm/node-postgres/migrator"
import { Client, Pool } from "pg"

export const TEST_DB = "glotcast_test"
const root = join(__dirname, "..")
const ADMIN_URL = process.env.TEST_ADMIN_URL ?? "postgresql://postgres@localhost:54329/postgres"

async function reachable(url: string): Promise<boolean> {
  const client = new Client({ connectionString: url, connectionTimeoutMillis: 2_000 })
  try {
    await client.connect()
    return true
  } catch {
    return false
  } finally {
    await client.end().catch(() => undefined)
  }
}

export default async function setup(): Promise<() => void> {
  let started = false
  if (!(await reachable(ADMIN_URL))) {
    if (process.env.TEST_ADMIN_URL) throw new Error(`Postgres is not reachable at TEST_ADMIN_URL`)
    execFileSync("sh", [join(root, "scripts", "local-db.sh"), "start"], { stdio: "inherit" })
    started = true
  }

  const admin = new Client({ connectionString: ADMIN_URL })
  await admin.connect()
  await admin.query(`DROP DATABASE IF EXISTS ${TEST_DB} WITH (FORCE)`)
  await admin.query(`CREATE DATABASE ${TEST_DB} TEMPLATE template0 ENCODING 'UTF8'`)
  await admin.end()

  const url = process.env.TEST_DATABASE_URL ?? ADMIN_URL.replace(/\/[^/]*$/, `/${TEST_DB}`)
  const pool = new Pool({ connectionString: url })
  try {
    await pool.query(readFileSync(join(root, "test", "fixtures", "auth.sql"), "utf8"))
    await pool.query(readFileSync(join(root, "test", "fixtures", "strapi.sql"), "utf8"))
    await migrate(drizzle(pool), {
      migrationsFolder: join(root, "drizzle"),
      migrationsSchema: "app",
      migrationsTable: "__drizzle_migrations",
    })
  } finally {
    await pool.end()
  }

  return () => {
    if (started) execFileSync("sh", [join(root, "scripts", "local-db.sh"), "stop"], { stdio: "inherit" })
  }
}
