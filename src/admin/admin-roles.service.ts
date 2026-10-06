import { Inject, Injectable, Logger } from "@nestjs/common"
import { type SQL, sql } from "drizzle-orm"
import { DRIZZLE, type Database } from "../database/database.module"
import { AdminAuditRepository } from "./audit/audit.repository"

export interface AdminAccount {
  id: string
  email: string | null
  role: string | null
  lastSignInAt: string | null
}

type Row = { id: string; email: string | null; role: string | null; last_sign_in_at: Date | string | null }

const account = (r: Row): AdminAccount => ({
  id: r.id,
  email: r.email,
  role: r.role,
  lastSignInAt: r.last_sign_in_at === null ? null : new Date(r.last_sign_in_at).toISOString(),
})

/**
 * Who may open the admin panel: `app_metadata.role = "admin"` on the Supabase auth account (only the server
 * can write app_metadata). CLI only; the role reaches the token on the next sign-in or token refresh.
 */
@Injectable()
export class AdminRolesService {
  private readonly logger = new Logger(AdminRolesService.name)

  constructor(
    @Inject(DRIZZLE) private readonly db: Database,
    private readonly audit: AdminAuditRepository,
  ) {}

  async grant(email: string): Promise<AdminAccount> {
    const account = await this.update(
      email,
      sql`coalesce(raw_app_meta_data, '{}'::jsonb) || '{"role": "admin"}'::jsonb`,
    )
    await this.record("role.grant", account)
    return account
  }

  async revoke(email: string): Promise<AdminAccount> {
    const account = await this.update(email, sql`coalesce(raw_app_meta_data, '{}'::jsonb) - 'role'`)
    await this.record("role.revoke", account)
    return account
  }

  /** Role changes go to the admin audit log with the CLI as the actor; a missing log never undoes the change. */
  private async record(action: string, account: AdminAccount): Promise<void> {
    await this.audit
      .record({
        actorId: null,
        actorEmail: null,
        action,
        targetType: "user",
        targetId: account.id,
        meta: { email: account.email, via: "cli" },
      })
      .catch((err: unknown) => this.logger.warn(`audit entry not written (${action}): ${String(err)}`))
  }

  async list(): Promise<AdminAccount[]> {
    const res = await this.db.execute<Row>(sql`
      SELECT id, email, raw_app_meta_data->>'role' AS role, last_sign_in_at
      FROM auth.users
      WHERE raw_app_meta_data->>'role' = 'admin' AND deleted_at IS NULL
      ORDER BY email
    `)
    return res.rows.map(account)
  }

  /** Registered accounts only: a guest has no email to sign in to the panel with. */
  private async update(email: string, meta: SQL): Promise<AdminAccount> {
    const res = await this.db.execute<Row>(sql`
      UPDATE auth.users SET raw_app_meta_data = ${meta}, updated_at = now()
      WHERE lower(email) = lower(${email.trim()}) AND NOT is_anonymous AND deleted_at IS NULL
      RETURNING id, email, raw_app_meta_data->>'role' AS role, last_sign_in_at
    `)
    const row = res.rows[0]
    if (!row) throw new Error(`no registered account with the email ${email}`)
    return account(row)
  }
}
