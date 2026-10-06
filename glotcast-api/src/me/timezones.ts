import { Inject, Injectable } from "@nestjs/common"
import { sql } from "drizzle-orm"
import { DRIZZLE, type Database } from "../database/database.module"

/** The IANA zones Postgres knows (the planner computes local times with them), read once per process. */
@Injectable()
export class Timezones {
  private names: Promise<Set<string>> | null = null

  constructor(@Inject(DRIZZLE) private readonly db: Database) {}

  async isKnown(name: string): Promise<boolean> {
    this.names ??= this.db
      .execute<{ name: string }>(sql`SELECT name FROM pg_timezone_names`)
      .then((res) => new Set(res.rows.map((r) => r.name)))
      .catch((err: unknown) => {
        this.names = null
        throw err
      })
    return (await this.names).has(name)
  }
}
