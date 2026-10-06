import { BadRequestException, Inject, Injectable, NotFoundException } from "@nestjs/common"
import { sql } from "drizzle-orm"
import { iso, isoAt, type Stamp } from "../../common/rows"
import { DRIZZLE, type Database } from "../../database/database.module"
import { assertSlugFree, freeSlug } from "../common/slugs"
import { publishStatus } from "../common/status"
import { type AdminEpisodeRef, type AdminList, type AdminListDetail, type ListInput } from "./lists.dto"

type Row = {
  id: string
  slug: string
  name: string
  description: string | null
  episode_count: number
  legacy_document_id: string | null
  created_at: Date | string
  updated_at: Date | string
}

const SELECT = sql`
  SELECT l.id, l.slug, l.name, l.description, l.legacy_document_id, l.created_at, l.updated_at,
         (SELECT count(*)::int FROM app.list_episodes le WHERE le.list_id = l.id) AS episode_count
  FROM app.lists l`

const toList = (r: Row): AdminList => ({
  id: r.id,
  slug: r.slug,
  name: r.name,
  description: r.description,
  episodeCount: r.episode_count,
  legacyDocumentId: r.legacy_document_id,
  createdAt: isoAt(r.created_at),
  updatedAt: isoAt(r.updated_at),
})

export type EpisodeRefRow = {
  id: string
  title: string
  number: number | null
  podcast_id: string
  podcast_name: string
  cover_url: string | null
  published_at: Stamp
}

export const EPISODE_REF_COLUMNS = sql`e.id, e.title, e.number, p.id AS podcast_id, p.name AS podcast_name, e.cover_url,
  e.published_at`

export const toEpisodeRef = (r: EpisodeRefRow): AdminEpisodeRef => ({
  id: r.id,
  title: r.title,
  number: r.number,
  podcast: { id: r.podcast_id, name: r.podcast_name },
  coverUrl: r.cover_url,
  status: publishStatus(r.published_at),
  publishedAt: iso(r.published_at),
})

@Injectable()
export class AdminListsService {
  constructor(@Inject(DRIZZLE) private readonly db: Database) {}

  async list(): Promise<AdminList[]> {
    const res = await this.db.execute<Row>(sql`${SELECT} ORDER BY l.name`)
    return res.rows.map(toList)
  }

  async get(id: string): Promise<AdminListDetail> {
    const res = await this.db.execute<Row>(sql`${SELECT} WHERE l.id = ${id}`)
    if (!res.rows[0]) throw new NotFoundException(`list ${id} not found`)
    const episodes = await this.db.execute<EpisodeRefRow>(sql`
      SELECT ${EPISODE_REF_COLUMNS}
      FROM app.list_episodes le JOIN app.episodes e ON e.id = le.episode_id JOIN app.podcasts p ON p.id = e.podcast_id
      WHERE le.list_id = ${id} ORDER BY le.position
    `)
    return { ...toList(res.rows[0]), episodes: episodes.rows.map(toEpisodeRef) }
  }

  async create(input: ListInput & { name: string }): Promise<AdminListDetail> {
    const id = await this.db.transaction(async (tx) => {
      if (input.slug) await assertSlugFree(tx, "lists", input.slug)
      const slug = input.slug ?? (await freeSlug(tx, "lists", input.name))
      const res = await tx.execute<{ id: string }>(sql`
        INSERT INTO app.lists (slug, name, description) VALUES (${slug}, ${input.name}, ${input.description ?? null})
        RETURNING id
      `)
      return res.rows[0]!.id
    })
    return this.get(id)
  }

  async update(id: string, input: ListInput): Promise<AdminListDetail> {
    await this.get(id)
    if (input.slug) await assertSlugFree(this.db, "lists", input.slug, id)
    const sets = [
      input.name !== undefined && sql`name = ${input.name}`,
      input.slug !== undefined && sql`slug = ${input.slug}`,
      input.description !== undefined && sql`description = ${input.description}`,
    ].filter((s) => s !== false)
    await this.db.execute(
      sql`UPDATE app.lists SET ${sql.join([...sets, sql`updated_at = now()`], sql`, `)} WHERE id = ${id}`,
    )
    return this.get(id)
  }

  /** The list, and its place on the home and explore screens. */
  async remove(id: string): Promise<void> {
    await this.db.transaction(async (tx) => {
      await tx.execute(sql`
        UPDATE app.home_config SET home_list_ids = array_remove(home_list_ids, ${id}::uuid),
                                   explore_list_ids = array_remove(explore_list_ids, ${id}::uuid),
                                   updated_at = now()
        WHERE ${id}::uuid = ANY(home_list_ids) OR ${id}::uuid = ANY(explore_list_ids)
      `)
      await tx.execute(sql`DELETE FROM app.lists WHERE id = ${id}`)
    })
  }

  /** Replaces the list's episodes with `episodeIds`, in that order. */
  async setEpisodes(id: string, episodeIds: string[]): Promise<AdminListDetail> {
    await this.get(id)
    const ids = [...new Set(episodeIds)]
    await this.db.transaction(async (tx) => {
      if (ids.length) {
        const found = await tx.execute<{ id: string }>(
          sql`SELECT id FROM app.episodes WHERE id = ANY(${`{${ids.join(",")}}`}::uuid[])`,
        )
        if (found.rows.length !== ids.length) throw new BadRequestException("unknown episode id")
      }
      await tx.execute(sql`DELETE FROM app.list_episodes WHERE list_id = ${id}`)
      for (const [position, episodeId] of ids.entries()) {
        await tx.execute(
          sql`INSERT INTO app.list_episodes (list_id, episode_id, position) VALUES (${id}, ${episodeId}, ${position})`,
        )
      }
      await tx.execute(sql`UPDATE app.lists SET updated_at = now() WHERE id = ${id}`)
    })
    return this.get(id)
  }
}
