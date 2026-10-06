import { type SQL, sql } from "drizzle-orm"
import { type Database } from "../database/database.module"

/** A transaction handed out by `db.transaction`. */
export type Tx = Parameters<Parameters<Database["transaction"]>[0]>[0]
/** Where a step runs: the pool, or the dry run's transaction. */
export type Executor = Database | Tx

/** Validated uuids as one array literal (drizzle would expand a JS array into a parameter list). */
export const uuidArray = (ids: readonly string[]): SQL => sql`${`{${ids.join(",")}}`}::uuid[]`

/** A point in time as a parameter: every planner query takes `$now` (dry runs travel in time), never now(). */
export const ts = (at: Date): SQL => sql`${at.toISOString()}::timestamptz`

/** `AND <column> = ANY(ids)` when the caller limits a step to some users (tests, the CLI's --user). */
export const onlyUsers = (column: SQL, ids?: readonly string[]): SQL =>
  ids ? sql`AND ${column} = ANY(${uuidArray(ids)})` : sql``

/** A Postgres "HH:mm" time literal. */
export const time = (hm: string): SQL => sql`${hm}::time`
