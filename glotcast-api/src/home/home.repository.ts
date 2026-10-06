import { Inject, Injectable } from "@nestjs/common"
import { sql } from "drizzle-orm"
import { DRIZZLE, type Database } from "../database/database.module"
import { type Level } from "../database/schema/app"

export interface HomeConfigIds {
  sliderEpisodeIds: string[]
  homeListIds: string[]
  exploreListIds: string[]
}

/** The editorial configuration row (absent = nothing configured yet). */
@Injectable()
export class HomeRepository {
  constructor(@Inject(DRIZZLE) private readonly db: Database) {}

  async config(): Promise<HomeConfigIds> {
    const res = await this.db.execute<{
      slider_episode_ids: string[]
      home_list_ids: string[]
      explore_list_ids: string[]
    }>(sql`SELECT slider_episode_ids, home_list_ids, explore_list_ids FROM app.home_config WHERE id = 1`)
    const row = res.rows[0]
    return {
      sliderEpisodeIds: row?.slider_episode_ids ?? [],
      homeListIds: row?.home_list_ids ?? [],
      exploreListIds: row?.explore_list_ids ?? [],
    }
  }

  async userLevel(userId: string): Promise<Level | null> {
    const res = await this.db.execute<{ level: Level }>(sql`SELECT level FROM app.users WHERE id = ${userId}`)
    return res.rows[0]?.level ?? null
  }
}
