import { z } from "zod"

const blankToUndefined = (v: string | undefined) => (v?.trim() ? v.trim() : undefined)

/**
 * Build-time settings (Next inlines NEXT_PUBLIC_* when it builds): a missing Supabase project shows "not set
 * up" on the sign-in page, never a crash. `apiUrl` empty = same origin (`next dev` proxies /v1 to the API).
 */
export const env = z
  .object({
    apiUrl: z.string().default(""),
    supabaseUrl: z.url().optional().catch(undefined),
    supabaseKey: z.string().min(1).optional(),
  })
  .parse({
    apiUrl: blankToUndefined(process.env.NEXT_PUBLIC_API_URL)?.replace(/\/+$/, ""),
    supabaseUrl: blankToUndefined(process.env.NEXT_PUBLIC_SUPABASE_URL),
    supabaseKey: blankToUndefined(process.env.NEXT_PUBLIC_SUPABASE_PUBLISHABLE_KEY),
  })

export const supabaseConfigured = Boolean(env.supabaseUrl && env.supabaseKey)
