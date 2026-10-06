import { Inject, Injectable, ServiceUnavailableException, UnauthorizedException } from "@nestjs/common"
import { createRemoteJWKSet, type CryptoKey, type JWTPayload, jwtVerify, type JWTVerifyGetKey } from "jose"
import { AppConfig } from "../config/app-config.service"

/** What the API keeps from a Supabase access token. */
export interface AuthClaims {
  userId: string
  isAnonymous: boolean
  email: string | null
  /** `app_metadata.role === "admin"`: opens /v1/admin. Only the server can write `app_metadata`. */
  isAdmin: boolean
  /** From the identity provider (`user_metadata`): Google's / Apple's name and picture, when given. */
  name: string | null
  avatarUrl: string | null
}

const text = (v: unknown): string | null => (typeof v === "string" && v.trim() ? v.trim() : null)

/** Supabase access-token claims → ours; a token without a user id is not a user token. */
export function claimsFrom(payload: JWTPayload): AuthClaims {
  const sub = payload.sub
  if (!sub || !/^[0-9a-f-]{36}$/i.test(sub)) throw new UnauthorizedException("token has no user")
  const email = text(payload.email)
  const meta = payload.app_metadata
  const isAdmin = typeof meta === "object" && meta !== null && (meta as { role?: unknown }).role === "admin"
  const user = (typeof payload.user_metadata === "object" && payload.user_metadata) || {}
  const u = user as Record<string, unknown>
  return {
    userId: sub,
    isAnonymous: payload.is_anonymous === true,
    email,
    isAdmin,
    name: text(u.full_name) ?? text(u.name),
    avatarUrl: text(u.avatar_url) ?? text(u.picture),
  }
}

/** Where access tokens come from and how they are signed; null = auth not configured. */
export interface AuthKeys {
  issuer: string
  /** The project's signing keys (JWKS) — or, in tests, a local public key. */
  key: JWTVerifyGetKey | CryptoKey
  /** Legacy shared HS256 secret, tried first when set. */
  secret?: Uint8Array
}
export const AUTH_KEYS = Symbol("AUTH_KEYS")

/** Supabase: `<url>/auth/v1` issues tokens, `<url>/auth/v1/.well-known/jwks.json` publishes the keys. */
export function supabaseKeys(config: AppConfig): AuthKeys | null {
  const url = config.get("SUPABASE_URL")?.replace(/\/$/, "")
  if (!url) return null
  const secret = config.get("SUPABASE_JWT_SECRET")
  return {
    issuer: `${url}/auth/v1`,
    key: createRemoteJWKSet(new URL(`${url}/auth/v1/.well-known/jwks.json`)), // cached, refreshed by jose
    ...(secret ? { secret: new TextEncoder().encode(secret) } : {}),
  }
}

/** Verifies Supabase Auth access tokens: signature, issuer, audience `authenticated`, expiry. */
@Injectable()
export class AuthVerifier {
  constructor(@Inject(AUTH_KEYS) private readonly keys: AuthKeys | null) {}

  get configured(): boolean {
    return this.keys !== null
  }

  async verify(token: string): Promise<AuthClaims> {
    const keys = this.keys
    if (!keys) throw new ServiceUnavailableException("auth is not configured")
    const options = { issuer: keys.issuer, audience: "authenticated" }
    let payload: JWTPayload
    try {
      const verified = keys.secret
        ? await jwtVerify(token, keys.secret, options).catch(() =>
            jwtVerify(token, keys.key as JWTVerifyGetKey, options),
          )
        : await jwtVerify(token, keys.key as JWTVerifyGetKey, options)
      payload = verified.payload
    } catch {
      throw new UnauthorizedException("invalid or expired token")
    }
    return claimsFrom(payload)
  }
}
