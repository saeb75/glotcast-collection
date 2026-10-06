import { Inject, Injectable, Logger } from "@nestjs/common"
import { sql } from "drizzle-orm"
import { Pool } from "pg"
import { freeSlug, SLUG_RE } from "../admin/common/slugs"
import { AppConfig } from "../config/app-config.service"
import { DRIZZLE, type Database, sslConfig } from "../database/database.module"
import { absoluteUrl, mapLevels } from "./strapi-mapping"
import { readStrapi, type StrapiContent } from "./strapi-reader"

type Tx = Parameters<Parameters<Database["transaction"]>[0]>[0]

export interface MigrationReport {
  dryRun: boolean
  source: { categories: number; podcasts: number; episodes: number; lists: number; missingTables: string[] }
  categories: { inserted: number; updated: number }
  podcasts: { inserted: number; updated: number; withoutCover: number; relativeCovers: number }
  podcastCategories: number
  episodes: { inserted: number; updated: number; skippedNoPodcast: number }
  levels: {
    upserted: number
    removed: number
    skippedUnknownLevel: number
    skippedNoAudio: number
    duplicates: number
    msTranscripts: number
    translationsDropped: number
  }
  lists: { inserted: number; updated: number }
  listEpisodes: number
  homeConfig: { slider: number; homeLists: number; exploreLists: number; unmapped: number } | null
}

class DryRunRollback extends Error {}

/**
 * `migrate-strapi [--dry-run]`: copies Strapi's PUBLISHED content (categories, podcasts and their categories,
 * episodes and their levels, lists, the project config) into schema app. Upserts by `legacy_document_id`, so it
 * can be re-run until the cutover (re-running overwrites edits made here to migrated rows). The Strapi database
 * (STRAPI_DATABASE_URL, default DATABASE_URL) is read in a READ ONLY transaction; ours is written in one
 * transaction — rolled back with --dry-run, after every write ran, so the counts are real.
 */
@Injectable()
export class MigrateStrapiService {
  private readonly logger = new Logger(MigrateStrapiService.name)

  constructor(
    @Inject(DRIZZLE) private readonly db: Database,
    private readonly config: AppConfig,
  ) {}

  async run(options: { dryRun: boolean; timezone?: string }): Promise<MigrationReport> {
    const content = await this.read(options.timezone ?? "UTC")
    let report: MigrationReport | null = null
    try {
      await this.db.transaction(async (tx) => {
        report = await this.write(tx, content, options.dryRun)
        if (options.dryRun) throw new DryRunRollback()
      })
    } catch (err) {
      if (!(err instanceof DryRunRollback)) throw err
    }
    return report!
  }

  private async read(timezone: string): Promise<StrapiContent> {
    const pool = new Pool({
      connectionString: this.config.get("STRAPI_DATABASE_URL") ?? this.config.get("DATABASE_URL"),
      max: 1,
      ssl: sslConfig(this.config),
      application_name: "glotcast-migrate-strapi",
    })
    const client = await pool.connect()
    try {
      await client.query("BEGIN TRANSACTION READ ONLY")
      try {
        return await readStrapi(client, timezone)
      } finally {
        await client.query("ROLLBACK")
      }
    } finally {
      client.release()
      await pool.end()
    }
  }

  private async write(tx: Tx, content: StrapiContent, dryRun: boolean): Promise<MigrationReport> {
    const base = this.config.get("STRAPI_PUBLIC_URL") ?? null
    const report: MigrationReport = {
      dryRun,
      source: {
        categories: content.categories.length,
        podcasts: content.podcasts.length,
        episodes: content.episodes.length,
        lists: content.lists.length,
        missingTables: content.missingTables,
      },
      categories: { inserted: 0, updated: 0 },
      podcasts: { inserted: 0, updated: 0, withoutCover: 0, relativeCovers: 0 },
      podcastCategories: 0,
      episodes: { inserted: 0, updated: 0, skippedNoPodcast: 0 },
      levels: {
        upserted: 0,
        removed: 0,
        skippedUnknownLevel: 0,
        skippedNoAudio: 0,
        duplicates: 0,
        msTranscripts: 0,
        translationsDropped: 0,
      },
      lists: { inserted: 0, updated: 0 },
      listEpisodes: 0,
      homeConfig: null,
    }

    // Categories (Strapi has no order: by name).
    const categoryIds = new Map<string, string>()
    const sortedCategories = [...content.categories].sort((a, b) =>
      (a.name ?? "").localeCompare(b.name ?? ""),
    )
    for (const [position, c] of sortedCategories.entries()) {
      const name = c.name?.trim() || c.slug || "Category"
      const existing = await this.existing(tx, "categories", c.documentId)
      const slug = existing ? null : await this.slugFor(tx, "categories", c.slug, name)
      const res = await tx.execute<{ id: string; inserted: boolean }>(sql`
        INSERT INTO app.categories (slug, name, description, position, legacy_document_id)
        VALUES (${slug ?? "unused"}, ${name}, ${c.description?.trim() || null}, ${position}, ${c.documentId})
        ON CONFLICT (legacy_document_id) DO UPDATE SET name = excluded.name, description = excluded.description,
          updated_at = now()
        RETURNING id, (xmax = 0) AS inserted
      `)
      const row = res.rows[0]!
      categoryIds.set(c.documentId, row.id)
      report.categories[row.inserted ? "inserted" : "updated"] += 1
    }

    // Podcasts, then their categories (replaced from Strapi's order).
    const podcastIds = new Map<string, string>()
    for (const p of content.podcasts) {
      const name = p.name?.trim() || "Untitled podcast"
      const cover = absoluteUrl(p.imageUrl, base) ?? absoluteUrl(p.fileUrl, base)
      if (!cover) report.podcasts.withoutCover += 1
      else if (!/^https?:/i.test(cover)) report.podcasts.relativeCovers += 1
      const existing = await this.existing(tx, "podcasts", p.documentId)
      const slug = existing ? "unused" : await freeSlug(tx, "podcasts", name)
      const res = await tx.execute<{ id: string; inserted: boolean }>(sql`
        INSERT INTO app.podcasts (slug, name, description, cover_url, published_at, legacy_document_id, created_at)
        VALUES (${slug}, ${name}, ${p.description?.trim() || null}, ${cover}, ${p.publishedAt},
                ${p.documentId}, ${p.createdAt ?? p.publishedAt})
        ON CONFLICT (legacy_document_id) DO UPDATE SET name = excluded.name, description = excluded.description,
          cover_url = excluded.cover_url, published_at = excluded.published_at, updated_at = now()
        RETURNING id, (xmax = 0) AS inserted
      `)
      const row = res.rows[0]!
      podcastIds.set(p.documentId, row.id)
      report.podcasts[row.inserted ? "inserted" : "updated"] += 1

      await tx.execute(sql`DELETE FROM app.podcast_categories WHERE podcast_id = ${row.id}`)
      const linked = [...new Set(p.categoryDocumentIds)].flatMap((doc) => {
        const id = categoryIds.get(doc)
        return id ? [id] : []
      })
      for (const [position, categoryId] of linked.entries()) {
        await tx.execute(sql`
          INSERT INTO app.podcast_categories (podcast_id, category_id, position)
          VALUES (${row.id}, ${categoryId}, ${position})
        `)
        report.podcastCategories += 1
      }
    }

    // Episodes and their levels.
    const episodeIds = new Map<string, string>()
    for (const e of content.episodes) {
      const podcastId = e.podcastDocumentId ? podcastIds.get(e.podcastDocumentId) : undefined
      if (!podcastId) {
        report.episodes.skippedNoPodcast += 1
        continue
      }
      const res = await tx.execute<{ id: string; inserted: boolean }>(sql`
        INSERT INTO app.episodes (podcast_id, number, title, description, cover_url, banner_url, is_pro, published_at,
                                  legacy_document_id, created_at)
        VALUES (${podcastId}, ${e.episodeNumber}, ${e.title?.trim() || "Untitled episode"}, ${e.description?.trim() || null},
                ${absoluteUrl(e.image, base)}, ${absoluteUrl(e.bannerUrl, base)}, ${e.isPro ?? true}, ${e.publishedAt},
                ${e.documentId}, ${e.createdAt ?? e.publishedAt})
        ON CONFLICT (legacy_document_id) DO UPDATE SET podcast_id = excluded.podcast_id, number = excluded.number,
          title = excluded.title, description = excluded.description, cover_url = excluded.cover_url,
          banner_url = excluded.banner_url, is_pro = excluded.is_pro, published_at = excluded.published_at,
          updated_at = now()
        RETURNING id, (xmax = 0) AS inserted
      `)
      const row = res.rows[0]!
      episodeIds.set(e.documentId, row.id)
      report.episodes[row.inserted ? "inserted" : "updated"] += 1

      const mapped = mapLevels(e.levels, base)
      report.levels.skippedUnknownLevel += mapped.unknownLevel
      report.levels.skippedNoAudio += mapped.noAudio
      report.levels.duplicates += mapped.duplicates
      for (const level of mapped.levels) {
        if (level.transcript.milliseconds) report.levels.msTranscripts += 1
        const transcript = JSON.stringify({ chunks: level.transcript.chunks })
        // A changed transcript makes its cached translations wrong.
        const dropped = await tx.execute(sql`
          DELETE FROM app.translations t USING app.episode_levels l
          WHERE t.episode_id = ${row.id} AND t.level = ${level.level}
            AND l.episode_id = t.episode_id AND l.level = t.level AND l.transcript <> ${transcript}::jsonb
        `)
        report.levels.translationsDropped += dropped.rowCount ?? 0
        await tx.execute(sql`
          INSERT INTO app.episode_levels (episode_id, level, audio_url, duration_sec, description, transcript)
          VALUES (${row.id}, ${level.level}, ${level.audioUrl}, ${level.transcript.durationSec}, ${level.description},
                  ${transcript}::jsonb)
          ON CONFLICT (episode_id, level) DO UPDATE SET audio_url = excluded.audio_url,
            duration_sec = excluded.duration_sec, description = excluded.description,
            transcript = excluded.transcript, updated_at = now()
        `)
        report.levels.upserted += 1
      }
      const kept = mapped.levels.map((l) => l.level)
      const removed = await tx.execute(sql`
        DELETE FROM app.episode_levels WHERE episode_id = ${row.id}
        ${kept.length ? sql`AND NOT (level::text = ANY(${`{${kept.join(",")}}`}::text[]))` : sql``}
      `)
      report.levels.removed += removed.rowCount ?? 0
    }

    // Lists and their episodes (replaced, in Strapi's order).
    const listIds = new Map<string, string>()
    for (const l of content.lists) {
      const name = l.name?.trim() || l.slug || "List"
      const existing = await this.existing(tx, "lists", l.documentId)
      const slug = existing ? "unused" : await this.slugFor(tx, "lists", l.slug, name)
      const res = await tx.execute<{ id: string; inserted: boolean }>(sql`
        INSERT INTO app.lists (slug, name, description, legacy_document_id)
        VALUES (${slug}, ${name}, ${l.description?.trim() || null}, ${l.documentId})
        ON CONFLICT (legacy_document_id) DO UPDATE SET name = excluded.name, description = excluded.description,
          updated_at = now()
        RETURNING id, (xmax = 0) AS inserted
      `)
      const row = res.rows[0]!
      listIds.set(l.documentId, row.id)
      report.lists[row.inserted ? "inserted" : "updated"] += 1
      await tx.execute(sql`DELETE FROM app.list_episodes WHERE list_id = ${row.id}`)
      const episodes = [...new Set(l.episodeDocumentIds)].flatMap((doc) => {
        const id = episodeIds.get(doc)
        return id ? [id] : []
      })
      for (const [position, episodeId] of episodes.entries()) {
        await tx.execute(
          sql`INSERT INTO app.list_episodes (list_id, episode_id, position) VALUES (${row.id}, ${episodeId}, ${position})`,
        )
        report.listEpisodes += 1
      }
    }

    // The project config → home_config (left alone when Strapi has none published).
    if (content.homeConfig) {
      let unmapped = 0
      const map = (docs: string[], ids: Map<string, string>) =>
        [...new Set(docs)].flatMap((doc) => {
          const id = ids.get(doc)
          if (!id) unmapped += 1
          return id ? [id] : []
        })
      const slider = map(content.homeConfig.slider, episodeIds)
      const homeLists = map(content.homeConfig.homeLists, listIds)
      const exploreLists = map(content.homeConfig.exploreLists, listIds)
      const arr = (ids: string[]) => sql`${`{${ids.join(",")}}`}::uuid[]`
      await tx.execute(sql`
        INSERT INTO app.home_config (id, slider_episode_ids, home_list_ids, explore_list_ids, updated_at)
        VALUES (1, ${arr(slider)}, ${arr(homeLists)}, ${arr(exploreLists)}, now())
        ON CONFLICT (id) DO UPDATE SET slider_episode_ids = excluded.slider_episode_ids,
          home_list_ids = excluded.home_list_ids, explore_list_ids = excluded.explore_list_ids, updated_at = now()
      `)
      report.homeConfig = {
        slider: slider.length,
        homeLists: homeLists.length,
        exploreLists: exploreLists.length,
        unmapped,
      }
    }

    this.logger.log(dryRun ? "strapi content checked (dry run, rolled back)" : "strapi content migrated")
    return report
  }

  private async existing(
    tx: Tx,
    table: "categories" | "podcasts" | "lists",
    documentId: string,
  ): Promise<boolean> {
    const res = await tx.execute(
      sql`SELECT 1 FROM ${sql.raw(`app.${table}`)} WHERE legacy_document_id = ${documentId}`,
    )
    return res.rows.length > 0
  }

  /** Strapi's own slug when it is valid and free, else one made from the name. */
  private async slugFor(tx: Tx, table: "categories" | "lists", strapiSlug: string | null, name: string) {
    const wanted = strapiSlug?.trim().toLowerCase()
    if (wanted && SLUG_RE.test(wanted)) {
      const taken = await tx.execute(sql`SELECT 1 FROM ${sql.raw(`app.${table}`)} WHERE slug = ${wanted}`)
      if (!taken.rows.length) return wanted
    }
    return freeSlug(tx, table, wanted || name)
  }
}
