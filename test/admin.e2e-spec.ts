import { randomUUID } from "node:crypto"
import { sql } from "drizzle-orm"
import { AdminRolesService } from "../src/admin/admin-roles.service"
import { createTestApp, type TestApp } from "./helpers"

describe("Admin (e2e)", () => {
  let t: TestApp
  const ADMIN = randomUUID()
  const asAdmin = () => t.as(ADMIN, { email: "root@glotcast.test", admin: true })
  const chunks = [
    {
      text: "Hello there.",
      speaker: "A",
      start: 0.1,
      end: 1.5,
      words: [
        { text: "Hello", start: 0.1, end: 0.6 },
        { text: "there.", start: 0.7, end: 1.5 },
      ],
    },
  ]
  const state: Record<string, string> = {}

  beforeAll(async () => {
    t = await createTestApp()
  })

  afterAll(async () => {
    await t.close()
  })

  it("is for admins only", async () => {
    await t.http().get("/v1/admin/me").expect(401)
    await t
      .http()
      .get("/v1/admin/me")
      .set(await t.as(randomUUID(), { email: "user@example.com" }))
      .expect(403)
    await t
      .http()
      .get("/v1/admin/me")
      .set(await t.as(randomUUID(), { anonymous: true, admin: true }))
      .expect(403)
    const me = await t
      .http()
      .get("/v1/admin/me")
      .set(await asAdmin())
      .expect(200)
    expect(me.body).toEqual({ id: ADMIN, email: "root@glotcast.test" })
    await t
      .http()
      .post("/v1/admin/podcasts")
      .set(await t.as(randomUUID()))
      .send({ name: "Nope" })
      .expect(403)
  })

  it("category → draft podcast → episode → levels → publish; the app sees only what is published", async () => {
    const auth = await asAdmin()
    const category = await t
      .http()
      .post("/v1/admin/categories")
      .set(auth)
      .send({ name: "Daily Life" })
      .expect(201)
    expect(category.body).toMatchObject({ slug: "daily-life", name: "Daily Life", podcastCount: 0 })
    const twin = await t
      .http()
      .post("/v1/admin/categories")
      .set(auth)
      .send({ name: "Daily  Life!" })
      .expect(201)
    expect(twin.body.slug).toBe("daily-life-2")
    await t
      .http()
      .patch(`/v1/admin/categories/${twin.body.id}`)
      .set(auth)
      .send({ slug: "daily-life" })
      .expect(409)
    await t.http().delete(`/v1/admin/categories/${twin.body.id}`).set(auth).expect(204)
    state.category = category.body.id

    const podcast = await t
      .http()
      .post("/v1/admin/podcasts")
      .set(auth)
      .send({
        name: "Morning Coffee Talk",
        description: "Small talk, big words",
        coverUrl: "https://cdn.example.com/mct.png",
        categoryIds: [state.category],
      })
      .expect(201)
    expect(podcast.body).toMatchObject({
      slug: "morning-coffee-talk",
      status: "draft",
      publishedAt: null,
      categories: [{ id: state.category, slug: "daily-life", name: "Daily Life" }],
      episodeCount: 0,
      legacyDocumentId: null,
    })
    state.podcast = podcast.body.id
    await t
      .http()
      .post("/v1/admin/podcasts")
      .set(auth)
      .send({ name: "Copy", slug: "morning-coffee-talk" })
      .expect(409)
    await t
      .http()
      .post("/v1/admin/podcasts")
      .set(auth)
      .send({ name: "Bad", categoryIds: [randomUUID()] })
      .expect(400)

    const episode = await t
      .http()
      .post("/v1/admin/episodes")
      .set(auth)
      .send({ podcastId: state.podcast, title: "First Sip", number: 1, isPro: false })
      .expect(201)
    expect(episode.body).toMatchObject({
      status: "draft",
      isPro: false,
      levels: [],
      podcast: { id: state.podcast },
    })
    state.episode = episode.body.id
    await t
      .http()
      .post("/v1/admin/episodes")
      .set(auth)
      .send({ podcastId: randomUUID(), title: "Orphan" })
      .expect(400)

    const level = await t
      .http()
      .put(`/v1/admin/episodes/${state.episode}/levels/bg`)
      .set(auth)
      .send({
        audioUrl: "https://cdn.example.com/podcasts/1-sip-bg.mp3",
        durationSec: 4.2,
        description: "Slow",
        transcript: { chunks },
      })
      .expect(200)
    expect(level.body.levels).toEqual([
      expect.objectContaining({
        level: "bg",
        audioUrl: "https://cdn.example.com/podcasts/1-sip-bg.mp3",
        durationSec: 4.2,
        chunkCount: 1,
        hasWordTimings: true,
        transcript: { chunks },
      }),
    ])
    await t.http().put(`/v1/admin/episodes/${state.episode}/levels/c1`).set(auth).send({}).expect(400)
    await t
      .http()
      .put(`/v1/admin/episodes/${state.episode}/levels/in`)
      .set(auth)
      .send({
        audioUrl: "https://x/y.mp3",
        durationSec: 1,
        transcript: { chunks: [{ text: "x", start: "0" }] },
      })
      .expect(400)

    // Draft episode of a draft podcast: invisible.
    await t.http().get(`/v1/episodes/${state.episode}`).expect(404)
    const published = await t.http().post(`/v1/admin/episodes/${state.episode}/publish`).set(auth).expect(200)
    expect(published.body.status).toBe("published")
    await t.http().get(`/v1/episodes/${state.episode}`).expect(404) // the podcast is still a draft
    const live = await t
      .http()
      .patch(`/v1/admin/podcasts/${state.podcast}`)
      .set(auth)
      .send({ published: true })
      .expect(200)
    expect(live.body).toMatchObject({ status: "published", episodeCount: 1, publishedEpisodeCount: 1 })
    const page = (await t.http().get(`/v1/episodes/${state.episode}`).expect(200)).body
    expect(page).toMatchObject({
      title: "First Sip",
      isPro: false,
      levels: [{ level: "bg", durationSec: 4.2 }],
    })
    const transcript = (await t.http().get(`/v1/episodes/${state.episode}/transcript?level=bg`).expect(200))
      .body
    expect(transcript.chunks).toEqual(chunks)

    const listed = (
      await t
        .http()
        .get("/v1/admin/episodes")
        .query({ podcastId: state.podcast, status: "published" })
        .set(auth)
        .expect(200)
    ).body
    expect(listed.items.map((e: { id: string }) => e.id)).toEqual([state.episode])
    const drafts = (
      await t
        .http()
        .get("/v1/admin/episodes")
        .query({ podcastId: state.podcast, status: "draft" })
        .set(auth)
        .expect(200)
    ).body
    expect(drafts.total).toBe(0)
    const searched = (await t.http().get("/v1/admin/episodes?q=SIP").set(auth).expect(200)).body
    expect(searched.items.map((e: { id: string }) => e.id)).toContain(state.episode)
    const podcasts = (await t.http().get("/v1/admin/podcasts?q=coffee").set(auth).expect(200)).body
    expect(podcasts.items.map((p: { id: string }) => p.id)).toContain(state.podcast)
  })

  it("scheduling, unpublishing, and a level change drops its cached translations", async () => {
    const auth = await asAdmin()
    const second = await t
      .http()
      .post("/v1/admin/episodes")
      .set(auth)
      .send({
        podcastId: state.podcast,
        title: "Second Sip",
        number: 2,
        publishedAt: new Date(Date.now() + 86_400_000).toISOString(),
      })
      .expect(201)
    expect(second.body.status).toBe("scheduled")
    await t.http().get(`/v1/episodes/${second.body.id}`).expect(404)
    await t.http().post(`/v1/admin/episodes/${second.body.id}/publish`).set(auth).expect(200)
    await t.http().get(`/v1/episodes/${second.body.id}`).expect(200)
    const off = await t.http().post(`/v1/admin/episodes/${second.body.id}/unpublish`).set(auth).expect(200)
    expect(off.body).toMatchObject({ status: "draft", publishedAt: null })
    await t.http().get(`/v1/episodes/${second.body.id}`).expect(404)
    await t.http().delete(`/v1/admin/episodes/${second.body.id}`).set(auth).expect(204)

    await t
      .http()
      .post("/v1/translate/transcript")
      .set(await t.as(randomUUID()))
      .send({ episodeId: state.episode, level: "bg", target: "tr" })
      .expect(200)
    const count = async () =>
      (
        await t.db.execute<{ n: number }>(
          sql`SELECT count(*)::int AS n FROM app.translations WHERE episode_id = ${state.episode}`,
        )
      ).rows[0]!.n
    expect(await count()).toBe(1)
    await t
      .http()
      .put(`/v1/admin/episodes/${state.episode}/levels/bg`)
      .set(auth)
      .send({
        audioUrl: "https://cdn.example.com/podcasts/1-sip-bg.mp3",
        durationSec: 4.2,
        transcript: { chunks },
      })
      .expect(200)
    expect(await count()).toBe(0)
  })

  it("lists and the home configuration", async () => {
    const auth = await asAdmin()
    const list = await t
      .http()
      .post("/v1/admin/lists")
      .set(auth)
      .send({ name: "Coffee Picks", description: "Warm" })
      .expect(201)
    expect(list.body).toMatchObject({ slug: "coffee-picks", episodeCount: 0, episodes: [] })
    state.list = list.body.id
    const filled = await t
      .http()
      .put(`/v1/admin/lists/${state.list}/episodes`)
      .set(auth)
      .send({ episodeIds: [state.episode] })
      .expect(200)
    expect(filled.body.episodes).toEqual([
      expect.objectContaining({
        id: state.episode,
        title: "First Sip",
        status: "published",
        podcast: { id: state.podcast, name: "Morning Coffee Talk" },
      }),
    ])
    await t
      .http()
      .put(`/v1/admin/lists/${state.list}/episodes`)
      .set(auth)
      .send({ episodeIds: [randomUUID()] })
      .expect(400)
    expect((await t.http().get("/v1/lists/coffee-picks").expect(200)).body.episodes.total).toBe(1)

    const config = {
      sliderEpisodeIds: [state.episode],
      homeListIds: [state.list],
      exploreListIds: [state.list],
    }
    expect((await t.http().put("/v1/admin/home-config").set(auth).send(config).expect(200)).body).toEqual(
      config,
    )
    expect((await t.http().get("/v1/admin/home-config").set(auth).expect(200)).body).toEqual(config)
    await t
      .http()
      .put("/v1/admin/home-config")
      .set(auth)
      .send({ ...config, homeListIds: [randomUUID()] })
      .expect(400)
    const home = (await t.http().get("/v1/home").expect(200)).body
    expect(home.slider.map((e: { id: string }) => e.id)).toEqual([state.episode])
    expect(home.lists.map((l: { id: string }) => l.id)).toEqual([state.list])
  })

  it("deleting removes episodes and lists from the home configuration; a podcast with episodes is kept", async () => {
    const auth = await asAdmin()
    await t.http().delete(`/v1/admin/podcasts/${state.podcast}`).set(auth).expect(409)
    await t.http().delete(`/v1/admin/episodes/${state.episode}`).set(auth).expect(204)
    await t.http().delete(`/v1/admin/lists/${state.list}`).set(auth).expect(204)
    expect((await t.http().get("/v1/admin/home-config").set(auth).expect(200)).body).toEqual({
      sliderEpisodeIds: [],
      homeListIds: [],
      exploreListIds: [],
    })
    await t.http().delete(`/v1/admin/podcasts/${state.podcast}`).set(auth).expect(204)
    await t.http().get(`/v1/admin/podcasts/${state.podcast}`).set(auth).expect(404)
  })

  it("users: search, profile with stats, backend Pro", async () => {
    const auth = await asAdmin()
    const user = randomUUID()
    const userAuth = await t.as(user, { email: "pro-candidate@example.com" })
    await t.http().get("/v1/me").set(userAuth).expect(200)
    const found = (await t.http().get("/v1/admin/users?q=pro-candidate").set(auth).expect(200)).body
    expect(found.items).toEqual([
      expect.objectContaining({
        id: user,
        email: "pro-candidate@example.com",
        isAnonymous: false,
        featureAccess: false,
      }),
    ])
    const byId = (
      await t
        .http()
        .get(`/v1/admin/users?q=${user.slice(0, 8)}`)
        .set(auth)
        .expect(200)
    ).body
    expect(byId.items.map((u: { id: string }) => u.id)).toContain(user)
    const detail = (await t.http().get(`/v1/admin/users/${user}`).set(auth).expect(200)).body
    expect(detail.user).toMatchObject({ id: user, level: "bg", legacyStrapiUserId: null })
    expect(detail.stats).toMatchObject({ streakDays: 0, wordsTotal: 0 })
    expect(detail.stats.last7Days).toHaveLength(7)
    const granted = (
      await t.http().patch(`/v1/admin/users/${user}`).set(auth).send({ featureAccess: true }).expect(200)
    ).body
    expect(granted.user.featureAccess).toBe(true)
    expect((await t.http().get("/v1/me").set(userAuth).expect(200)).body.featureAccess).toBe(true)
    await t.http().get(`/v1/admin/users/${randomUUID()}`).set(auth).expect(404)
  })

  it("dashboard", async () => {
    const res = (
      await t
        .http()
        .get("/v1/admin/dashboard")
        .set(await asAdmin())
        .expect(200)
    ).body
    expect(res.users.total).toBeGreaterThanOrEqual(1)
    expect(res.dau).toHaveLength(30)
    expect(res.dau[29].date).toBe(new Date().toISOString().slice(0, 10))
    expect(res.episodes).toEqual({ published: expect.any(Number), drafts: expect.any(Number) })
    expect(Array.isArray(res.topEpisodes)).toBe(true)
  })

  it("pipeline: presigned upload, transcription job with word timings, cover prompt and image", async () => {
    const auth = await asAdmin()
    const presigned = await t
      .http()
      .post("/v1/admin/media/presign")
      .set(auth)
      .send({ folder: "podcasts", filename: "ep 1.mp3", contentType: "audio/mpeg" })
      .expect(200)
    expect(presigned.body).toEqual({
      uploadUrl: expect.stringContaining("https://"),
      publicUrl: expect.any(String),
      expiresAt: expect.any(String),
    })
    await t
      .http()
      .post("/v1/admin/media/presign")
      .set(auth)
      .send({ folder: "podcasts", filename: "x.exe", contentType: "application/x-msdownload" })
      .expect(400)

    const job = await t
      .http()
      .post("/v1/admin/transcribe")
      .set(auth)
      .send({ audioUrl: "https://cdn.example.com/podcasts/1-ep.mp3" })
      .expect(201)
    expect(job.body).toEqual({ jobId: expect.any(String) })
    expect((await t.http().get(`/v1/admin/transcribe/${job.body.jobId}`).set(auth).expect(200)).body).toEqual(
      { status: "processing" },
    )
    const done = (await t.http().get(`/v1/admin/transcribe/${job.body.jobId}`).set(auth).expect(200)).body
    expect(done).toEqual({
      status: "completed",
      durationSec: 4.2,
      utterances: [
        {
          text: "Hello there.",
          speaker: "A",
          start: 0.1,
          end: 1.5,
          words: [
            { text: "Hello", start: 0.1, end: 0.6 },
            { text: "there.", start: 0.7, end: 1.5 },
          ],
        },
      ],
      sentences: [{ text: "Hello there.", speaker: "A", start: 0.1, end: 4.2, words: [] }],
      paragraphs: [{ text: "Hello there. Bye.", speaker: "A", start: 0.1, end: 4.2, words: [] }],
    })
    const polls = t.fakes.assemblyai.polls.get("aai-1")
    expect((await t.http().get(`/v1/admin/transcribe/${job.body.jobId}`).set(auth).expect(200)).body).toEqual(
      done,
    )
    expect(t.fakes.assemblyai.polls.get("aai-1")).toBe(polls) // served from the stored result
    await t.http().get(`/v1/admin/transcribe/${randomUUID()}`).set(auth).expect(404)

    const prompt = await t
      .http()
      .post("/v1/admin/covers/prompt")
      .set(auth)
      .send({
        podcastName: "Morning Coffee Talk",
        episodeTitle: "First Sip",
        transcriptText: "Hello there.",
        style: "risograph",
      })
      .expect(200)
    expect(prompt.body.prompt).toMatch(/^A cover for "First Sip" of "Morning Coffee Talk"/)
    await t
      .http()
      .post("/v1/admin/covers/prompt")
      .set(auth)
      .send({ podcastName: "x", episodeTitle: "y", transcriptText: "z", style: "watercolor" })
      .expect(400)
    const image = await t
      .http()
      .post("/v1/admin/covers/image")
      .set(auth)
      .send({ prompt: prompt.body.prompt, model: "openai", aspect: "3:4" })
      .expect(200)
    expect(image.body).toEqual({ url: "https://cdn.example.com/images/1-cover-openai-3x4.png" })
    expect(t.fakes.storage.puts.at(-1)).toMatchObject({ folder: "images", contentType: "image/png" })
  })

  it("writes go to the audit log", async () => {
    const res = (
      await t
        .http()
        .get("/v1/admin/audit")
        .query({ targetId: state.episode })
        .set(await asAdmin())
        .expect(200)
    ).body
    const actions = res.entries.map((e: { action: string }) => e.action)
    expect(actions).toEqual(
      expect.arrayContaining(["episode.create", "level.put", "episode.publish", "episode.delete"]),
    )
    const created = res.entries.find((e: { action: string }) => e.action === "episode.create")
    expect(created).toMatchObject({
      actor: { id: ADMIN, email: "root@glotcast.test" },
      targetType: "episode",
      targetId: state.episode,
      meta: { podcastId: state.podcast, title: "First Sip", number: 1, isPro: false },
    })
    const levelPut = res.entries.find((e: { action: string }) => e.action === "level.put")
    expect(levelPut.meta).toMatchObject({ level: "bg", durationSec: 4.2 })
    expect(levelPut.meta.transcript).toBeUndefined()
  })

  it("admin grant (CLI) sets app_metadata.role on a registered account and is audited", async () => {
    const id = randomUUID()
    await t.db.execute(sql`
      INSERT INTO auth.users (id, email, is_anonymous, raw_app_meta_data) VALUES (${id}, 'editor@glotcast.test', false, '{"provider":"apple"}')
    `)
    const roles = t.app.get(AdminRolesService)
    const granted = await roles.grant("Editor@glotcast.test")
    expect(granted).toMatchObject({ id, email: "editor@glotcast.test", role: "admin" })
    const meta = await t.db.execute<{ m: Record<string, unknown> }>(
      sql`SELECT raw_app_meta_data AS m FROM auth.users WHERE id = ${id}`,
    )
    expect(meta.rows[0]!.m).toEqual({ provider: "apple", role: "admin" })
    expect((await roles.list()).map((a) => a.email)).toContain("editor@glotcast.test")
    await roles.revoke("editor@glotcast.test")
    await expect(roles.grant("missing@glotcast.test")).rejects.toThrow(/no registered account/)
    const audit = (
      await t
        .http()
        .get("/v1/admin/audit")
        .query({ targetId: id })
        .set(await asAdmin())
        .expect(200)
    ).body
    expect(audit.entries.map((e: { action: string; actor: unknown }) => [e.action, e.actor])).toEqual([
      ["role.revoke", null],
      ["role.grant", null],
    ])
  })
})
