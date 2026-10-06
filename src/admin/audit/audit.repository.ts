import { Inject, Injectable } from "@nestjs/common"
import { type SQL, sql } from "drizzle-orm"
import { isoAt } from "../../common/rows"
import { DRIZZLE, type Database } from "../../database/database.module"
import { adminAudit } from "../../database/schema/app"
import { type AuditEntry } from "./audit.dto"

export interface NewAuditEntry {
  actorId: string | null
  actorEmail: string | null
  action: string
  targetType: string | null
  targetId: string | null
  meta?: Record<string, unknown>
}

export interface AuditQuery {
  action?: string
  targetId?: string
  actorId?: string
  limit: number
  before?: number
}

/** The admin audit log: append-only writes, newest-first reads. */
@Injectable()
export class AdminAuditRepository {
  constructor(@Inject(DRIZZLE) private readonly db: Database) {}

  async record(entry: NewAuditEntry): Promise<void> {
    await this.db.insert(adminAudit).values({ ...entry, meta: entry.meta ?? {} })
  }

  async list(query: AuditQuery): Promise<{ entries: AuditEntry[]; nextBefore?: number }> {
    const parts: SQL[] = []
    if (query.action) parts.push(sql`action = ${query.action}`)
    if (query.targetId) parts.push(sql`target_id = ${query.targetId}`)
    if (query.actorId) parts.push(sql`actor_id = ${query.actorId}`)
    if (query.before) parts.push(sql`id < ${query.before}`)
    const where = parts.length ? sql`WHERE ${sql.join(parts, sql` AND `)}` : sql``
    const rows = await this.db.execute<{
      id: string
      at: Date | string
      actor_id: string | null
      actor_email: string | null
      action: string
      target_type: string | null
      target_id: string | null
      meta: Record<string, unknown>
    }>(sql`
      SELECT id, at, actor_id, actor_email, action, target_type, target_id, meta
      FROM app.admin_audit ${where} ORDER BY id DESC LIMIT ${query.limit}
    `)
    const entries = rows.rows.map((r) => ({
      id: Number(r.id),
      at: isoAt(r.at),
      actor: r.actor_id ? { id: r.actor_id, email: r.actor_email } : null,
      action: r.action,
      targetType: r.target_type,
      targetId: r.target_id,
      meta: r.meta,
    }))
    const last = entries.at(-1)
    return { entries, ...(entries.length === query.limit && last ? { nextBefore: last.id } : {}) }
  }
}
