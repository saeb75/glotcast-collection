import { z } from "zod"

/**
 * Every setting comes from the environment (12-factor), validated once at boot. External services are optional:
 * an unset key makes the routes that need it answer 503, never the boot fail.
 */
export const envSchema = z.object({
  NODE_ENV: z.enum(["development", "test", "production"]).default("development"),
  PORT: z.coerce.number().int().positive().default(3000),
  LOG_LEVEL: z.enum(["fatal", "error", "warn", "info", "debug", "trace"]).default("info"),

  DATABASE_URL: z.string().min(1),
  DATABASE_MIGRATION_URL: z.string().min(1).optional(),
  DATABASE_SSL: z.stringbool().default(false),
  DATABASE_SSL_CA: z.string().optional(),
  DATABASE_POOL_MAX: z.coerce.number().int().positive().default(10),
  // Only `migrate-strapi` reads it (read-only): the database Strapi wrote. Defaults to DATABASE_URL — in
  // production both live in the same Supabase Postgres (Strapi in `public`, this API in `app`).
  STRAPI_DATABASE_URL: z.string().min(1).optional(),
  // Prefix for Strapi upload URLs stored relative ("/uploads/x.png", the local upload provider).
  STRAPI_PUBLIC_URL: z.url().optional(),

  CORS_ORIGINS: z
    .string()
    .default("http://localhost:3001")
    .transform((v) =>
      v
        .split(",")
        .map((s) => s.trim())
        .filter(Boolean),
    ),
  // Proxies in front of the API (Coolify's Traefik = 1): the client IP for rate limits comes from X-Forwarded-For.
  TRUST_PROXY: z.coerce.number().int().nonnegative().default(0),
  // Requests per minute per client IP, every route (translation and lookups also have a per-user limit).
  RATE_LIMIT_PER_MINUTE: z.coerce.number().int().positive().default(120),

  // Supabase Auth: the app signs users in (Apple, Google, anonymous guests); the API verifies their access
  // tokens against the project's JWKS. Unset = the user routes answer 503. The service role key is only used
  // server-side, to delete auth users (account deletion, a claimed guest).
  SUPABASE_URL: z.url().optional(),
  SUPABASE_SERVICE_ROLE_KEY: z.string().optional(),
  // Only for projects still on the legacy shared HS256 secret; new projects sign with keys published as JWKS.
  SUPABASE_JWT_SECRET: z.string().optional(),

  // What GET /v1/app/config tells the app about updates.
  APP_MIN_SUPPORTED_VERSION: z.string().default("1.0.0"),
  APP_LATEST_VERSION: z.string().default("1.0.0"),

  // Google Cloud Translation v2 (transcript and text translation). Never shipped in the app.
  GOOGLE_TRANSLATE_API_KEY: z.string().optional(),
  // Yandex Dictionary (word lookup translations); without it the lookup uses Google's free endpoint only.
  YANDEX_DICT_KEY: z.string().optional(),

  // Cloudflare R2 (S3 API): audio and images uploaded by the admin, generated covers.
  R2_ACCOUNT_ID: z.string().optional(),
  R2_ACCESS_KEY_ID: z.string().optional(),
  R2_SECRET_ACCESS_KEY: z.string().optional(),
  R2_BUCKET: z.string().optional(),
  R2_PUBLIC_BASE_URL: z.url().optional(),

  // Admin content pipeline.
  ASSEMBLYAI_API_KEY: z.string().optional(),
  OPENAI_API_KEY: z.string().optional(),
  GEMINI_API_KEY: z.string().optional(),
  GEMINI_IMAGE_MODEL: z.string().default("gemini-3.1-flash-image-preview"),
})

export type Env = z.infer<typeof envSchema>

/** Empty strings in .env mean "unset". */
export function validateEnv(raw: Record<string, unknown>): Env {
  const cleaned = Object.fromEntries(Object.entries(raw).filter(([, v]) => v !== ""))
  const result = envSchema.safeParse(cleaned)
  if (!result.success) {
    throw new Error(`Invalid environment:\n${z.prettifyError(result.error)}`)
  }
  return result.data
}
