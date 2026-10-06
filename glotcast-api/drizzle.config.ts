import "dotenv/config"
import { readFileSync } from "node:fs"
import { defineConfig } from "drizzle-kit"

const url =
  process.env.DATABASE_MIGRATION_URL || process.env.DATABASE_URL || "postgresql://postgres@localhost:54329/glotcast"
const ca = process.env.DATABASE_SSL === "true" && process.env.DATABASE_SSL_CA
// Supabase: TLS verified against the project CA (DATABASE_SSL_CA, a PEM or a path to one).
const dbCredentials = ca
  ? (() => {
      const u = new URL(url)
      return {
        host: u.hostname,
        port: Number(u.port || 5432),
        user: decodeURIComponent(u.username),
        password: decodeURIComponent(u.password),
        database: u.pathname.slice(1) || "postgres",
        ssl: {
          rejectUnauthorized: true,
          ca: ca.includes("BEGIN CERTIFICATE") ? ca : readFileSync(ca, "utf8"),
        },
      }
    })()
  : { url }

// Only schema `app` is visible to drizzle-kit: migrations can never touch Strapi's `public` tables or Supabase's
// own schemas. Never use `drizzle-kit push` against a shared database.
export default defineConfig({
  dialect: "postgresql",
  schema: ["./src/database/schema/app.ts"],
  out: "./drizzle",
  schemaFilter: ["app"],
  migrations: { schema: "app", table: "__drizzle_migrations" },
  dbCredentials,
  strict: true,
  verbose: true,
})
