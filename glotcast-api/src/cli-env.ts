/**
 * Imported first by cli.ts. `openapi` builds the app without ever touching a database (the pool connects
 * lazily), but the env validation, which runs when the modules load, wants a DATABASE_URL: give it a placeholder.
 */
if (process.argv[2] === "openapi" && !process.env.DATABASE_URL) {
  process.env.DATABASE_URL = "postgresql://localhost/openapi-placeholder"
}
