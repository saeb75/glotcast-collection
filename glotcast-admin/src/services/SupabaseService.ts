import { createBrowserClient } from "@supabase/ssr"
import { type Session, type SupabaseClient } from "@supabase/supabase-js"
import { env } from "@/config/env"

/** Why an email-code step failed, as a code (copy lives in `copy/auth.ts`). */
export type AuthFailure =
  "no_account" | "invalid_code" | "rate_limited" | "email_quota" | "not_configured" | "unknown"

export class AuthError extends Error {
  readonly code: AuthFailure

  constructor(code: AuthFailure, message: string) {
    super(message)
    this.code = code
  }
}

function failure(error: { message: string; code?: string; status?: number }): AuthError {
  const text = error.message.toLowerCase()
  if (error.code === "otp_disabled" || text.includes("signups not allowed"))
    return new AuthError("no_account", error.message)
  if (error.code === "otp_expired" || text.includes("expired") || text.includes("invalid"))
    return new AuthError("invalid_code", error.message)
  // 429s: the per-email cooldown ("…only request this after 42 seconds") or the project's hourly email cap
  // (Supabase's built-in mailer sends only a few emails an hour; a custom SMTP lifts it).
  if (text.includes("email rate limit")) return new AuthError("email_quota", error.message)
  if (error.status === 429 || text.includes("rate limit") || text.includes("request this after"))
    return new AuthError("rate_limited", error.message)
  return new AuthError("unknown", error.message)
}

let client: SupabaseClient | null = null

/** The browser client (cookie storage, so the proxy sees the session); created on first use, in the browser. */
function browserClient(): SupabaseClient | null {
  if (typeof window === "undefined" || !env.supabaseUrl || !env.supabaseKey) return null
  client ??= createBrowserClient(env.supabaseUrl, env.supabaseKey)
  return client
}

function auth() {
  const c = browserClient()
  if (!c) throw new AuthError("not_configured", "Supabase is not configured")
  return c.auth
}

/** Supabase Auth for the panel: the email code only, existing accounts only. Never knows the store. */
export class SupabaseService {
  static get configured(): boolean {
    return Boolean(env.supabaseUrl && env.supabaseKey)
  }

  static async session(): Promise<Session | null> {
    const c = browserClient()
    if (!c) return null
    const { data } = await c.auth.getSession()
    return data.session
  }

  /** The bearer for the API (refreshed by supabase-js when it is close to expiring). */
  static async accessToken(): Promise<string | null> {
    return (await this.session())?.access_token ?? null
  }

  /** Calls back on every sign-in, sign-out and token refresh; returns the unsubscribe. */
  static onSessionChange(listener: (session: Session | null) => void): () => void {
    const c = browserClient()
    if (!c) return () => undefined
    const { data } = c.auth.onAuthStateChange((_event, session) => listener(session))
    return () => data.subscription.unsubscribe()
  }

  /** Emails a sign-in code; no account is ever created from the panel. */
  static async sendCode(email: string): Promise<void> {
    const { error } = await auth().signInWithOtp({ email, options: { shouldCreateUser: false } })
    if (error) throw failure(error)
  }

  static async verifyCode(email: string, code: string): Promise<void> {
    const { error } = await auth().verifyOtp({ email, token: code, type: "email" })
    if (error) throw failure(error)
  }

  /** A fresh access token, so a role granted since sign-in reaches the API; false when the session is gone. */
  static async refresh(): Promise<boolean> {
    const { data, error } = await auth().refreshSession()
    return !error && data.session !== null
  }

  static async signOut(): Promise<void> {
    await auth().signOut()
  }
}
