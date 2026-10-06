import { sql } from "drizzle-orm"
import { MigrateStrapiService } from "../src/strapi/migrate-strapi.service"
import { createTestApp, LEGACY, type TestApp } from "./helpers"

/** `migrate-strapi` against the real Strapi v5 rows of the fixture (public schema of the same database). */
describe("migrate-strapi (e2e)", () => {
  let t: TestApp
  let migrator: MigrateStrapiService

  const counts = async () =>
    (
      await t.db.execute<Record<string, number>>(sql`
        SELECT (SELECT count(*)::int FROM app.podcasts WHERE legacy_document_id IS NOT NULL) AS podcasts,
               (SELECT count(*)::int FROM app.episodes WHERE legacy_document_id IS NOT NULL) AS episodes,
               (SELECT count(*)::int FROM app.episode_levels l JOIN app.episodes e ON e.id = l.episode_id
                WHERE e.legacy_document_id IS NOT NULL) AS levels,
               (SELECT count(*)::int FROM app.categories WHERE legacy_document_id IS NOT NULL) AS categories,
               (SELECT count(*)::int FROM app.lists WHERE legacy_document_id IS NOT NULL) AS lists
      `)
    ).rows[0]!
  // Every legacy table, as text: proves the migration never writes to them.
  const legacyFingerprint = async () =>
    (
      await t.db.execute<{ h: string }>(sql`
        SELECT md5(string_agg(x, '|' ORDER BY x)) AS h FROM (
          SELECT 'p' || row_to_json(p)::text AS x FROM public.podcasts p
          UNION ALL SELECT 'e' || row_to_json(e)::text FROM public.episodes e
          UNION ALL SELECT 'l' || row_to_json(l)::text FROM public.components_shared_levels l
          UNION ALL SELECT 'c' || row_to_json(c)::text FROM public.episodes_cmps c
          UNION ALL SELECT 's' || row_to_json(s)::text FROM public.subscriptions s
          UNION ALL SELECT 'v' || row_to_json(v)::text FROM public.vocab_words v
        ) rows
      `)
    ).rows[0]!.h

  beforeAll(async () => {
    t = await createTestApp()
    migrator = t.app.get(MigrateStrapiService)
    // Start from no migrated content (other specs migrate in their own setup).
    await t.db.execute(sql`DELETE FROM app.home_config`)
    await t.db.execute(sql`DELETE FROM app.lists WHERE legacy_document_id IS NOT NULL`)
    await t.db.execute(sql`DELETE FROM app.episodes WHERE legacy_document_id IS NOT NULL`)
    await t.db.execute(sql`DELETE FROM app.podcasts WHERE legacy_document_id IS NOT NULL`)
    await t.db.execute(sql`DELETE FROM app.categories WHERE legacy_document_id IS NOT NULL`)
  })

  afterAll(async () => {
    await migrator.run({ dryRun: false })
    await t.close()
  })

  it("--dry-run reports what it would do and writes nothing", async () => {
    const fingerprint = await legacyFingerprint()
    const report = await migrator.run({ dryRun: true })
    expect(report).toMatchObject({
      dryRun: true,
      source: { categories: 2, podcasts: 2, episodes: 3, lists: 2, missingTables: [] },
      categories: { inserted: 2, updated: 0 },
      podcasts: { inserted: 2, updated: 0, withoutCover: 0, relativeCovers: 0 },
      podcastCategories: 3,
      episodes: { inserted: 3, updated: 0, skippedNoPodcast: 0 },
      levels: {
        upserted: 6,
        removed: 0,
        skippedUnknownLevel: 0,
        skippedNoAudio: 1,
        duplicates: 1,
        msTranscripts: 1,
      },
      lists: { inserted: 2, updated: 0 },
      listEpisodes: 3,
      homeConfig: { slider: 2, homeLists: 2, exploreLists: 1, unmapped: 0 },
    })
    expect(await counts()).toEqual({ podcasts: 0, episodes: 0, levels: 0, categories: 0, lists: 0 })
    expect(await legacyFingerprint()).toBe(fingerprint)
  })

  it("runs, then re-runs as updates (upsert by documentId)", async () => {
    const fingerprint = await legacyFingerprint()
    const first = await migrator.run({ dryRun: false })
    expect(first.episodes).toEqual({ inserted: 3, updated: 0, skippedNoPodcast: 0 })
    const after = await counts()
    expect(after).toEqual({ podcasts: 2, episodes: 3, levels: 6, categories: 2, lists: 2 })
    const second = await migrator.run({ dryRun: false })
    expect(second).toMatchObject({
      podcasts: { inserted: 0, updated: 2 },
      episodes: { inserted: 0, updated: 3 },
      categories: { inserted: 0, updated: 2 },
      lists: { inserted: 0, updated: 2 },
    })
    expect(await counts()).toEqual(after)
    expect(await legacyFingerprint()).toBe(fingerprint)
    const slugs = await t.db.execute<{ slug: string }>(
      sql`SELECT slug FROM app.podcasts WHERE legacy_document_id IS NOT NULL ORDER BY slug`,
    )
    expect(slugs.rows.map((r) => r.slug)).toEqual(["around-the-world", "cafe-science"])
    // The back catalog is already announced: its followers are never pushed.
    const pending = await t.db.execute<{ n: number }>(sql`
      SELECT count(*)::int AS n FROM app.episodes
      WHERE legacy_document_id IS NOT NULL AND followers_notified_at IS DISTINCT FROM published_at`)
    expect(pending.rows[0]!.n).toBe(0)
  })

  it("picks up Strapi edits: a changed transcript drops its translations, a removed level goes", async () => {
    const episode = (
      await t.db.execute<{ id: string }>(
        sql`SELECT id FROM app.episodes WHERE legacy_document_id = ${LEGACY.lisbon}`,
      )
    ).rows[0]!.id
    await t.db.execute(sql`
      INSERT INTO app.translations (episode_id, level, target, chunks)
      VALUES (${episode}, 'bg', 'tr', '["a", "b"]'), (${episode}, 'in', 'tr', '["a", "b"]')
    `)
    // Simulate an editor in Strapi (the published row of Lisbon Mornings is row 2: components 4, 5, 6).
    await t.db.execute(
      sql`UPDATE public.components_shared_levels SET transcript = '{"chunks": [{"text": "Hi.", "timestamp": [0, 1]}]}' WHERE id = 4`,
    )
    await t.db.execute(sql`UPDATE public.episodes_cmps SET entity_id = -2 WHERE id = 6`)
    try {
      const report = await migrator.run({ dryRun: false })
      expect(report.levels).toMatchObject({ removed: 1, translationsDropped: 1 })
      const levels = await t.db.execute<{ level: string; duration_sec: number }>(
        sql`SELECT level, duration_sec FROM app.episode_levels WHERE episode_id = ${episode} ORDER BY level`,
      )
      expect(levels.rows).toEqual([
        { level: "bg", duration_sec: 1 },
        { level: "in", duration_sec: 61.25 },
      ])
      const left = await t.db.execute<{ level: string }>(
        sql`SELECT level FROM app.translations WHERE episode_id = ${episode}`,
      )
      expect(left.rows).toEqual([{ level: "in" }])
    } finally {
      // Back to the fixture as Strapi wrote it.
      await t.db.execute(sql`UPDATE public.episodes_cmps SET entity_id = 2 WHERE id = 6`)
      await t.db.execute(sql`
        UPDATE public.components_shared_levels SET transcript = (SELECT transcript FROM public.components_shared_levels WHERE id = 1)
        WHERE id = 4
      `)
    }
    await migrator.run({ dryRun: false })
    expect((await counts()).levels).toBe(6)
  })

  it("reads Strapi's zone-less timestamps in the given time zone", async () => {
    const published = async () =>
      (
        await t.db.execute<{ at: string }>(
          sql`SELECT published_at::text AS at FROM app.episodes WHERE legacy_document_id = ${LEGACY.lisbon}`,
        )
      ).rows[0]!.at
    await migrator.run({ dryRun: false, timezone: "UTC" })
    const utc = new Date(await published()).getTime()
    await migrator.run({ dryRun: false, timezone: "Europe/Istanbul" })
    expect(utc - new Date(await published()).getTime()).toBe(3 * 3600_000)
    await migrator.run({ dryRun: false })
  })
})
