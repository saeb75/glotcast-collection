import { readFileSync } from "node:fs"
import { Global, Inject, Injectable, Module, type OnApplicationShutdown } from "@nestjs/common"
import { drizzle, type NodePgDatabase } from "drizzle-orm/node-postgres"
import { Pool, type PoolConfig } from "pg"
import { AppConfig } from "../config/app-config.service"

export const PG_POOL = Symbol("PG_POOL")
export const DRIZZLE = Symbol("DRIZZLE")
export type Database = NodePgDatabase

/** DATABASE_SSL_CA may hold the PEM itself or a path to it. */
export function sslConfig(config: AppConfig): PoolConfig["ssl"] {
  if (!config.get("DATABASE_SSL")) return undefined
  const ca = config.get("DATABASE_SSL_CA")
  if (!ca) return { rejectUnauthorized: true }
  return { rejectUnauthorized: true, ca: ca.includes("BEGIN CERTIFICATE") ? ca : readFileSync(ca, "utf8") }
}

@Injectable()
class PoolShutdown implements OnApplicationShutdown {
  constructor(@Inject(PG_POOL) private readonly pool: Pool) {}

  async onApplicationShutdown(): Promise<void> {
    await this.pool.end()
  }
}

@Global()
@Module({
  providers: [
    {
      provide: PG_POOL,
      inject: [AppConfig],
      useFactory: (config: AppConfig) =>
        new Pool({
          connectionString: config.get("DATABASE_URL"),
          max: config.get("DATABASE_POOL_MAX"),
          ssl: sslConfig(config),
          application_name: "glotcast-api",
        }),
    },
    {
      provide: DRIZZLE,
      inject: [PG_POOL],
      // Unnamed queries only (no .prepare("name")): safe behind Supabase's transaction pooler.
      useFactory: (pool: Pool): Database => drizzle(pool),
    },
    PoolShutdown,
  ],
  exports: [PG_POOL, DRIZZLE],
})
export class DatabaseModule {}
