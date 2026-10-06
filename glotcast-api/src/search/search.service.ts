import { Injectable } from "@nestjs/common"
import { sql } from "drizzle-orm"
import {
  CatalogRepository,
  EPISODE_SEARCH_TEXT,
  PODCAST_SEARCH_TEXT,
  searchPattern,
} from "../catalog/catalog.repository"

const MAX = 10

/** Case- and accent-insensitive substring search (unaccent + trigram indexes); title / name matches first. */
@Injectable()
export class SearchService {
  constructor(private readonly catalog: CatalogRepository) {}

  async search(q: string) {
    const pattern = searchPattern(q)
    const [podcasts, episodes] = await Promise.all([
      this.catalog.podcasts({
        where: sql`${PODCAST_SEARCH_TEXT} LIKE ${pattern}`,
        orderBy: sql`(app.search_text(p.name) LIKE ${pattern}) DESC, p.name`,
        limit: MAX,
      }),
      this.catalog.episodes({
        where: sql`${EPISODE_SEARCH_TEXT} LIKE ${pattern}`,
        orderBy: sql`(app.search_text(e.title) LIKE ${pattern}) DESC, e.published_at DESC, e.id`,
        limit: MAX,
      }),
    ])
    return { podcasts, episodes }
  }
}
