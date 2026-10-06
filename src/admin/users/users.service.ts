import { Inject, Injectable, NotFoundException } from "@nestjs/common"
import { type SQL, sql } from "drizzle-orm"
import { type PageQuery, offsetOf, toPage } from "../../common/pagination"
import { containsPattern, isoAt } from "../../common/rows"
import { DRIZZLE, type Database } from "../../database/database.module"
import { type Level } from "../../database/schema/app"
import { MeService } from "../../me/me.service"
import { type AdminUser, type AdminUserRow } from "./users.dto"

type Row = {
  id: string
  email: string | null
  name: string | null
  is_anonymous: boolean
  level: Level
  feature_access: boolean
  legacy_strapi_user_id: number | null
  created_at: Date | string
  last_seen_at: Date | string
}

const toRow = (r: Row): AdminUserRow => ({
  id: r.id,
  email: r.email,
  name: r.name,
  isAnonymous: r.is_anonymous,
  level: r.level,
  featureAccess: r.feature_access,
  legacyStrapiUserId: r.legacy_strapi_user_id,
  createdAt: isoAt(r.created_at),
  lastSeenAt: isoAt(r.last_seen_at),
})

const COLUMNS = sql`id, email, name, is_anonymous, level, feature_access, legacy_strapi_user_id, created_at, last_seen_at`

/** App users (app.users, guests included): search, profile + stats, and the one thing an admin changes. */
@Injectable()
export class AdminUsersService {
  constructor(
    @Inject(DRIZZLE) private readonly db: Database,
    private readonly me: MeService,
  ) {}

  async page(q: PageQuery & { q?: string }) {
    let where: SQL = sql``
    if (q.q) {
      const like = containsPattern(q.q)
      where = /^[0-9a-f-]{4,36}$/i.test(q.q)
        ? sql`WHERE email ILIKE ${like} OR name ILIKE ${like} OR id::text LIKE ${`${q.q.toLowerCase()}%`}`
        : sql`WHERE email ILIKE ${like} OR name ILIKE ${like}`
    }
    const [rows, total] = await Promise.all([
      this.db.execute<Row>(sql`
        SELECT ${COLUMNS} FROM app.users ${where} ORDER BY created_at DESC, id
        LIMIT ${q.pageSize} OFFSET ${offsetOf(q)}
      `),
      this.db.execute<{ n: number }>(sql`SELECT count(*)::int AS n FROM app.users ${where}`),
    ])
    return toPage(rows.rows.map(toRow), total.rows[0]?.n ?? 0, q)
  }

  async get(id: string): Promise<AdminUser> {
    const res = await this.db.execute<{ last_seen_at: Date | string; legacy_strapi_user_id: number | null }>(
      sql`SELECT last_seen_at, legacy_strapi_user_id FROM app.users WHERE id = ${id}`,
    )
    const row = res.rows[0]
    if (!row) throw new NotFoundException(`user ${id} not found`)
    const [me, stats] = await Promise.all([this.me.me(id), this.me.stats(id)])
    return {
      user: { ...me, lastSeenAt: isoAt(row.last_seen_at), legacyStrapiUserId: row.legacy_strapi_user_id },
      stats,
    }
  }

  async update(id: string, featureAccess: boolean): Promise<AdminUser> {
    const res = await this.db.execute(
      sql`UPDATE app.users SET feature_access = ${featureAccess}, updated_at = now() WHERE id = ${id} RETURNING id`,
    )
    if (!res.rows.length) throw new NotFoundException(`user ${id} not found`)
    return this.get(id)
  }
}
