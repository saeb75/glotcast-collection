import { create } from "axios"
import { env } from "@/config/env"
import { SupabaseService } from "@/services/SupabaseService"
import { errorCode } from "./errors"

let onUnauthorized: (() => void) | null = null

/** Who to tell when the API rejects the session (401) — the auth controller. A 403 never signs out. */
export function setUnauthorizedHandler(handler: () => void): void {
  onUnauthorized = handler
}

/** The one instance every request goes through: the API's origin and the admin's Supabase bearer. */
export const api = create({ baseURL: env.apiUrl, timeout: 30_000 })

api.interceptors.request.use(async (config) => {
  const token = await SupabaseService.accessToken()
  if (token) config.headers.set("Authorization", `Bearer ${token}`)
  return config
})

api.interceptors.response.use(
  (response) => response,
  (error: unknown) => {
    const failure = errorCode(error)
    if (failure.code === "unauthorized") onUnauthorized?.()
    return Promise.reject(failure)
  },
)
