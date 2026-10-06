import { Injectable } from "@nestjs/common"
import { sql } from "drizzle-orm"
import { type AuthClaims } from "../auth/auth-verifier"
import { type Home } from "../catalog/catalog.dto"
import { CatalogRepository, EPISODE_VISIBLE, hasLevel, TRENDING_JOIN } from "../catalog/catalog.repository"
import { type Level } from "../database/schema/app"
import { LATEST_ORDER, TRENDING_ORDER } from "../episodes/episodes.service"
import { ListsRepository } from "../lists/lists.repository"
import { ProgressRepository } from "../me/progress.repository"
import { HomeRepository } from "./home.repository"

const ROW = 10

@Injectable()
export class HomeService {
  constructor(
    private readonly catalog: CatalogRepository,
    private readonly home: HomeRepository,
    private readonly lists: ListsRepository,
    private readonly progress: ProgressRepository,
  ) {}

  async build(user: AuthClaims | null, level?: Level): Promise<Home> {
    const [config, userLevel] = await Promise.all([
      this.home.config(),
      !level && user ? this.home.userLevel(user.userId) : Promise.resolve(null),
    ])
    const forLevel: Level = level ?? userLevel ?? "bg"
    const [slider, continueListening, forYourLevel, lists, following, latest] = await Promise.all([
      this.catalog.episodesByIds(config.sliderEpisodeIds),
      user ? this.progress.continueListening(user.userId, ROW) : Promise.resolve([]),
      this.catalog.episodes({ where: hasLevel(forLevel), orderBy: LATEST_ORDER, limit: ROW }),
      this.lists.previews(config.homeListIds, ROW),
      user ? this.following(user.userId) : Promise.resolve([]),
      this.catalog.episodes({ orderBy: LATEST_ORDER, limit: ROW }),
    ])
    return { slider, continueListening, forYourLevel, lists, following, latest }
  }

  /** The newest visible episode of each followed podcast, newest first. */
  private following(userId: string) {
    return this.catalog.episodes({
      where: sql`e.id IN (
        SELECT DISTINCT ON (e.podcast_id) e.id
        FROM app.episodes e JOIN app.podcasts p ON p.id = e.podcast_id
        JOIN app.follows f ON f.podcast_id = e.podcast_id AND f.user_id = ${userId}
        WHERE ${EPISODE_VISIBLE}
        ORDER BY e.podcast_id, e.published_at DESC, e.id DESC
      )`,
      orderBy: LATEST_ORDER,
      limit: ROW,
    })
  }

  async discover() {
    const config = await this.home.config()
    const [categories, lists, trending] = await Promise.all([
      this.catalog.categories(),
      this.lists.previews(config.exploreListIds, ROW),
      this.catalog.episodes({ join: TRENDING_JOIN, orderBy: TRENDING_ORDER, limit: ROW }),
    ])
    return { categories, lists, trending }
  }
}
