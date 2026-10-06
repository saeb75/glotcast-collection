import { randomUUID } from "node:crypto"
import { sql } from "drizzle-orm"
import { createTestApp, LEGACY, type TestApp } from "./helpers"

describe("Me (e2e)", () => {
  let t: TestApp
  const ids = {} as Record<keyof typeof LEGACY, string>

  const beat = (episodeId: string, body: Partial<Record<string, unknown>> = {}) => ({
    episodeId,
    level: "bg",
    positionSec: 0,
    durationSec: 61.25,
    listenedSec: 0,
    date: "2026-10-05",
    ...body,
  })

  beforeAll(async () => {
    t = await createTestApp()
    await t.migrate()
    const rows = await t.db.execute<{ legacy_document_id: string; id: string }>(sql`
      SELECT legacy_document_id, id FROM app.episodes WHERE legacy_document_id IS NOT NULL
      UNION ALL SELECT legacy_document_id, id FROM app.podcasts WHERE legacy_document_id IS NOT NULL
    `)
    const byDoc = new Map(rows.rows.map((r) => [r.legacy_document_id, r.id]))
    for (const [key, doc] of Object.entries(LEGACY))
      if (byDoc.has(doc)) ids[key as keyof typeof LEGACY] = byDoc.get(doc)!
  })

  afterAll(async () => {
    await t.close()
  })

  it("GET /me provisions the user with defaults and the provider's name", async () => {
    const user = randomUUID()
    await t.http().get("/v1/me").expect(401)
    const res = await t
      .http()
      .get("/v1/me")
      .set(await t.as(user, { email: "zeynep@example.com", name: "Zeynep K" }))
      .expect(200)
    expect(res.headers["cache-control"]).toBe("private, no-store")
    expect(res.body).toEqual({
      id: user,
      isAnonymous: false,
      email: "zeynep@example.com",
      name: "Zeynep K",
      avatarUrl: null,
      nativeLanguage: null,
      uiLanguage: null,
      translationLanguage: null,
      level: "bg",
      dailyGoalMin: 10,
      interests: [],
      motivation: null,
      reminderTime: null,
      featureAccess: false,
      timezone: null,
      pushEnabled: false,
      notifyReminders: true,
      notifyLearning: true,
      notifyNewEpisodes: true,
      notifyNews: true,
      proActive: false,
      createdAt: expect.any(String),
    })
    const guest = randomUUID()
    const anonymous = await t
      .http()
      .get("/v1/me")
      .set(await t.as(guest, { anonymous: true }))
      .expect(200)
    expect(anonymous.body).toMatchObject({ id: guest, isAnonymous: true, email: null })
  })

  it("PATCH /me updates the profile and validates it", async () => {
    const auth = await t.as(randomUUID())
    const patch = {
      name: "Ayşe",
      nativeLanguage: "tr",
      uiLanguage: "tr",
      translationLanguage: "pt-BR",
      level: "in",
      dailyGoalMin: 15,
      interests: ["travel", 'tech, "quoted"'],
      motivation: "career",
      reminderTime: "08:30",
    }
    const res = await t.http().patch("/v1/me").set(auth).send(patch).expect(200)
    expect(res.body).toMatchObject(patch)
    const cleared = await t
      .http()
      .patch("/v1/me")
      .set(auth)
      .send({ reminderTime: null, motivation: null })
      .expect(200)
    expect(cleared.body).toMatchObject({ reminderTime: null, motivation: null, level: "in" })
    for (const bad of [
      { reminderTime: "25:00" },
      { level: "c1" },
      { dailyGoalMin: 0 },
      { nativeLanguage: "türkçe" },
    ]) {
      const err = await t.http().patch("/v1/me").set(auth).send(bad).expect(400)
      expect(err.headers["content-type"]).toMatch(/problem\+json/)
    }
  })

  it("listening heartbeats: progress, completion at 95 %, the day's seconds, the goal crossed once", async () => {
    const auth = await t.as(randomUUID())
    await t.http().patch("/v1/me").set(auth).send({ dailyGoalMin: 2 }).expect(200) // 120 s

    const first = await t
      .http()
      .post("/v1/me/listening")
      .set(auth)
      .send(beat(LEGACY.lisbon, { positionSec: 30, listenedSec: 30 }))
      .expect(200)
    expect(first.body).toEqual({
      progress: {
        level: "bg",
        positionSec: 30,
        durationSec: 61.25,
        completed: false,
        updatedAt: expect.any(String),
      },
      today: { date: "2026-10-05", seconds: 30 },
      goalMetNow: false,
      milestone: null,
    })
    // 500 s since the last heartbeat is clamped to 120; 59 s of 61.25 is past 95 %.
    const second = await t
      .http()
      .post("/v1/me/listening")
      .set(auth)
      .send(beat(ids.lisbon, { positionSec: 59, listenedSec: 500 }))
      .expect(200)
    expect(second.body).toMatchObject({
      progress: { completed: true, positionSec: 59 },
      today: { seconds: 150 },
      goalMetNow: true,
    })
    const third = await t
      .http()
      .post("/v1/me/listening")
      .set(auth)
      .send(beat(ids.lisbon, { positionSec: 3, listenedSec: -4 }))
      .expect(200)
    expect(third.body).toMatchObject({
      progress: { completed: true, positionSec: 3 },
      today: { seconds: 150 },
      goalMetNow: false,
    })
    // durationSec 0: the level's own duration is used.
    const own = await t
      .http()
      .post("/v1/me/listening")
      .set(auth)
      .send(beat(ids.quantum, { level: "bg", durationSec: 0, positionSec: 1, listenedSec: 1 }))
      .expect(200)
    expect(own.body.progress).toMatchObject({ durationSec: 3, completed: false })

    await t.http().post("/v1/me/listening").set(auth).send(beat(randomUUID())).expect(404)
    await t
      .http()
      .post("/v1/me/listening")
      .set(auth)
      .send(beat(ids.lisbon, { date: "2026-02-30" }))
      .expect(400)
  })

  it("progress lists, continue listening, the episode page's progress, trending", async () => {
    const auth = await t.as(randomUUID())
    await t
      .http()
      .post("/v1/me/listening")
      .set(auth)
      .send(beat(ids.lisbon, { positionSec: 60, listenedSec: 60 }))
      .expect(200)
    await t
      .http()
      .post("/v1/me/listening")
      .set(auth)
      .send(beat(ids.porto, { positionSec: 10, listenedSec: 10 }))
      .expect(200)

    const progress = (s: string) => t.http().get(`/v1/me/progress?status=${s}`).set(auth).expect(200)
    const inProgress = (await progress("in_progress")).body
    expect(inProgress.items.map((i: { episode: { id: string } }) => i.episode.id)).toEqual([ids.porto])
    expect(inProgress.items[0]).toMatchObject({ level: "bg", positionSec: 10, completed: false })
    expect(
      (await progress("completed")).body.items.map((i: { episode: { id: string } }) => i.episode.id),
    ).toEqual([ids.lisbon])
    const all = (await progress("all")).body
    expect(all).toMatchObject({ total: 2, hasMore: false })
    expect(all.items.map((i: { episode: { id: string } }) => i.episode.id)).toEqual([ids.porto, ids.lisbon])

    const home = (await t.http().get("/v1/home").set(auth).expect(200)).body
    expect(home.continueListening.map((i: { episode: { id: string } }) => i.episode.id)).toEqual([ids.porto])

    const episode = (await t.http().get(`/v1/episodes/${ids.lisbon}`).set(auth).expect(200)).body
    expect(episode.progress).toEqual([
      { level: "bg", positionSec: 60, durationSec: 61.25, completed: true, updatedAt: expect.any(String) },
    ])

    // Trending = distinct listeners over 14 days, most first.
    const trending = (await t.http().get("/v1/episodes?feed=trending&pageSize=50").expect(200)).body
    const counts = await t.db.execute<{ episode_id: string; n: number }>(sql`
      SELECT episode_id, count(DISTINCT user_id)::int AS n FROM app.listening_progress
      WHERE updated_at > now() - interval '14 days' GROUP BY episode_id
    `)
    const listeners = new Map(counts.rows.map((r) => [r.episode_id, r.n]))
    const sequence = trending.items.map((e: { id: string }) => listeners.get(e.id) ?? 0)
    expect(sequence).toEqual([...sequence].sort((a: number, b: number) => b - a))
    expect(sequence[0]).toBeGreaterThanOrEqual(2) // Lisbon: two listeners in this file alone
  })

  it("stats: streaks from the client's day, the goal, totals, words", async () => {
    const user = randomUUID()
    const auth = await t.as(user)
    await t.http().get("/v1/me").set(auth).expect(200)
    await t.db.execute(sql`
      INSERT INTO app.listening_days (user_id, date, seconds) VALUES
        (${user}, '2026-09-20', 900), (${user}, '2026-09-21', 900), (${user}, '2026-09-22', 900),
        (${user}, '2026-10-01', 600), (${user}, '2026-10-02', 600), (${user}, '2026-10-03', 30),
        (${user}, '2026-10-04', 100), (${user}, '2026-10-05', 100)
    `)
    const before = (await t.http().get("/v1/me/stats?date=2026-10-06").set(auth).expect(200)).body
    expect(before).toMatchObject({
      streakDays: 2, // 10-05, 10-04 — today has nothing yet, 10-03 had 30 s
      bestStreakDays: 3,
      todaySec: 0,
      dailyGoalSec: 600,
      goalMetToday: false,
      totalSec: 4130,
      episodesCompleted: 0,
      wordsTotal: 0,
    })
    expect(before.last7Days).toEqual([
      { date: "2026-09-30", seconds: 0 },
      { date: "2026-10-01", seconds: 600 },
      { date: "2026-10-02", seconds: 600 },
      { date: "2026-10-03", seconds: 30 },
      { date: "2026-10-04", seconds: 100 },
      { date: "2026-10-05", seconds: 100 },
      { date: "2026-10-06", seconds: 0 },
    ])

    await t
      .http()
      .post("/v1/me/listening")
      .set(auth)
      .send(beat(ids.porto, { positionSec: 61, listenedSec: 90, date: "2026-10-06" }))
      .expect(200)
    await t
      .http()
      .post("/v1/words")
      .set(auth)
      .send({ word: "Brave", meaning: "cesur", language: "tr" })
      .expect(201)
    await t
      .http()
      .post("/v1/words")
      .set(auth)
      .send({ word: "calm", meaning: "sakin", language: "tr" })
      .expect(201)
    await t.db.execute(
      sql`UPDATE app.words SET box = 5, next_review_at = now() + interval '16 days' WHERE user_id = ${user} AND word = 'calm'`,
    )
    const after = (await t.http().get("/v1/me/stats").query({ date: "2026-10-06" }).set(auth).expect(200))
      .body
    expect(after).toMatchObject({
      streakDays: 3,
      bestStreakDays: 3,
      todaySec: 90,
      episodesCompleted: 1,
      wordsTotal: 2,
      wordsMastered: 1,
      wordsDue: 1,
    })
    await t.http().get("/v1/me/stats").set(auth).expect(200) // no date: UTC today
    await t.http().get("/v1/me/stats?date=06-10-2026").set(auth).expect(400)
  })

  it("follows and favorites: by UUID or legacy id, idempotent, reflected in the catalog", async () => {
    const auth = await t.as(randomUUID())
    await t.http().put(`/v1/me/follows/${LEGACY.aroundTheWorld}`).set(auth).expect(204)
    await t.http().put(`/v1/me/follows/${ids.aroundTheWorld}`).set(auth).expect(204)
    const follows = (await t.http().get("/v1/me/follows").set(auth).expect(200)).body
    expect(follows.items.map((p: { id: string }) => p.id)).toEqual([ids.aroundTheWorld])
    expect(
      (await t.http().get(`/v1/podcasts/${ids.aroundTheWorld}`).set(auth).expect(200)).body.isFollowing,
    ).toBe(true)
    const home = (await t.http().get("/v1/home").set(auth).expect(200)).body
    expect(home.following.map((e: { id: string }) => e.id)).toEqual([ids.porto]) // its newest episode
    const feed = (await t.http().get("/v1/episodes?feed=following").set(auth).expect(200)).body
    expect(feed.items.map((e: { id: string }) => e.id)).toEqual([ids.porto, ids.lisbon])
    await t.http().delete(`/v1/me/follows/${ids.aroundTheWorld}`).set(auth).expect(204)
    await t.http().delete(`/v1/me/follows/${ids.aroundTheWorld}`).set(auth).expect(204)
    expect((await t.http().get("/v1/me/follows").set(auth).expect(200)).body.total).toBe(0)
    await t.http().put(`/v1/me/follows/${randomUUID()}`).set(auth).expect(404)
    await t.http().put(`/v1/me/follows/${LEGACY.unreleasedShow}`).set(auth).expect(404)

    await t.http().put(`/v1/me/favorites/${LEGACY.quantum}`).set(auth).expect(204)
    await t.http().put(`/v1/me/favorites/${ids.quantum}`).set(auth).expect(204)
    const favorites = (await t.http().get("/v1/me/favorites").set(auth).expect(200)).body
    expect(favorites).toMatchObject({ total: 1, items: [{ id: ids.quantum, title: "Quantum Coffee" }] })
    expect((await t.http().get(`/v1/episodes/${ids.quantum}`).set(auth).expect(200)).body.isFavorite).toBe(
      true,
    )
    await t.http().delete(`/v1/me/favorites/${ids.quantum}`).set(auth).expect(204)
    expect((await t.http().get("/v1/me/favorites").set(auth).expect(200)).body.items).toEqual([])
    await t.http().put(`/v1/me/favorites/${LEGACY.draftEpisode}`).set(auth).expect(404)
  })

  it("DELETE /me removes every row of the account and the Supabase user", async () => {
    const user = randomUUID()
    const auth = await t.as(user, { email: "leaving@example.com" })
    await t
      .http()
      .post("/v1/me/listening")
      .set(auth)
      .send(beat(ids.lisbon, { positionSec: 5, listenedSec: 5 }))
      .expect(200)
    await t
      .http()
      .post("/v1/words")
      .set(auth)
      .send({ word: "bye", meaning: "hoşçakal", language: "tr" })
      .expect(201)
    await t.http().put(`/v1/me/follows/${ids.cafeScience}`).set(auth).expect(204)
    await t.http().delete("/v1/me").set(auth).expect(204)
    expect(t.fakes.supabase.deleted).toContain(user)
    const left = await t.db.execute<{ n: number }>(sql`
      SELECT (SELECT count(*) FROM app.users WHERE id = ${user})
           + (SELECT count(*) FROM app.listening_progress WHERE user_id = ${user})
           + (SELECT count(*) FROM app.listening_days WHERE user_id = ${user})
           + (SELECT count(*) FROM app.words WHERE user_id = ${user})
           + (SELECT count(*) FROM app.follows WHERE user_id = ${user}) AS n
    `)
    expect(Number(left.rows[0]!.n)).toBe(0)
    await t.http().get("/v1/me").set(auth).expect(403) // a still-valid token cannot bring it back
  })
})
