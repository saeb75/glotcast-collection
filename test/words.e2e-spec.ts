import { randomUUID } from "node:crypto"
import { sql } from "drizzle-orm"
import { createTestApp, LEGACY, type TestApp } from "./helpers"

describe("Words and translation (e2e)", () => {
  let t: TestApp
  let lisbon: string

  beforeAll(async () => {
    t = await createTestApp()
    await t.migrate()
    const res = await t.db.execute<{ id: string }>(
      sql`SELECT id FROM app.episodes WHERE legacy_document_id = ${LEGACY.lisbon}`,
    )
    lisbon = res.rows[0]!.id
  })

  afterAll(async () => {
    await t.close()
  })

  it("lookup needs a user and returns the WordLookup shape", async () => {
    await t.http().post("/v1/words/lookup").send({ word: "running", target: "tr" }).expect(401)
    const res = await t
      .http()
      .post("/v1/words/lookup")
      .set(await t.as(randomUUID(), { anonymous: true }))
      .send({ word: "Running", target: "tr" })
      .expect(200)
    expect(res.body).toEqual({
      word: "running",
      lemma: "runn",
      phonetic: "/fake/",
      audioUrl: "https://audio.example.com/fake.mp3",
      translations: [{ partOfSpeech: "verb", terms: ["tr:Running"] }],
      definitions: [{ partOfSpeech: "verb", definition: "to Running", example: null }],
    })
  })

  it("save upserts by the word (any case), keeps the Leitner state and the first source", async () => {
    const auth = await t.as(randomUUID())
    const source = { episodeId: lisbon, level: "bg", chunkIndex: 1 }
    const first = await t
      .http()
      .post("/v1/words")
      .set(auth)
      .send({
        word: "Welcome",
        meaning: "hoş geldin",
        language: "tr",
        phonetic: "/ˈwɛlkəm/",
        source,
        detail: { pos: "verb" },
      })
      .expect(201)
    expect(first.body).toMatchObject({
      word: "Welcome",
      meaning: "hoş geldin",
      language: "tr",
      phonetic: "/ˈwɛlkəm/",
      audioUrl: null,
      detail: { pos: "verb" },
      box: 1,
      lastReviewedAt: null,
      correctCount: 0,
      incorrectCount: 0,
      source,
    })
    expect(Date.parse(first.body.nextReviewAt)).toBeLessThanOrEqual(Date.now())
    await t.http().post(`/v1/words/${first.body.id}/review`).set(auth).send({ known: true }).expect(200)
    const again = await t
      .http()
      .post("/v1/words")
      .set(auth)
      .send({ word: "welcome", meaning: "hoşgeldiniz", language: "tr", source: { ...source, chunkIndex: 9 } })
      .expect(201)
    expect(again.body).toMatchObject({
      id: first.body.id,
      meaning: "hoşgeldiniz",
      phonetic: "/ˈwɛlkəm/", // not sent: kept
      box: 2, // Leitner state kept
      source, // the first source stays
    })
    await t.http().post("/v1/words").set(auth).send({ word: "", meaning: "x", language: "tr" }).expect(400)
    await t
      .http()
      .post("/v1/words")
      .set(auth)
      .send({
        word: "x",
        meaning: "x",
        language: "tr",
        source: { episodeId: "nope", level: "bg", chunkIndex: 0 },
      })
      .expect(400)
  })

  it("Leitner review: known moves up (1/2/4/8/16 days), unknown goes back to box 1", async () => {
    const auth = await t.as(randomUUID())
    const word = (
      await t
        .http()
        .post("/v1/words")
        .set(auth)
        .send({ word: "tide", meaning: "gelgit", language: "tr" })
        .expect(201)
    ).body
    const days = (iso: string) => Math.round((Date.parse(iso) - Date.now()) / 86_400_000)
    let current = word
    for (const [box, interval] of [
      [2, 2],
      [3, 4],
      [4, 8],
      [5, 16],
      [5, 16],
    ]) {
      current = (
        await t.http().post(`/v1/words/${word.id}/review`).set(auth).send({ known: true }).expect(200)
      ).body
      expect(current.box).toBe(box)
      expect(days(current.nextReviewAt)).toBe(interval)
    }
    const reset = (
      await t.http().post(`/v1/words/${word.id}/review`).set(auth).send({ known: false }).expect(200)
    ).body
    expect(reset).toMatchObject({ box: 1, correctCount: 5, incorrectCount: 1 })
    expect(days(reset.nextReviewAt)).toBe(1)
    await t.http().post(`/v1/words/${randomUUID()}/review`).set(auth).send({ known: true }).expect(404)
    // Another user's word is not found either.
    await t
      .http()
      .post(`/v1/words/${word.id}/review`)
      .set(await t.as(randomUUID()))
      .send({ known: true })
      .expect(404)
  })

  it("list (newest first, box and search filters), stats, due words, delete", async () => {
    const user = randomUUID()
    const auth = await t.as(user)
    for (const [word, meaning] of [
      ["apple", "elma"],
      ["bridge", "köprü"],
      ["castle", "kale"],
    ])
      await t.http().post("/v1/words").set(auth).send({ word, meaning, language: "tr" }).expect(201)
    await t.db.execute(sql`
      UPDATE app.words SET box = 3, next_review_at = now() + interval '3 days' WHERE user_id = ${user} AND word = 'bridge'
    `)
    await t.db.execute(sql`
      UPDATE app.words SET next_review_at = now() - interval '2 days' WHERE user_id = ${user} AND word = 'castle'
    `)
    const all = (await t.http().get("/v1/words").set(auth).expect(200)).body
    expect(all.items.map((w: { word: string }) => w.word)).toEqual(["castle", "bridge", "apple"])
    expect(all).toMatchObject({ total: 3, page: 1, pageSize: 20, hasMore: false })
    const boxed = (await t.http().get("/v1/words?box=3").set(auth).expect(200)).body
    expect(boxed.items.map((w: { word: string }) => w.word)).toEqual(["bridge"])
    const found = (await t.http().get("/v1/words").query({ q: "KÖP" }).set(auth).expect(200)).body
    expect(found.items.map((w: { word: string }) => w.word)).toEqual(["bridge"])
    const paged = (await t.http().get("/v1/words?pageSize=2&page=2").set(auth).expect(200)).body
    expect(paged).toMatchObject({ page: 2, pageSize: 2, total: 3, hasMore: false })
    expect(paged.items).toHaveLength(1)

    expect((await t.http().get("/v1/words/stats").set(auth).expect(200)).body).toEqual({
      total: 3,
      byBox: { "1": 2, "2": 0, "3": 1, "4": 0, "5": 0 },
      due: 2,
    })
    const due = (await t.http().get("/v1/words/review").set(auth).expect(200)).body
    expect(due.map((w: { word: string }) => w.word)).toEqual(["castle", "apple"]) // the longest overdue first

    await t.http().delete(`/v1/words/${due[0].id}`).set(auth).expect(204)
    await t.http().delete(`/v1/words/${due[0].id}`).set(auth).expect(204)
    expect((await t.http().get("/v1/words/stats").set(auth).expect(200)).body.total).toBe(2)
    await t.http().get("/v1/words?box=6").set(auth).expect(400)
  })

  it("translates a transcript once per (episode, level, target), then serves the cache", async () => {
    const auth = await t.as(randomUUID(), { anonymous: true })
    await t
      .http()
      .post("/v1/translate/transcript")
      .send({ episodeId: lisbon, level: "bg", target: "tr" })
      .expect(401)
    const before = t.fakes.translate.calls.length
    const first = await t
      .http()
      .post("/v1/translate/transcript")
      .set(auth)
      .send({ episodeId: LEGACY.lisbon, level: "bg", target: "pt-BR" })
      .expect(200)
    expect(first.body).toEqual({ target: "pt-BR", chunks: ["[pt] Hello there.", "[pt] Welcome back."] })
    const second = await t
      .http()
      .post("/v1/translate/transcript")
      .set(auth)
      .send({ episodeId: lisbon, level: "bg", target: "pt" })
      .expect(200)
    expect(second.body.chunks).toEqual(first.body.chunks)
    expect(t.fakes.translate.calls.length - before).toBe(1) // pt-BR and pt share Google's "pt"
    const cached = await t.db.execute<{ n: number }>(
      sql`SELECT count(*)::int AS n FROM app.translations WHERE episode_id = ${lisbon} AND level = 'bg'`,
    )
    expect(cached.rows[0]!.n).toBe(1)
    // English is the source: no call.
    const english = await t
      .http()
      .post("/v1/translate/transcript")
      .set(auth)
      .send({ episodeId: lisbon, level: "in", target: "en" })
      .expect(200)
    expect(english.body.chunks).toEqual(["Hello there.", "Welcome back."])
    expect(t.fakes.translate.calls.length - before).toBe(1)
    await t
      .http()
      .post("/v1/translate/transcript")
      .set(auth)
      .send({ episodeId: randomUUID(), level: "bg", target: "tr" })
      .expect(404)
  })

  it("translates texts (1–100)", async () => {
    const auth = await t.as(randomUUID())
    const res = await t
      .http()
      .post("/v1/translate/text")
      .set(auth)
      .send({ texts: ["Good morning", "See you"], target: "zh-Hant" })
      .expect(200)
    expect(res.body).toEqual({ target: "zh-Hant", texts: ["[zh-TW] Good morning", "[zh-TW] See you"] })
    await t.http().post("/v1/translate/text").set(auth).send({ texts: [], target: "tr" }).expect(400)
    await t
      .http()
      .post("/v1/translate/text")
      .set(auth)
      .send({ texts: Array.from({ length: 101 }, () => "x"), target: "tr" })
      .expect(400)
    await t
      .http()
      .post("/v1/translate/text")
      .set(auth)
      .send({ texts: ["x"], target: "not a language" })
      .expect(400)
  })

  it("rate-limits translation per user", async () => {
    const auth = await t.as(randomUUID())
    const statuses: number[] = []
    for (let i = 0; i < 62; i++) {
      const res = await t
        .http()
        .post("/v1/translate/text")
        .set(auth)
        .send({ texts: ["hi"], target: "tr" })
      statuses.push(res.status)
    }
    expect(statuses.filter((s) => s === 200)).toHaveLength(60)
    const limited = await t
      .http()
      .post("/v1/translate/text")
      .set(auth)
      .send({ texts: ["hi"], target: "tr" })
      .expect(429)
    expect(limited.headers["retry-after"]).toBeDefined()
    expect(limited.body).toMatchObject({ status: 429, title: "Too Many Requests" })
    // Another user is not affected.
    await t
      .http()
      .post("/v1/translate/text")
      .set(await t.as(randomUUID()))
      .send({ texts: ["hi"], target: "tr" })
      .expect(200)
  })
})
