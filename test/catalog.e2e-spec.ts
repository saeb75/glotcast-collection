import { randomUUID } from "node:crypto"
import { createTestApp, LEGACY, type TestApp } from "./helpers"

/** The public catalog, on content migrated from the Strapi fixture (real Strapi v5 rows). */
describe("Catalog (e2e)", () => {
  let t: TestApp
  const ids: Record<string, string> = {}
  const known = (items: { id: string }[]) => {
    const names = new Map(Object.entries(ids).map(([k, v]) => [v, k]))
    return items.flatMap((i) => (names.has(i.id) ? [names.get(i.id)!] : []))
  }

  beforeAll(async () => {
    t = await createTestApp()
    await t.migrate()
    for (const [key, doc] of Object.entries(LEGACY)) {
      const res = await t.db.execute<{ id: string }>(
        `SELECT id FROM app.episodes WHERE legacy_document_id = '${doc}' UNION ALL SELECT id FROM app.podcasts WHERE legacy_document_id = '${doc}'` as never,
      )
      if (res.rows[0]) ids[key] = res.rows[0].id
    }
  })

  afterAll(async () => {
    await t.close()
  })

  it("health and app config", async () => {
    expect((await t.http().get("/v1/health/live").expect(200)).body).toEqual({ ok: true })
    expect((await t.http().get("/v1/health/ready").expect(200)).body).toEqual({
      ok: true,
      checks: { database: "up" },
    })
    expect((await t.http().get("/v1/app/config").expect(200)).body).toEqual({
      minSupportedVersion: "1.0.0",
      latestVersion: "1.0.0",
      freePreviewSeconds: 30,
      freeTranscriptChunks: 15,
    })
  })

  it("migrated only what Strapi published", () => {
    expect(Object.keys(ids).sort()).toEqual(["aroundTheWorld", "cafeScience", "lisbon", "porto", "quantum"])
  })

  it("categories and podcasts by category", async () => {
    const categories = (await t.http().get("/v1/categories").expect(200)).body
    expect(categories).toEqual(
      expect.arrayContaining([
        expect.objectContaining({
          slug: "travel",
          name: "Travel",
          description: "Trips",
          podcastCount: 2,
          coverUrl: null,
        }),
        expect.objectContaining({ slug: "science", name: "Science", description: null, podcastCount: 1 }),
      ]),
    )
    const science = (await t.http().get("/v1/podcasts").query({ category: "science" }).expect(200)).body
    expect(science).toMatchObject({ page: 1, pageSize: 20, total: 1, hasMore: false })
    expect(science.items).toEqual([
      {
        id: ids.cafeScience,
        slug: "cafe-science",
        name: "Café Science",
        coverUrl: "https://panel.example.com/uploads/cafe_science_abc.png",
        episodeCount: 1,
      },
    ])
    const paged = (await t.http().get("/v1/podcasts").query({ category: "travel", pageSize: 1 }).expect(200))
      .body
    expect(paged).toMatchObject({ pageSize: 1, total: 2, hasMore: true })
    expect(paged.items).toHaveLength(1)
  })

  it("a podcast by UUID or legacy documentId (old deep links), with its episodes", async () => {
    const byDoc = (await t.http().get(`/v1/podcasts/${LEGACY.cafeScience}`).expect(200)).body
    const byId = (await t.http().get(`/v1/podcasts/${ids.cafeScience}`).expect(200)).body
    expect(byDoc).toEqual(byId)
    expect(byDoc).toMatchObject({
      id: ids.cafeScience,
      description: "Señor science",
      categories: [
        { slug: "science", name: "Science" },
        { slug: "travel", name: "Travel" },
      ],
      isFollowing: false,
      levels: ["bg", "ad"],
    })
    const episodes = (await t.http().get(`/v1/podcasts/${LEGACY.aroundTheWorld}/episodes`).expect(200)).body
    expect(episodes.items.map((e: { title: string; number: number }) => [e.number, e.title])).toEqual([
      [1, "Lisbon Mornings"],
      [2, "Porto Nights (edited)"],
    ])
    const desc = (await t.http().get(`/v1/podcasts/${ids.aroundTheWorld}/episodes?sort=desc`).expect(200))
      .body
    expect(desc.items.map((e: { number: number }) => e.number)).toEqual([2, 1])
    // A draft-only podcast was never migrated.
    await t.http().get(`/v1/podcasts/${LEGACY.unreleasedShow}`).expect(404)
  })

  it("an episode page: levels with audio, podcast summary, no personal data without a token", async () => {
    const res = await t.http().get(`/v1/episodes/${LEGACY.lisbon}`).expect(200)
    expect(res.body).toEqual({
      id: ids.lisbon,
      podcast: {
        id: ids.aroundTheWorld,
        slug: "around-the-world",
        name: "Around the World",
        coverUrl: "https://cdn.example.com/atw.png",
        episodeCount: 2,
      },
      number: 1,
      title: "Lisbon Mornings",
      description: "A walk",
      coverUrl: "https://cdn.example.com/e1.png",
      bannerUrl: "https://cdn.example.com/e1-banner.png",
      isPro: false,
      publishedAt: expect.stringMatching(/^2026-09-01T18:47:20\.862Z$/),
      levels: [
        {
          level: "bg",
          durationSec: 61.25,
          description: "BG, description",
          audioUrl: "https://cdn.example.com/e1-bg.mp3",
        },
        {
          level: "in",
          durationSec: 61.25,
          description: "IN, description",
          audioUrl: "https://cdn.example.com/e1-in.mp3",
        },
        {
          level: "ad",
          durationSec: 61.25,
          description: "AD description",
          audioUrl: "https://cdn.example.com/e1-ad.mp3",
        },
      ],
      isFavorite: false,
      progress: [],
    })
    // Quantum Coffee: its "IN," level had no audio, "Beginner," became bg.
    const quantum = (await t.http().get(`/v1/episodes/${ids.quantum}`).expect(200)).body
    expect(quantum.levels.map((l: { level: string }) => l.level)).toEqual(["bg", "ad"])
    await t.http().get(`/v1/episodes/${LEGACY.draftEpisode}`).expect(404)
    const missing = await t.http().get(`/v1/episodes/${randomUUID()}`).expect(404)
    expect(missing.headers["content-type"]).toMatch(/application\/problem\+json/)
    expect(missing.body).toMatchObject({ type: "about:blank", title: "Not Found", status: 404 })
  })

  it("transcripts are in seconds (the AD level was stored in milliseconds)", async () => {
    const ad = (await t.http().get(`/v1/episodes/${ids.lisbon}/transcript?level=ad`).expect(200)).body
    expect(ad).toEqual({
      episodeId: ids.lisbon,
      level: "ad",
      chunks: [
        { text: "Hello there.", speaker: "A", start: 0, end: 2.5 },
        { text: "Welcome back.", speaker: "B", start: 2.5, end: 61.25 },
      ],
    })
    const bg = (await t.http().get(`/v1/episodes/${LEGACY.quantum}/transcript?level=bg`).expect(200)).body
    expect(bg.chunks).toEqual([
      { text: "Coffee first.", speaker: null, start: 0.5, end: 3 },
      { text: "Then quantum.", speaker: null, start: 3, end: 3 },
    ])
    await t.http().get(`/v1/episodes/${ids.porto}/transcript?level=ad`).expect(404)
    const invalid = await t.http().get(`/v1/episodes/${ids.porto}/transcript`).expect(400)
    expect(invalid.body).toMatchObject({ title: "Validation failed", status: 400 })
  })

  it("feeds: latest, by level, following needs a user", async () => {
    const latest = (await t.http().get("/v1/episodes?feed=latest&pageSize=50").expect(200)).body
    expect(known(latest.items)).toEqual(["quantum", "porto", "lisbon"])
    const intermediate = (await t.http().get("/v1/episodes?level=in&pageSize=50").expect(200)).body
    expect(known(intermediate.items)).toEqual(["lisbon"])
    await t.http().get("/v1/episodes?feed=following").expect(401)
    const following = (
      await t
        .http()
        .get("/v1/episodes?feed=following")
        .set(await t.as(randomUUID()))
        .expect(200)
    ).body
    expect(following).toEqual({ items: [], page: 1, pageSize: 20, total: 0, hasMore: false })
  })

  it("lists keep their order", async () => {
    const res = (await t.http().get("/v1/lists/editors-picks").expect(200)).body
    expect(res.list).toEqual({
      id: expect.any(String),
      slug: "editors-picks",
      name: "Editor's Picks",
      description: "Our favourites",
    })
    expect(known(res.episodes.items)).toEqual(["quantum", "lisbon"])
    await t.http().get("/v1/lists/nope").expect(404)
  })

  it("home and discover follow the migrated project config", async () => {
    const home = (await t.http().get("/v1/home").expect(200)).body
    expect(known(home.slider)).toEqual(["porto", "lisbon"])
    expect(home.lists.map((l: { slug: string; total: number }) => [l.slug, l.total])).toEqual([
      ["editors-picks", 2],
      ["short-listens", 1],
    ])
    expect(home.continueListening).toEqual([])
    expect(home.following).toEqual([])
    expect(known(home.forYourLevel)).toEqual(["quantum", "porto", "lisbon"])
    expect(known(home.latest)).toEqual(["quantum", "porto", "lisbon"])
    const advanced = (await t.http().get("/v1/home?level=ad").expect(200)).body
    expect(known(advanced.forYourLevel)).toEqual(["quantum", "lisbon"])

    const discover = (await t.http().get("/v1/discover").expect(200)).body
    expect(discover.lists.map((l: { slug: string }) => l.slug)).toEqual(["short-listens"])
    expect(discover.categories.length).toBeGreaterThanOrEqual(2)
    expect(Array.isArray(discover.trending)).toBe(true)
  })

  it("search is case- and accent-insensitive", async () => {
    const cafe = (await t.http().get("/v1/search?q=CAFE").expect(200)).body
    expect(known(cafe.podcasts)).toEqual(["cafeScience"])
    const senor = (await t.http().get("/v1/search").query({ q: "senor" }).expect(200)).body
    expect(known(senor.podcasts)).toEqual(["cafeScience"])
    const lisbon = (await t.http().get("/v1/search?q=lisbon").expect(200)).body
    expect(known(lisbon.episodes)).toEqual(["lisbon"])
    expect(lisbon.podcasts).toEqual([])
    await t.http().get("/v1/search?q=a").expect(400)
    expect((await t.http().get("/v1/search?q=%25%25").expect(200)).body).toEqual({
      podcasts: [],
      episodes: [],
    })
  })

  it("a token, when sent, must be valid", async () => {
    await t.http().get("/v1/home").set("Authorization", "Bearer not-a-token").expect(401)
    await t
      .http()
      .get("/v1/home")
      .set(await t.as(randomUUID(), { issuer: "https://evil.example/auth/v1" }))
      .expect(401)
  })
})
