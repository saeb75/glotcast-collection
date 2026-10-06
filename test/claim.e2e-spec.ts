import { randomUUID } from "node:crypto"
import { sql } from "drizzle-orm"
import { createTestApp, LEGACY, type TestApp } from "./helpers"

/** Legacy Strapi accounts (public.up_users + subscriptions + vocab tables) and guest → account claims. */
describe("Claims (e2e)", () => {
  let t: TestApp
  const ids = {} as Record<keyof typeof LEGACY, string>
  const words = async (auth: { Authorization: string }) =>
    (await t.http().get("/v1/words?pageSize=50").set(auth).expect(200)).body.items as {
      word: string
      meaning: string
      box: number
      nextReviewAt: string
      lastReviewedAt: string | null
      correctCount: number
      incorrectCount: number
      detail: unknown
      phonetic: string | null
      audioUrl: string | null
    }[]
  const follows = async (auth: { Authorization: string }) =>
    ((await t.http().get("/v1/me/follows").set(auth).expect(200)).body.items as { id: string }[])
      .map((p) => p.id)
      .sort()

  beforeAll(async () => {
    t = await createTestApp()
    await t.migrate()
    const rows = await t.db.execute<{ legacy_document_id: string; id: string }>(sql`
      SELECT legacy_document_id, id FROM app.episodes WHERE legacy_document_id IS NOT NULL
      UNION ALL SELECT legacy_document_id, id FROM app.podcasts WHERE legacy_document_id IS NOT NULL
    `)
    const byDoc = new Map(rows.rows.map((r) => [r.legacy_document_id, r.id]))
    for (const [key, doc] of Object.entries(LEGACY)) if (byDoc.has(doc)) ids[key as keyof typeof LEGACY] = byDoc.get(doc)!
  })

  afterAll(async () => {
    await t.close()
  })

  it("a registered account's first sign-in copies its legacy follows, words (with Leitner state) and Pro", async () => {
    const user = randomUUID()
    const auth = await t.as(user, { email: "AYSE@example.com" }) // Strapi has Ayse@Example.com
    const me = (await t.http().get("/v1/me").set(auth).expect(200)).body
    expect(me.featureAccess).toBe(true)
    // Strapi linked each subscription to the podcast's draft and published rows: one follow each.
    expect(await follows(auth)).toEqual([ids.aroundTheWorld, ids.cafeScience].sort())
    const saved = await words(auth)
    expect(saved.map((w) => w.word).sort()).toEqual(["brave", "run", "serendipity"])
    expect(saved.find((w) => w.word === "serendipity")).toMatchObject({
      meaning: "tesadüf",
      box: 3,
      nextReviewAt: "2026-08-10T09:00:00.000Z",
      lastReviewedAt: "2026-08-06T09:00:00.000Z",
      correctCount: 2,
      incorrectCount: 1,
      phonetic: "/ˌserənˈdɪpəti/",
      audioUrl: "https://audio.example.com/serendipity.mp3",
      detail: [{ pos: "noun", definitions: ["finding good things by chance"] }],
    })
    expect(saved.find((w) => w.word === "run")).toMatchObject({ box: 1, audioUrl: null, detail: [] })
    expect(saved.find((w) => w.word === "brave")).toMatchObject({
      box: 1,
      detail: null,
      lastReviewedAt: null,
    })
    const row = await t.db.execute<{ legacy_strapi_user_id: number }>(
      sql`SELECT legacy_strapi_user_id FROM app.users WHERE id = ${user}`,
    )
    expect(row.rows[0]!.legacy_strapi_user_id).toBe(1)

    // Idempotent: a word deleted since never comes back (new token, claim-guest, everything).
    const run = (await words(auth)).find((w) => w.word === "run") as unknown as { id: string }
    await t.http().delete(`/v1/words/${run.id}`).set(auth).expect(204)
    const again = await t.as(user, { email: "ayse@example.com" })
    await t.http().get("/v1/me").set(again).expect(200)
    const guest = randomUUID()
    await t
      .http()
      .get("/v1/me")
      .set(await t.as(guest, { anonymous: true }))
      .expect(200)
    await t
      .http()
      .post("/v1/me/claim-guest")
      .set(again)
      .send({ guestAccessToken: await t.token(guest, { anonymous: true }) })
      .expect(200)
    expect((await words(again)).map((w) => w.word).sort()).toEqual(["brave", "serendipity"])
    expect(await follows(again)).toHaveLength(2)

    // The legacy tables were only read.
    const legacy = await t.db.execute<{ n: number }>(sql`SELECT count(*)::int AS n FROM public.vocab_words`)
    expect(legacy.rows[0]!.n).toBe(4)
  })

  it("guests never import; each legacy account gets only its own data", async () => {
    const guest = await t.as(randomUUID(), { anonymous: true })
    await t.http().get("/v1/me").set(guest).expect(200)
    expect(await words(guest)).toEqual([])
    expect(await follows(guest)).toEqual([])

    const mehmet = await t.as(randomUUID(), { email: "mehmet@example.com" })
    const me = (await t.http().get("/v1/me").set(mehmet).expect(200)).body
    expect(me.featureAccess).toBe(false)
    expect((await words(mehmet)).map((w) => w.word)).toEqual(["other"])
    expect(await follows(mehmet)).toEqual([])

    const stranger = await t.as(randomUUID(), { email: "nobody@example.com" })
    await t.http().get("/v1/me").set(stranger).expect(200)
    expect(await words(stranger)).toEqual([])
  })

  it("claim-guest moves the guest's rows (the account wins on conflict), takes its onboarding, deletes it", async () => {
    const guest = randomUUID()
    const g = await t.as(guest, { anonymous: true })
    const account = randomUUID()
    const a = await t.as(account, { email: "kaan@example.com" })
    const listen = (
      auth: { Authorization: string },
      level: string,
      positionSec: number,
      listenedSec: number,
    ) =>
      t
        .http()
        .post("/v1/me/listening")
        .set(auth)
        .send({
          episodeId: ids.lisbon,
          level,
          positionSec,
          durationSec: 61.25,
          listenedSec,
          date: "2026-10-05",
        })
        .expect(200)

    // The guest onboards and listens.
    await t
      .http()
      .patch("/v1/me")
      .set(g)
      .send({ nativeLanguage: "de", level: "ad", dailyGoalMin: 20, interests: ["music"], motivation: "fun" })
      .expect(200)
    await listen(g, "bg", 20, 20)
    await listen(g, "in", 5, 5)
    await t
      .http()
      .post("/v1/words")
      .set(g)
      .send({ word: "Serendipity", meaning: "Zufall", language: "de" })
      .expect(201)
    await t
      .http()
      .post("/v1/words")
      .set(g)
      .send({ word: "harbor", meaning: "Hafen", language: "de" })
      .expect(201)
    await t.http().put(`/v1/me/follows/${ids.cafeScience}`).set(g).expect(204)
    await t.http().put(`/v1/me/follows/${ids.aroundTheWorld}`).set(g).expect(204)
    await t.http().put(`/v1/me/favorites/${ids.quantum}`).set(g).expect(204)

    // The account has its own rows (no legacy data for this email).
    await listen(a, "bg", 50, 10)
    await t
      .http()
      .post("/v1/words")
      .set(a)
      .send({ word: "Harbor", meaning: "liman", language: "tr" })
      .expect(201)
    await t.http().put(`/v1/me/follows/${ids.aroundTheWorld}`).set(a).expect(204)

    const res = await t
      .http()
      .post("/v1/me/claim-guest")
      .set(a)
      .send({ guestAccessToken: await t.token(guest, { anonymous: true }) })
      .expect(200)
    expect(res.body).toEqual({ moved: { progress: 1, words: 1, follows: 1, favorites: 1 } })

    const progress = (await t.http().get("/v1/me/progress").set(a).expect(200)).body.items
    expect(
      progress.map((p: { level: string; positionSec: number }) => [p.level, p.positionSec]).sort(),
    ).toEqual([
      ["bg", 50], // the account's own
      ["in", 5], // from the guest
    ])
    const stats = (await t.http().get("/v1/me/stats?date=2026-10-05").set(a).expect(200)).body
    expect(stats.todaySec).toBe(35) // 10 + the guest's 25: seconds of the same day add up
    const saved = await words(a)
    expect(saved.map((w) => [w.word, w.meaning]).sort()).toEqual([
      ["Harbor", "liman"],
      ["Serendipity", "Zufall"],
    ])
    expect(await follows(a)).toEqual([ids.aroundTheWorld, ids.cafeScience].sort())
    expect((await t.http().get("/v1/me/favorites").set(a).expect(200)).body.total).toBe(1)
    // The account never set its profile: it takes the guest's onboarding answers.
    expect((await t.http().get("/v1/me").set(a).expect(200)).body).toMatchObject({
      nativeLanguage: "de",
      level: "ad",
      dailyGoalMin: 20,
      interests: ["music"],
      motivation: "fun",
    })

    expect(t.fakes.supabase.deleted).toContain(guest)
    const gone = await t.db.execute(sql`SELECT 1 FROM app.users WHERE id = ${guest}`)
    expect(gone.rows).toHaveLength(0)
    await t.http().get("/v1/me").set(g).expect(403)
  })

  it("an account that set its profile keeps it; only empty fields are filled", async () => {
    const guest = randomUUID()
    const g = await t.as(guest, { anonymous: true })
    await t
      .http()
      .patch("/v1/me")
      .set(g)
      .send({ level: "ad", translationLanguage: "es", interests: ["film"] })
      .expect(200)
    const a = await t.as(randomUUID(), { email: "settled@example.com" })
    await t.http().patch("/v1/me").set(a).send({ level: "in", nativeLanguage: "tr" }).expect(200)
    await t
      .http()
      .post("/v1/me/claim-guest")
      .set(a)
      .send({ guestAccessToken: await t.token(guest, { anonymous: true }) })
      .expect(200)
    expect((await t.http().get("/v1/me").set(a).expect(200)).body).toMatchObject({
      level: "in",
      nativeLanguage: "tr",
      translationLanguage: "es",
      interests: ["film"],
    })
  })

  it("claim-guest also claims legacy data an account missed (signed in before the legacy tables were there)", async () => {
    const user = randomUUID()
    await t.db.execute(sql`
      INSERT INTO app.users (id, email, legacy_checked_at) VALUES (${user}, 'Mehmet@example.com', now())
    `)
    const auth = await t.as(user, { email: "mehmet@example.com" })
    expect(await words(auth)).toEqual([]) // checked already: not imported on sign-in
    const guest = randomUUID()
    await t
      .http()
      .post("/v1/me/claim-guest")
      .set(auth)
      .send({ guestAccessToken: await t.token(guest, { anonymous: true }) })
      .expect(200)
    expect((await words(auth)).map((w) => w.word)).toEqual(["other"])
  })

  it("claim-guest refuses guests as callers, registered tokens and forged ones", async () => {
    const guestToken = await t.token(randomUUID(), { anonymous: true })
    await t
      .http()
      .post("/v1/me/claim-guest")
      .set(await t.as(randomUUID(), { anonymous: true }))
      .send({ guestAccessToken: guestToken })
      .expect(403)
    const registered = await t.token(randomUUID(), { email: "someone@example.com" })
    await t
      .http()
      .post("/v1/me/claim-guest")
      .set(await t.as(randomUUID(), { email: "me@example.com" }))
      .send({ guestAccessToken: registered })
      .expect(403)
    await t
      .http()
      .post("/v1/me/claim-guest")
      .set(await t.as(randomUUID(), { email: "me2@example.com" }))
      .send({ guestAccessToken: "x".repeat(40) })
      .expect(401)
    await t
      .http()
      .post("/v1/me/claim-guest")
      .set(await t.as(randomUUID(), { email: "me3@example.com" }))
      .send({})
      .expect(400)
  })
})
