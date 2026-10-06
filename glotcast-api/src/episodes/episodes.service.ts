import { Injectable, NotFoundException, UnauthorizedException } from "@nestjs/common"
import { type SQL, sql } from "drizzle-orm"
import { type AuthClaims } from "../auth/auth-verifier"
import { type EpisodeDetail, type Transcript } from "../catalog/catalog.dto"
import { CatalogRepository, hasLevel, TRENDING_JOIN } from "../catalog/catalog.repository"
import { type PageQuery, offsetOf, toPage } from "../common/pagination"
import { type Level } from "../database/schema/app"
import { ProgressRepository } from "../me/progress.repository"
import { PodcastsRepository } from "../podcasts/podcasts.repository"
import { EpisodesRepository } from "./episodes.repository"

export type Feed = "latest" | "following" | "trending"

export const LATEST_ORDER = sql`e.published_at DESC, e.id DESC`
/** Most distinct listeners over the last 14 days; episodes nobody listened to follow, newest first. */
export const TRENDING_ORDER = sql`coalesce(tr.listeners, 0) DESC, e.published_at DESC, e.id DESC`

@Injectable()
export class EpisodesService {
  constructor(
    private readonly catalog: CatalogRepository,
    private readonly episodes: EpisodesRepository,
    private readonly podcasts: PodcastsRepository,
    private readonly progress: ProgressRepository,
  ) {}

  async feed(user: AuthClaims | null, q: PageQuery & { feed: Feed; level?: Level }) {
    let join: SQL | undefined
    let orderBy = LATEST_ORDER
    if (q.feed === "following") {
      if (!user) throw new UnauthorizedException("sign in to see the podcasts you follow")
      join = sql`JOIN app.follows f ON f.podcast_id = e.podcast_id AND f.user_id = ${user.userId}`
    } else if (q.feed === "trending") {
      join = TRENDING_JOIN
      orderBy = TRENDING_ORDER
    }
    const where = q.level ? hasLevel(q.level) : undefined
    const [items, total] = await Promise.all([
      this.catalog.episodes({ join, where, orderBy, limit: q.pageSize, offset: offsetOf(q) }),
      this.catalog.countEpisodes({ join: q.feed === "following" ? join : undefined, where }),
    ])
    return toPage(items, total, q)
  }

  async detail(user: AuthClaims | null, ref: string): Promise<EpisodeDetail> {
    const id = await this.resolve(ref)
    const episode = await this.episodes.visible(id)
    if (!episode) throw new NotFoundException(`episode ${ref} not found`)
    const [podcast, levels, isFavorite, progress] = await Promise.all([
      this.podcasts.visible(episode.podcast.id),
      this.episodes.playableLevels(id),
      user ? this.episodes.isFavorite(user.userId, id) : Promise.resolve(false),
      user ? this.progress.forEpisode(user.userId, id) : Promise.resolve([]),
    ])
    if (!podcast) throw new NotFoundException(`episode ${ref} not found`)
    const summary = {
      id: podcast.id,
      slug: podcast.slug,
      name: podcast.name,
      coverUrl: podcast.coverUrl,
      episodeCount: podcast.episodeCount,
    }
    return { ...episode, podcast: summary, levels, isFavorite, progress }
  }

  async transcript(ref: string, level: Level): Promise<Transcript> {
    const id = await this.resolve(ref)
    const stored = await this.episodes.transcript(id, level)
    if (!stored) throw new NotFoundException(`episode ${ref} has no ${level} level`)
    return { episodeId: id, level, chunks: stored.chunks ?? [] }
  }

  private async resolve(ref: string): Promise<string> {
    const id = await this.catalog.episodeIdOf(ref)
    if (!id) throw new NotFoundException(`episode ${ref} not found`)
    return id
  }
}
