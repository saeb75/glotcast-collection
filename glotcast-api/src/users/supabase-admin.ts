import { Injectable, Logger, ServiceUnavailableException } from "@nestjs/common"
import { AppConfig } from "../config/app-config.service"

/** The one server-side Supabase Auth call we need: deleting an auth user (service role key, never shipped). */
@Injectable()
export class SupabaseAdmin {
  private readonly logger = new Logger(SupabaseAdmin.name)
  private readonly url
  private readonly key

  constructor(config: AppConfig) {
    this.url = config.get("SUPABASE_URL")?.replace(/\/$/, "") ?? null
    this.key = config.get("SUPABASE_SERVICE_ROLE_KEY") ?? null
  }

  get configured(): boolean {
    return this.url !== null && this.key !== null
  }

  async deleteUser(userId: string): Promise<void> {
    if (!this.url || !this.key) throw new ServiceUnavailableException("account deletion is not configured")
    // Legacy service_role keys are JWTs (sent as apikey + bearer); new secret keys (sb_secret_…) as apikey only.
    const headers: Record<string, string> = this.key.startsWith("sb_secret_")
      ? { apikey: this.key }
      : { apikey: this.key, Authorization: `Bearer ${this.key}` }
    const res = await fetch(`${this.url}/auth/v1/admin/users/${userId}`, {
      method: "DELETE",
      headers,
      signal: AbortSignal.timeout(10_000),
    })
    // 404: already gone — the goal is reached either way.
    if (!res.ok && res.status !== 404) {
      this.logger.error({ status: res.status, userId }, "Supabase refused to delete the user")
      throw new ServiceUnavailableException("could not delete the account, try again")
    }
  }
}
