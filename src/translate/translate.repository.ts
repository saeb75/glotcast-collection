import { Inject, Injectable } from "@nestjs/common"
import { sql } from "drizzle-orm"
import { DRIZZLE, type Database } from "../database/database.module"
import { type Level } from "../database/schema/app"

/** Cached transcript translations (app.translations), per episode, level and Google target. */
@Injectable()
export class TranslateRepository {
  constructor(@Inject(DRIZZLE) private readonly db: Database) {}

  async cached(episodeId: string, level: Level, target: string): Promise<string[] | null> {
    const res = await this.db.execute<{ chunks: string[] }>(sql`
      SELECT chunks FROM app.translations WHERE episode_id = ${episodeId} AND level = ${level} AND target = ${target}
    `)
    return res.rows[0]?.chunks ?? null
  }

  async store(episodeId: string, level: Level, target: string, chunks: string[]): Promise<void> {
    await this.db.execute(sql`
      INSERT INTO app.translations (episode_id, level, target, chunks)
      VALUES (${episodeId}, ${level}, ${target}, ${JSON.stringify(chunks)}::jsonb)
      ON CONFLICT (episode_id, level, target) DO UPDATE SET chunks = excluded.chunks, created_at = now()
    `)
  }
}
