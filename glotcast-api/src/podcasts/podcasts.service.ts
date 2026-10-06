import { Injectable, NotFoundException } from "@nestjs/common"
import { sql } from "drizzle-orm"
import { type AuthClaims } from "../auth/auth-verifier"
import { type PodcastDetail } from "../catalog/catalog.dto"
import { CatalogRepository } from "../catalog/catalog.repository"
import { type PageQuery, offsetOf, toPage } from "../common/pagination"
import { PodcastsRepository } from "./podcasts.repository"

@Injectable()
export class PodcastsService {
  constructor(
    private readonly catalog: CatalogRepository,
    private readonly podcasts: PodcastsRepository,
  ) {}

  categories() {
    return this.catalog.categories()
  }

  async list(q: PageQuery & { category?: string }) {
    const join = q.category
      ? sql`JOIN app.podcast_categories pc ON pc.podcast_id = p.id
            JOIN app.categories c ON c.id = pc.category_id AND c.slug = ${q.category}`
      : undefined
    const [items, total] = await Promise.all([
      this.catalog.podcasts({
        join,
        orderBy: CatalogRepository.PODCAST_ORDER,
        limit: q.pageSize,
        offset: offsetOf(q),
      }),
      this.catalog.countPodcasts({ join }),
    ])
    return toPage(items, total, q)
  }

  async detail(user: AuthClaims | null, ref: string): Promise<PodcastDetail> {
    const id = await this.resolve(ref)
    const [podcast, categories, levels, isFollowing] = await Promise.all([
      this.podcasts.visible(id),
      this.catalog.podcastCategories(id),
      this.podcasts.levels(id),
      user ? this.podcasts.isFollowing(user.userId, id) : Promise.resolve(false),
    ])
    if (!podcast) throw new NotFoundException(`podcast ${ref} not found`)
    return { ...podcast, categories, isFollowing, levels }
  }

  async episodes(ref: string, q: PageQuery & { sort: "asc" | "desc" }) {
    const id = await this.resolve(ref)
    if (!(await this.podcasts.visible(id))) throw new NotFoundException(`podcast ${ref} not found`)
    const dir = q.sort === "desc" ? sql`DESC` : sql`ASC`
    const where = sql`e.podcast_id = ${id}`
    const [items, total] = await Promise.all([
      this.catalog.episodes({
        where,
        orderBy: sql`e.number ${dir} NULLS LAST, e.published_at ${dir}, e.id`,
        limit: q.pageSize,
        offset: offsetOf(q),
      }),
      this.catalog.countEpisodes({ where }),
    ])
    return toPage(items, total, q)
  }

  private async resolve(ref: string): Promise<string> {
    const id = await this.catalog.podcastIdOf(ref)
    if (!id) throw new NotFoundException(`podcast ${ref} not found`)
    return id
  }
}
