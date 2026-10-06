import { BadRequestException, ConflictException, Inject, Injectable, NotFoundException } from "@nestjs/common"
import { sql } from "drizzle-orm"
import { type PageQuery, offsetOf, toPage } from "../../common/pagination"
import { isForeignKeyViolation } from "../../common/rows"
import { DRIZZLE, type Database } from "../../database/database.module"
import { assertSlugFree, freeSlug } from "../common/slugs"
import { type AdminPodcast, type PodcastInput } from "./podcasts.dto"
import { AdminPodcastsRepository } from "./podcasts.repository"

type Tx = Parameters<Parameters<Database["transaction"]>[0]>[0]

@Injectable()
export class AdminPodcastsService {
  constructor(
    @Inject(DRIZZLE) private readonly db: Database,
    private readonly repo: AdminPodcastsRepository,
  ) {}

  async page(q: PageQuery & { q?: string }) {
    const { items, total } = await this.repo.page({ q: q.q, limit: q.pageSize, offset: offsetOf(q) })
    return toPage(items, total, q)
  }

  async get(id: string): Promise<AdminPodcast> {
    const podcast = await this.repo.get(id)
    if (!podcast) throw new NotFoundException(`podcast ${id} not found`)
    return podcast
  }

  async create(input: PodcastInput & { name: string }): Promise<AdminPodcast> {
    const id = await this.db.transaction(async (tx) => {
      const slug = input.slug ?? (await freeSlug(tx, "podcasts", input.name))
      if (input.slug) await assertSlugFree(tx, "podcasts", input.slug)
      const res = await tx.execute<{ id: string }>(sql`
        INSERT INTO app.podcasts (slug, name, description, cover_url, published_at)
        VALUES (${slug}, ${input.name}, ${input.description ?? null}, ${input.coverUrl ?? null},
                ${input.published ? sql`now()` : sql`NULL`})
        RETURNING id
      `)
      const id = res.rows[0]!.id
      if (input.categoryIds) await this.setCategories(tx, id, input.categoryIds)
      return id
    })
    return this.get(id)
  }

  async update(id: string, input: PodcastInput): Promise<AdminPodcast> {
    await this.get(id)
    await this.db.transaction(async (tx) => {
      if (input.slug) await assertSlugFree(tx, "podcasts", input.slug, id)
      const sets = [
        input.name !== undefined && sql`name = ${input.name}`,
        input.slug !== undefined && sql`slug = ${input.slug}`,
        input.description !== undefined && sql`description = ${input.description}`,
        input.coverUrl !== undefined && sql`cover_url = ${input.coverUrl}`,
        input.published === true && sql`published_at = coalesce(published_at, now())`,
        input.published === false && sql`published_at = NULL`,
      ].filter((s) => s !== false)
      await tx.execute(
        sql`UPDATE app.podcasts SET ${sql.join([...sets, sql`updated_at = now()`], sql`, `)} WHERE id = ${id}`,
      )
      if (input.categoryIds) await this.setCategories(tx, id, input.categoryIds)
    })
    return this.get(id)
  }

  /** A podcast with episodes cannot go (delete or move them first). */
  async remove(id: string): Promise<void> {
    try {
      await this.db.execute(sql`DELETE FROM app.podcasts WHERE id = ${id}`)
    } catch (err) {
      if (isForeignKeyViolation(err))
        throw new ConflictException("the podcast has episodes: delete them first")
      throw err
    }
  }

  private async setCategories(tx: Tx, podcastId: string, categoryIds: string[]): Promise<void> {
    const ids = [...new Set(categoryIds)]
    if (ids.length) {
      const found = await tx.execute<{ id: string }>(
        sql`SELECT id FROM app.categories WHERE id = ANY(${`{${ids.join(",")}}`}::uuid[])`,
      )
      if (found.rows.length !== ids.length) throw new BadRequestException("unknown category id")
    }
    await tx.execute(sql`DELETE FROM app.podcast_categories WHERE podcast_id = ${podcastId}`)
    for (const [position, categoryId] of ids.entries()) {
      await tx.execute(sql`
        INSERT INTO app.podcast_categories (podcast_id, category_id, position) VALUES (${podcastId}, ${categoryId}, ${position})
      `)
    }
  }
}
