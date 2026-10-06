import { BadRequestException, Inject, Injectable } from "@nestjs/common"
import { sql } from "drizzle-orm"
import { DRIZZLE, type Database } from "../../database/database.module"
import { type HomeConfigIds, HomeRepository } from "../../home/home.repository"
import { type HomeConfigInput } from "./home-config.dto"

const uuidArray = (ids: string[]) => sql`${`{${ids.join(",")}}`}::uuid[]`

@Injectable()
export class AdminHomeConfigService {
  constructor(
    @Inject(DRIZZLE) private readonly db: Database,
    private readonly home: HomeRepository,
  ) {}

  get(): Promise<HomeConfigIds> {
    return this.home.config()
  }

  /** Replaces the whole configuration; every id must exist (drafts are allowed: the app skips them). */
  async put(body: HomeConfigInput): Promise<HomeConfigIds> {
    const input: HomeConfigInput = {
      sliderEpisodeIds: [...new Set(body.sliderEpisodeIds)],
      homeListIds: [...new Set(body.homeListIds)],
      exploreListIds: [...new Set(body.exploreListIds)],
    }
    const lists = [...new Set([...input.homeListIds, ...input.exploreListIds])]
    const [episodes, found] = await Promise.all([
      this.db.execute<{ n: number }>(
        sql`SELECT count(*)::int AS n FROM app.episodes WHERE id = ANY(${uuidArray(input.sliderEpisodeIds)})`,
      ),
      this.db.execute<{ n: number }>(
        sql`SELECT count(*)::int AS n FROM app.lists WHERE id = ANY(${uuidArray(lists)})`,
      ),
    ])
    if (episodes.rows[0]?.n !== input.sliderEpisodeIds.length)
      throw new BadRequestException("unknown episode id")
    if (found.rows[0]?.n !== lists.length) throw new BadRequestException("unknown list id")
    await this.db.execute(sql`
      INSERT INTO app.home_config (id, slider_episode_ids, home_list_ids, explore_list_ids, updated_at)
      VALUES (1, ${uuidArray(input.sliderEpisodeIds)}, ${uuidArray(input.homeListIds)}, ${uuidArray(input.exploreListIds)}, now())
      ON CONFLICT (id) DO UPDATE SET slider_episode_ids = excluded.slider_episode_ids,
        home_list_ids = excluded.home_list_ids, explore_list_ids = excluded.explore_list_ids, updated_at = now()
    `)
    return this.home.config()
  }
}
