import { Inject, Injectable } from "@nestjs/common"
import { sql } from "drizzle-orm"
import { DRIZZLE, type Database } from "../database/database.module"
import { ts } from "./sql"

/**
 * Named leases in app.job_leases: one runner at a time across API instances. Taken with an upsert that only wins
 * when the lease expired or is already ours, so it works behind Supabase's transaction pooler (where session
 * advisory locks don't). A crashed holder's lease simply runs out.
 */
@Injectable()
export class JobLeases {
  constructor(@Inject(DRIZZLE) private readonly db: Database) {}

  /** The lease until `now + ttlMs`, or null when someone else holds it. Returns the last watermark. */
  async take(
    name: string,
    holder: string,
    now: Date,
    ttlMs: number,
  ): Promise<{ watermark: Date | null } | null> {
    const res = await this.db.execute<{ watermark: Date | string | null }>(sql`
      INSERT INTO app.job_leases (name, holder, locked_until, updated_at)
      VALUES (${name}, ${holder}, ${ts(new Date(now.getTime() + ttlMs))}, ${ts(now)})
      ON CONFLICT (name) DO UPDATE SET holder = excluded.holder, locked_until = excluded.locked_until,
        updated_at = excluded.updated_at
      WHERE app.job_leases.locked_until < ${ts(now)} OR app.job_leases.holder = excluded.holder
      RETURNING watermark
    `)
    const row = res.rows[0]
    if (!row) return null
    return { watermark: row.watermark === null ? null : new Date(row.watermark) }
  }

  /** Gives the lease back (and moves the watermark when the run completed). */
  async release(name: string, holder: string, now: Date, watermark?: Date): Promise<void> {
    await this.db.execute(sql`
      UPDATE app.job_leases SET locked_until = ${ts(now)}, updated_at = ${ts(now)}
        ${watermark ? sql`, watermark = ${ts(watermark)}` : sql``}
      WHERE name = ${name} AND holder = ${holder}
    `)
  }

  async watermark(name: string): Promise<Date | null> {
    const res = await this.db.execute<{ watermark: Date | string | null }>(
      sql`SELECT watermark FROM app.job_leases WHERE name = ${name}`,
    )
    const w = res.rows[0]?.watermark
    return w ? new Date(w) : null
  }
}
