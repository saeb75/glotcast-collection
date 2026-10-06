import { type AuthFailure } from "@/services/SupabaseService"

export const AUTH = {
  title: "Sign in to GlotCast Admin",
  emailHint: "Use the email of your GlotCast account. We'll send you a sign-in code.",
  email: "Email",
  emailPlaceholder: "you@example.com",
  sendCode: "Send code",
  codeTitle: "Check your email",
  codeHint: (email: string) => `Enter the code we sent to ${email}.`,
  code: "Code",
  verify: "Sign in",
  otherEmail: "Use another email",
  resend: "Send a new code",
  notConfigured:
    "Sign-in isn't set up: set NEXT_PUBLIC_SUPABASE_URL and NEXT_PUBLIC_SUPABASE_PUBLISHABLE_KEY (.env.local, or the Docker build args) and rebuild.",
  signOut: "Sign out",
  forbiddenTitle: "No admin access",
  forbiddenBody: (email: string | null) =>
    `${email ?? "This account"} is signed in, but it isn't an admin. Ask for access, then sign in again.`,
  grantHint: "An admin grants access in the API with",
  checking: "Checking access…",
  accessFailed: "Couldn't check your access",
  signedIn: "Signed in",
}

export const AUTH_ERRORS: Record<AuthFailure, string> = {
  no_account: "There's no account with this email.",
  invalid_code: "That code is wrong or has expired. Check it, or send a new one.",
  rate_limited: "Too many codes sent. Wait a minute and try again.",
  not_configured: AUTH.notConfigured,
  unknown: "Something went wrong. Try again.",
}
