import { BadRequestException, Inject, Injectable, NotFoundException } from "@nestjs/common"
import { sql } from "drizzle-orm"
import { type PageQuery, offsetOf, toPage } from "../../common/pagination"
import { isForeignKeyViolation } from "../../common/rows"
import { DRIZZLE, type Database } from "../../database/database.module"
import { type Level } from "../../database/schema/app"
import { type AdminEpisode, type AdminEpisodeDetail, type EpisodeInput, type PutLevel } from "./episodes.dto"
import { AdminEpisodesRepository, type EpisodeFilter } from "./episodes.repository"

@Injectable()
export class AdminEpisodesService {
  constructor(
    @Inject(DRIZZLE) private readonly db: Database,
    private readonly repo: AdminEpisodesRepository,
  ) {}

  async page(q: PageQuery & EpisodeFilter) {
    const { items, total } = await this.repo.page({ ...q, limit: q.pageSize, offset: offsetOf(q) })
    return toPage(items, total, q)
  }

  async get(id: string): Promise<AdminEpisode> {
    const episode = await this.repo.get(id)
    if (!episode) throw new NotFoundException(`episode ${id} not found`)
    return episode
  }

  async detail(id: string): Promise<AdminEpisodeDetail> {
    const episode = await this.repo.detail(id)
    if (!episode) throw new NotFoundException(`episode ${id} not found`)
    return episode
  }

  async create(input: EpisodeInput & { podcastId: string; title: string }): Promise<AdminEpisodeDetail> {
    try {
      const res = await this.db.execute<{ id: string }>(sql`
        INSERT INTO app.episodes (podcast_id, number, title, description, cover_url, banner_url, is_pro, published_at)
        VALUES (${input.podcastId}, ${input.number ?? null}, ${input.title}, ${input.description ?? null},
                ${input.coverUrl ?? null}, ${input.bannerUrl ?? null}, ${input.isPro ?? true}, ${input.publishedAt ?? null})
        RETURNING id
      `)
      return this.detail(res.rows[0]!.id)
    } catch (err) {
      if (isForeignKeyViolation(err)) throw new BadRequestException(`podcast ${input.podcastId} not found`)
      throw err
    }
  }

  async update(id: string, input: EpisodeInput): Promise<AdminEpisodeDetail> {
    await this.get(id)
    const sets = [
      input.podcastId !== undefined && sql`podcast_id = ${input.podcastId}`,
      input.title !== undefined && sql`title = ${input.title}`,
      input.number !== undefined && sql`number = ${input.number}`,
      input.description !== undefined && sql`description = ${input.description}`,
      input.coverUrl !== undefined && sql`cover_url = ${input.coverUrl}`,
      input.bannerUrl !== undefined && sql`banner_url = ${input.bannerUrl}`,
      input.isPro !== undefined && sql`is_pro = ${input.isPro}`,
      input.publishedAt !== undefined && sql`published_at = ${input.publishedAt}`,
    ].filter((s) => s !== false)
    try {
      await this.db.execute(
        sql`UPDATE app.episodes SET ${sql.join([...sets, sql`updated_at = now()`], sql`, `)} WHERE id = ${id}`,
      )
    } catch (err) {
      if (isForeignKeyViolation(err)) throw new BadRequestException(`podcast ${input.podcastId} not found`)
      throw err
    }
    return this.detail(id)
  }

  /** The episode, its levels, its place in lists and the slider, and everyone's progress on it. */
  async remove(id: string): Promise<void> {
    await this.db.transaction(async (tx) => {
      await tx.execute(sql`
        UPDATE app.home_config SET slider_episode_ids = array_remove(slider_episode_ids, ${id}::uuid), updated_at = now()
        WHERE ${id}::uuid = ANY(slider_episode_ids)
      `)
      await tx.execute(sql`DELETE FROM app.episodes WHERE id = ${id}`)
    })
  }

  /** Live from now (a draft or a scheduled episode); an already published one keeps its date. */
  async publish(id: string): Promise<AdminEpisode> {
    await this.get(id)
    await this.db.execute(sql`
      UPDATE app.episodes SET published_at = CASE WHEN published_at IS NULL OR published_at > now() THEN now()
                                                    ELSE published_at END,
                              updated_at = now()
      WHERE id = ${id}
    `)
    return this.get(id)
  }

  async unpublish(id: string): Promise<AdminEpisode> {
    await this.get(id)
    await this.db.execute(
      sql`UPDATE app.episodes SET published_at = NULL, updated_at = now() WHERE id = ${id}`,
    )
    return this.get(id)
  }

  /** Creates or replaces one level; its cached translations are dropped (the chunks changed). */
  async putLevel(id: string, level: Level, body: PutLevel): Promise<AdminEpisodeDetail> {
    await this.get(id)
    const transcript = JSON.stringify({ chunks: body.transcript.chunks })
    await this.db.transaction(async (tx) => {
      await tx.execute(sql`
        INSERT INTO app.episode_levels (episode_id, level, audio_url, duration_sec, description, transcript)
        VALUES (${id}, ${level}, ${body.audioUrl}, ${body.durationSec}, ${body.description ?? null}, ${transcript}::jsonb)
        ON CONFLICT (episode_id, level) DO UPDATE SET
          audio_url = excluded.audio_url, duration_sec = excluded.duration_sec, description = excluded.description,
          transcript = excluded.transcript, updated_at = now()
      `)
      await tx.execute(sql`DELETE FROM app.translations WHERE episode_id = ${id} AND level = ${level}`)
      await tx.execute(sql`UPDATE app.episodes SET updated_at = now() WHERE id = ${id}`)
    })
    return this.detail(id)
  }

  async deleteLevel(id: string, level: Level): Promise<void> {
    await this.db.transaction(async (tx) => {
      await tx.execute(sql`DELETE FROM app.episode_levels WHERE episode_id = ${id} AND level = ${level}`)
      await tx.execute(sql`DELETE FROM app.translations WHERE episode_id = ${id} AND level = ${level}`)
    })
  }
}
