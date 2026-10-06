// Runs before each e2e file: point the app at the throwaway test database, with no external service configured
// (every client the tests need is replaced by a fake in test/helpers.ts).
const adminUrl = process.env.TEST_ADMIN_URL ?? "postgresql://postgres@localhost:54329/postgres"
process.env.NODE_ENV = "test"
process.env.LOG_LEVEL = "warn"
process.env.DATABASE_URL = process.env.TEST_DATABASE_URL ?? adminUrl.replace(/\/[^/]*$/, "/glotcast_test")
process.env.DATABASE_SSL = "false"
process.env.RATE_LIMIT_PER_MINUTE = "100000" // one IP sends every request of a spec
process.env.DATABASE_SSL_CA = ""
process.env.STRAPI_DATABASE_URL = "" // = DATABASE_URL: the fixture's legacy tables live in its public schema
process.env.STRAPI_PUBLIC_URL = "https://panel.example.com"
process.env.SUPABASE_URL = ""
process.env.SUPABASE_SERVICE_ROLE_KEY = ""
for (const key of [
  "GOOGLE_TRANSLATE_API_KEY",
  "YANDEX_DICT_KEY",
  "R2_ACCOUNT_ID",
  "R2_ACCESS_KEY_ID",
  "R2_SECRET_ACCESS_KEY",
  "R2_BUCKET",
  "R2_PUBLIC_BASE_URL",
  "ASSEMBLYAI_API_KEY",
  "OPENAI_API_KEY",
  "GEMINI_API_KEY",
  "ONESIGNAL_APP_ID",
  "ONESIGNAL_API_KEY",
  "NOTIFICATIONS_ENABLED",
  "ONESIGNAL_CONCURRENCY",
])
  process.env[key] = ""
