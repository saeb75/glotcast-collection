import { type PoolClient } from "pg"
import { type StrapiLevelRow } from "./strapi-mapping"

/**
 * Reads the published content of a Strapi v5 database (schema public). Strapi v5 keeps a draft row and a
 * published row per `document_id`; only rows with `published_at` set are read, and links are followed from the
 * published rows. Relations are mapped through `document_id`, never row ids (a republish recreates the published
 * row; a subscription links to the draft and the published row alike). Timestamps are `timestamp without time
 * zone` written in the Strapi server's time zone (`timezone`).
 *
 * The caller opens the client in a READ ONLY transaction: nothing here can write.
 */
export interface StrapiPodcast {
  rowId: number
  documentId: string
  name: string | null
  description: string | null
  imageUrl: string | null
  fileUrl: string | null
  publishedAt: Date
  createdAt: Date | null
  categoryDocumentIds: string[]
}

export interface StrapiCategory {
  documentId: string
  name: string | null
  slug: string | null
  description: string | null
}

export interface StrapiEpisode {
  rowId: number
  documentId: string
  title: string | null
  description: string | null
  image: string | null
  bannerUrl: string | null
  episodeNumber: number | null
  isPro: boolean | null
  publishedAt: Date
  createdAt: Date | null
  podcastDocumentId: string | null
  levels: StrapiLevelRow[]
}

export interface StrapiList {
  documentId: string
  name: string | null
  slug: string | null
  description: string | null
  episodeDocumentIds: string[]
}

export interface StrapiHomeConfig {
  slider: string[]
  homeLists: string[]
  exploreLists: string[]
}

export interface StrapiContent {
  categories: StrapiCategory[]
  podcasts: StrapiPodcast[]
  episodes: StrapiEpisode[]
  lists: StrapiList[]
  homeConfig: StrapiHomeConfig | null
  /** Strapi tables this database lacks (an older schema): what depends on them is skipped. */
  missingTables: string[]
}

const TABLES = [
  "podcasts",
  "categories",
  "podcasts_categories_lnk",
  "files",
  "files_related_mph",
  "episodes",
  "episodes_podcast_lnk",
  "episodes_cmps",
  "components_shared_levels",
  "lists",
  "lists_episodes_lnk",
  "project_configs",
  "project_configs_slider_lnk",
  "project_configs_home_lists_lnk",
  "project_configs_explore_lists_lnk",
] as const
type Table = (typeof TABLES)[number]

/** The newest published row of each document. */
const published = (table: string, columns: string) => `
  SELECT DISTINCT ON (t.document_id) ${columns}
  FROM public.${table} t
  WHERE t.published_at IS NOT NULL AND t.document_id IS NOT NULL
  ORDER BY t.document_id, t.published_at DESC, t.id DESC`

export async function readStrapi(client: PoolClient, timezone = "UTC"): Promise<StrapiContent> {
  const present = await client.query<Record<Table, string | null>>(
    `SELECT ${TABLES.map((t) => `to_regclass('public.${t}')::text AS ${t}`).join(", ")}`,
  )
  const has = (t: Table) => Boolean(present.rows[0]?.[t])
  const missingTables = TABLES.filter((t) => !has(t))
  if (!has("podcasts") || !has("episodes")) {
    throw new Error("this database has no Strapi podcasts/episodes tables (check STRAPI_DATABASE_URL)")
  }
  const tz = (column: string) => `(${column} AT TIME ZONE $1)`

  const categories = has("categories")
    ? (
        await client.query<StrapiCategory>(
          published("categories", `t.document_id AS "documentId", t.name, t.slug, t.description`),
        )
      ).rows
    : []

  const fileUrl =
    has("files") && has("files_related_mph")
      ? `(SELECT f.url FROM public.files_related_mph m JOIN public.files f ON f.id = m.file_id
          WHERE m.related_id = t.id AND m.related_type = 'api::podcast.podcast' AND m.field = 'image'
          ORDER BY m."order", m.id LIMIT 1)`
      : "NULL"
  const categoryDocs =
    has("podcasts_categories_lnk") && has("categories")
      ? `ARRAY(SELECT c.document_id FROM public.podcasts_categories_lnk pc JOIN public.categories c ON c.id = pc.category_id
             WHERE pc.podcast_id = t.id ORDER BY pc.category_ord, pc.id)`
      : `ARRAY[]::text[]`
  const podcasts = (
    await client.query<StrapiPodcast>(
      published(
        "podcasts",
        `t.id AS "rowId", t.document_id AS "documentId", t.name, t.description, t.image_url AS "imageUrl",
         ${fileUrl} AS "fileUrl", ${tz("t.published_at")} AS "publishedAt", ${tz("t.created_at")} AS "createdAt",
         ${categoryDocs} AS "categoryDocumentIds"`,
      ),
      [timezone],
    )
  ).rows

  const podcastDoc = has("episodes_podcast_lnk")
    ? `(SELECT p.document_id FROM public.episodes_podcast_lnk l JOIN public.podcasts p ON p.id = l.podcast_id
        WHERE l.episode_id = t.id ORDER BY l.id LIMIT 1)`
    : "NULL"
  const episodes = (
    await client.query<Omit<StrapiEpisode, "levels">>(
      published(
        "episodes",
        `t.id AS "rowId", t.document_id AS "documentId", t.title, t.description, t.image, t.banner_url AS "bannerUrl",
         t.episode_number AS "episodeNumber", t.is_pro AS "isPro", ${tz("t.published_at")} AS "publishedAt",
         ${tz("t.created_at")} AS "createdAt", ${podcastDoc} AS "podcastDocumentId"`,
      ),
      [timezone],
    )
  ).rows.map((e) => ({ ...e, levels: [] as StrapiLevelRow[] }))

  if (has("episodes_cmps") && has("components_shared_levels") && episodes.length) {
    const levels = await client.query<StrapiLevelRow & { entityId: number }>(
      `SELECT c.entity_id AS "entityId", c."order", l.level, l.url, l.transcript, l.description
       FROM public.episodes_cmps c JOIN public.components_shared_levels l ON l.id = c.cmp_id
       WHERE c.component_type = 'shared.level' AND lower(c.field) = 'levels' AND c.entity_id = ANY($1::int[])
       ORDER BY c.entity_id, c."order", c.id`,
      [episodes.map((e) => e.rowId)],
    )
    const byRow = new Map(episodes.map((e) => [e.rowId, e]))
    for (const { entityId, ...row } of levels.rows) byRow.get(entityId)?.levels.push(row)
  }

  const listEpisodes = has("lists_episodes_lnk")
    ? `ARRAY(SELECT e.document_id FROM public.lists_episodes_lnk le JOIN public.episodes e ON e.id = le.episode_id
             WHERE le.list_id = t.id ORDER BY le.episode_ord, le.id)`
    : `ARRAY[]::text[]`
  const lists = has("lists")
    ? (
        await client.query<StrapiList>(
          published(
            "lists",
            `t.document_id AS "documentId", t.name, t.slug, t.description, ${listEpisodes} AS "episodeDocumentIds"`,
          ),
        )
      ).rows
    : []

  let homeConfig: StrapiHomeConfig | null = null
  if (has("project_configs")) {
    const config = await client.query<{ id: number }>(
      `SELECT id FROM public.project_configs WHERE published_at IS NOT NULL ORDER BY published_at DESC, id DESC LIMIT 1`,
    )
    const id = config.rows[0]?.id
    if (id !== undefined) {
      const linked = async (table: Table, target: "episodes" | "lists", column: string, ord: string) =>
        has(table)
          ? (
              await client.query<{ document_id: string }>(
                `SELECT x.document_id FROM public.${table} k JOIN public.${target} x ON x.id = k.${column}
                 WHERE k.project_config_id = $1 ORDER BY k.${ord}, k.id`,
                [id],
              )
            ).rows.map((r) => r.document_id)
          : []
      homeConfig = {
        slider: await linked("project_configs_slider_lnk", "episodes", "episode_id", "episode_ord"),
        homeLists: await linked("project_configs_home_lists_lnk", "lists", "list_id", "list_ord"),
        exploreLists: await linked("project_configs_explore_lists_lnk", "lists", "list_id", "list_ord"),
      }
    }
  }

  return { categories, podcasts, episodes, lists, homeConfig, missingTables }
}
