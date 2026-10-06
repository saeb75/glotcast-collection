import { randomUUID } from "node:crypto"
import { SchedulerRegistry } from "@nestjs/schedule"
import { sql } from "drizzle-orm"
import { CampaignExpander } from "../src/notifications/campaign-expander.service"
import { ContentService } from "../src/notifications/content.service"
import { DispatcherService } from "../src/notifications/dispatcher.service"
import { NotifyCliService } from "../src/notifications/notify-cli.service"
import { PlannerService } from "../src/notifications/planner.service"
import { NotificationsScheduler } from "../src/notifications/scheduler"
import { createTestApp, type TestApp } from "./helpers"

// The scheduler and the campaign endpoints only work with the kill switch on; set before AppModule loads.
vi.hoisted(() => {
  process.env.NOTIFICATIONS_ENABLED = "true"
})

type Auth = { Authorization: string }
type SendDb = {
  id: number
  kind: string
  status: string
  skip_reason: string | null
  local_date: string
  due_at: Date
  language: string
  variant: string | null
  title: string
  body: string
  data: Record<string, unknown>
  daily_slot: boolean
  episode_ids: string[]
  opened_at: Date | null
}

const SETTINGS = {
  quietHours: { from: "22:00", to: "08:00" },
  reminder: { enabled: true, weeklyRecap: true, minDue: 5 },
  streakSaver: { enabled: true, time: "21:00", minStreak: 2 },
  learning: { enabled: true, time: "18:00" },
  newEpisodes: { enabled: true, debounceMin: 15, freshHours: 36 },
}

const at = (iso: string) => new Date(iso)
const minutes = (d: Date, n: number) => new Date(d.getTime() + n * 60_000)

describe("Notifications (e2e)", () => {
  let t: TestApp
  let planner: PlannerService
  let content: ContentService
  let campaigns: CampaignExpander
  let dispatcher: DispatcherService
  let kicks: ReturnType<typeof vi.spyOn>
  /** An episode for listening rows. */
  let episodeId: string
  const ADMIN = randomUUID()
  const asAdmin = () => t.as(ADMIN, { email: "push-admin@glotcast.test", admin: true })

  /** A user as the app sets it up: provisioned, then the device and profile fields PATCHed. */
  async function user(
    fields: Record<string, unknown> = {},
    opts: { anonymous?: boolean; email?: string } = {},
  ) {
    const id = randomUUID()
    const auth = await t.as(id, opts)
    await t.http().get("/v1/me").set(auth).expect(200)
    if (Object.keys(fields).length) await t.http().patch("/v1/me").set(auth).send(fields).expect(200)
    return { id, auth }
  }

  /** A user's send rows, oldest first (timestamps parsed: drizzle's execute returns them as text). */
  const sends = async (userId: string) =>
    (
      await t.db.execute<
        Omit<SendDb, "due_at" | "opened_at"> & { due_at: string; opened_at: string | null }
      >(sql`
        SELECT id, kind, status, skip_reason, local_date::text AS local_date, due_at, language, variant, title, body,
               data, daily_slot, episode_ids, opened_at
        FROM app.notification_sends WHERE user_id = ${userId} ORDER BY id`)
    ).rows.map((r) => ({
      ...r,
      due_at: new Date(r.due_at),
      opened_at: r.opened_at === null ? null : new Date(r.opened_at),
    }))

  /** One scheduler run over (from, now] for some users, without the lease (time travel). */
  async function tick(now: Date, from: Date, userIds: string[]) {
    await planner.plan({ from, to: now, now, userIds })
    await content.plan({ now, userIds })
    await dispatcher.run({ now, userIds })
  }

  /** 5-minute ticks from `start` to `end`; returns, per user, the tick times their pushes went out. */
  async function ticks(start: Date, end: Date, userIds: string[]) {
    const deliveries = new Map<string, Date[]>(userIds.map((id) => [id, []]))
    for (let now = minutes(start, 5); now <= end; now = minutes(now, 5)) {
      const before = t.fakes.onesignal.sent.length
      await tick(now, minutes(now, -5), userIds)
      for (const m of t.fakes.onesignal.sent.slice(before))
        for (const id of m.externalIds) deliveries.get(id)?.push(now)
    }
    return deliveries
  }

  async function setTimes(userId: string, days: Record<string, number>) {
    for (const [date, seconds] of Object.entries(days))
      await t.db.execute(sql`
        INSERT INTO app.listening_days (user_id, date, seconds) VALUES (${userId}, ${date}, ${seconds})
        ON CONFLICT (user_id, date) DO UPDATE SET seconds = excluded.seconds`)
  }

  async function podcast(name: string) {
    const res = await t
      .http()
      .post("/v1/admin/podcasts")
      .set(await asAdmin())
      .send({ name, published: true })
      .expect(201)
    // Live long ago, whatever day the suite runs on.
    await t.db.execute(
      sql`UPDATE app.podcasts SET published_at = '2026-01-01T00:00:00Z' WHERE id = ${res.body.id}`,
    )
    return res.body.id as string
  }

  beforeAll(async () => {
    t = await createTestApp()
    // Ticks are driven by the tests (with their own clock), never by the wall-clock cron.
    t.app.get(SchedulerRegistry).deleteCronJob("notifications")
    planner = t.app.get(PlannerService)
    content = t.app.get(ContentService)
    campaigns = t.app.get(CampaignExpander)
    dispatcher = t.app.get(DispatcherService)
    // A publish or a campaign sent now asks for a tick soon: recorded, never run on the wall clock here.
    kicks = vi.spyOn(t.app.get(NotificationsScheduler), "kick").mockImplementation(() => undefined)
    const show = await podcast("Listening Show")
    const ep = await t
      .http()
      .post("/v1/admin/episodes")
      .set(await asAdmin())
      .send({ podcastId: show, title: "Something to hear", publishedAt: "2026-01-02T00:00:00Z" })
      .expect(201)
    episodeId = ep.body.id
  })

  afterAll(async () => {
    await t.close()
  })

  it("automations start off; the admin switches them on (slot times outside the quiet hours)", async () => {
    const auth = await asAdmin()
    await t
      .http()
      .get("/v1/admin/notifications/automations")
      .set(await t.as(randomUUID()))
      .expect(403)
    const initial = await t.http().get("/v1/admin/notifications/automations").set(auth).expect(200)
    expect(initial.body.settings).toEqual({
      ...SETTINGS,
      reminder: { ...SETTINGS.reminder, enabled: false },
      streakSaver: { ...SETTINGS.streakSaver, enabled: false },
      learning: { ...SETTINGS.learning, enabled: false },
      newEpisodes: { ...SETTINGS.newEpisodes, enabled: false },
    })
    expect(initial.body.status).toMatchObject({ configured: true, enabled: true })
    expect(initial.body.last7Days.map((d: { kind: string }) => d.kind)).toEqual([
      "reminder",
      "streak_saver",
      "learning",
      "new_episodes",
      "campaign",
    ])
    const bad = { ...SETTINGS, streakSaver: { ...SETTINGS.streakSaver, time: "23:00" } }
    await t.http().put("/v1/admin/notifications/automations").set(auth).send(bad).expect(400)
    const saved = await t
      .http()
      .put("/v1/admin/notifications/automations")
      .set(auth)
      .send(SETTINGS)
      .expect(200)
    expect(saved.body.settings).toEqual(SETTINGS)
    const status = await t.http().get("/v1/admin/notifications/status").set(auth).expect(200)
    expect(status.body).toEqual({
      configured: true,
      enabled: true,
      lastTickAt: null,
      queued: expect.any(Number),
    })
  })

  it("PATCH /me: device fields, an unknown time zone is a 400, only profile fields mark the profile as set", async () => {
    const { id, auth } = await user()
    for (const bad of [{ timezone: "Mars/Olympus" }, { timezone: "" }, { pushEnabled: "yes" }])
      await t.http().patch("/v1/me").set(auth).send(bad).expect(400)
    const res = await t
      .http()
      .patch("/v1/me")
      .set(auth)
      .send({ timezone: "Europe/Istanbul", pushEnabled: true, notifyNews: false, proActive: true })
      .expect(200)
    expect(res.body).toMatchObject({
      timezone: "Europe/Istanbul",
      pushEnabled: true,
      notifyReminders: true,
      notifyLearning: true,
      notifyNewEpisodes: true,
      notifyNews: false,
      proActive: true,
    })
    const row = async () =>
      (
        await t.db.execute<{ profile: boolean; push: boolean; pro: boolean }>(sql`
          SELECT profile_set_at IS NOT NULL AS profile, push_updated_at IS NOT NULL AS push,
                 pro_active_at IS NOT NULL AS pro
          FROM app.users WHERE id = ${id}`)
      ).rows[0]!
    expect(await row()).toEqual({ profile: false, push: true, pro: true })
    await t.http().patch("/v1/me").set(auth).send({ timezone: null, uiLanguage: "tr" }).expect(200)
    expect((await row()).profile).toBe(false) // the app syncs its display language: a device field
    await t.http().patch("/v1/me").set(auth).send({ level: "in" }).expect(200)
    expect((await row()).profile).toBe(true)
  })

  it("Tokyo, New York and Istanbul get exactly one reminder each, at their local time, in their language", async () => {
    const tokyo = await user({
      timezone: "Asia/Tokyo",
      reminderTime: "09:00",
      uiLanguage: "ja",
      pushEnabled: true,
    })
    const ny = await user({
      timezone: "America/New_York",
      reminderTime: "08:30",
      uiLanguage: "en",
      pushEnabled: true,
    })
    const ist = await user({
      timezone: "Europe/Istanbul",
      reminderTime: "20:00",
      uiLanguage: "tr",
      pushEnabled: true,
    })
    const off = await user({ timezone: "Europe/Istanbul", reminderTime: "20:00", pushEnabled: false })
    const ids = [tokyo.id, ny.id, ist.id, off.id]

    const start = at("2026-10-06T22:00:00Z")
    const end = at("2026-10-07T22:00:00Z")
    const first = await ticks(start, end, ids)
    expect(first.get(tokyo.id)).toEqual([at("2026-10-07T00:00:00Z")]) // 09:00 JST
    expect(first.get(ny.id)).toEqual([at("2026-10-07T12:30:00Z")]) // 08:30 EDT
    expect(first.get(ist.id)).toEqual([at("2026-10-07T17:00:00Z")]) // 20:00 TRT
    expect(first.get(off.id)).toEqual([])

    // The same day again: nothing new (one automation of a kind per user and local day).
    const again = await ticks(start, end, ids)
    for (const id of ids) expect(again.get(id)).toEqual([])

    const [reminder] = (await sends(tokyo.id)).filter((s) => s.kind === "reminder")
    expect(reminder).toMatchObject({
      status: "sent",
      local_date: "2026-10-07",
      language: "ja",
      daily_slot: true,
      variant: expect.stringMatching(/^generic\.\d$/),
      data: { t: "home", k: "habit", ref: "reminder" },
    })
    const push = t.fakes.onesignal.to(tokyo.id)[0]!
    expect(push).toMatchObject({ title: reminder!.title, body: reminder!.body, group: "habit" })
    expect(push.data).toEqual({ t: "home", k: "habit", ref: "reminder" })
    expect(t.fakes.onesignal.to(ist.id)[0]!.title).not.toBe(push.title) // Turkish, not Japanese
    // The evening streak saver was considered: the reminder already took the day's slot.
    expect((await sends(ist.id)).find((s) => s.kind === "streak_saver")).toMatchObject({
      status: "skipped",
      skip_reason: "daily_cap",
      daily_slot: false,
    })
  })

  it("DST: a reminder in the spring-forward gap and one in the repeated hour each fire once", async () => {
    const gap = await user({ timezone: "America/New_York", reminderTime: "02:30", pushEnabled: true })
    const spring = await ticks(at("2026-03-08T04:00:00Z"), at("2026-03-09T06:00:00Z"), [gap.id])
    // 02:30 doesn't exist on 2026-03-08: Postgres reads it as 03:30 EDT.
    expect(spring.get(gap.id)).toEqual([at("2026-03-08T07:30:00Z")])

    const twice = await user({ timezone: "America/New_York", reminderTime: "01:30", pushEnabled: true })
    const fall = await ticks(at("2026-11-01T04:00:00Z"), at("2026-11-02T04:00:00Z"), [twice.id])
    // 01:30 happens twice on 2026-11-01: one push (Postgres picks 01:30 EST).
    expect(fall.get(twice.id)).toEqual([at("2026-11-01T06:30:00Z")])
  })

  it("the reminder skips a met goal (or nudges words due) and a user listening right now", async () => {
    const day = "2026-10-14"
    const now = at(`${day}T10:00:00Z`)
    const goal = await user({ timezone: "UTC", reminderTime: "10:00", pushEnabled: true, dailyGoalMin: 5 })
    const words = await user({ timezone: "UTC", reminderTime: "10:00", pushEnabled: true, dailyGoalMin: 5 })
    const active = await user({ timezone: "UTC", reminderTime: "10:00", pushEnabled: true })
    await setTimes(goal.id, { [day]: 400 })
    await setTimes(words.id, { [day]: 400 })
    for (const w of ["apple", "brave", "cloud", "dream", "eager", "fable"])
      await t.db.execute(sql`
        INSERT INTO app.words (user_id, word, meaning, language, next_review_at)
        VALUES (${words.id}, ${w}, ${w}, 'tr', ${"2026-10-13T00:00:00Z"})`)
    await t.db.execute(sql`
      INSERT INTO app.listening_progress (user_id, episode_id, level, position_sec, duration_sec, updated_at)
      VALUES (${active.id}, ${episodeId}, 'bg', 10, 600, ${minutes(now, -10).toISOString()})`)
    await tick(now, minutes(now, -5), [goal.id, words.id, active.id])

    expect((await sends(goal.id))[0]).toMatchObject({
      kind: "reminder",
      status: "skipped",
      skip_reason: "goal_met",
    })
    expect((await sends(words.id))[0]).toMatchObject({
      kind: "reminder",
      status: "sent",
      variant: expect.stringMatching(/^wordsDue\./),
      data: { t: "review", k: "habit", ref: "reminder" },
    })
    expect((await sends(words.id))[0]!.body).toContain("6 words")
    expect((await sends(active.id))[0]).toMatchObject({ status: "skipped", skip_reason: "active_now" })
    expect(t.fakes.onesignal.to(goal.id)).toEqual([])
  })

  it("caps: two pushes a day at most, one daily-slot push", async () => {
    const day = "2026-10-15"
    const busy = await user({ timezone: "UTC", reminderTime: "10:00", pushEnabled: true })
    for (const [kind, grp] of [
      ["new_episodes", "content"],
      ["test", "test"],
    ] as const)
      await t.db.execute(sql`
        INSERT INTO app.notification_sends (user_id, kind, grp, local_date, due_at, status, language, title, body, data,
          payload_hash)
        VALUES (${busy.id}, ${kind}, ${grp}, ${day}, ${`${day}T08:00:00Z`}, 'sent', 'en', 't', 'b', '{}', 'h')`)
    // A test push doesn't count: one push so far, the reminder goes out.
    await tick(at(`${day}T10:00:00Z`), at(`${day}T09:55:00Z`), [busy.id])
    expect((await sends(busy.id)).find((s) => s.kind === "reminder")).toMatchObject({ status: "sent" })

    const capped = await user({ timezone: "UTC", reminderTime: "11:00", pushEnabled: true })
    for (const kind of ["new_episodes", "campaign"])
      await t.db.execute(sql`
        INSERT INTO app.notification_sends (user_id, kind, grp, local_date, due_at, status, language, title, body, data,
          payload_hash)
        VALUES (${capped.id}, ${kind}, ${kind === "campaign" ? "campaign" : "content"}, ${day},
                ${`${day}T08:00:00Z`}, 'sent', 'en', 't', 'b', '{}', 'h')`)
    await tick(at(`${day}T11:00:00Z`), at(`${day}T10:55:00Z`), [capped.id])
    expect((await sends(capped.id)).find((s) => s.kind === "reminder")).toMatchObject({
      status: "skipped",
      skip_reason: "cap",
    })
  })

  it("streak saver: only with a streak, nothing listened today, and no daily push sent yet", async () => {
    const day = "2026-10-16"
    const streak = { "2026-10-13": 120, "2026-10-14": 90, "2026-10-15": 300 }
    const saver = await user({ timezone: "UTC", pushEnabled: true, uiLanguage: "de" })
    const listened = await user({ timezone: "UTC", pushEnabled: true })
    const none = await user({ timezone: "UTC", pushEnabled: true })
    const reminded = await user({ timezone: "UTC", pushEnabled: true, reminderTime: "08:00" })
    await setTimes(saver.id, streak)
    await setTimes(listened.id, { ...streak, [day]: 200 })
    await setTimes(reminded.id, streak)
    const ids = [saver.id, listened.id, none.id, reminded.id]
    await ticks(at(`${day}T07:00:00Z`), at(`${day}T21:30:00Z`), ids)

    const kinds = async (id: string) =>
      (await sends(id)).map((s) => [s.kind, s.status, s.skip_reason ?? s.variant])
    expect(await kinds(saver.id)).toEqual([
      ["learning", "skipped", "nothing_to_send"],
      ["streak_saver", "sent", expect.stringMatching(/^streakSaver\./)],
    ])
    expect((await sends(saver.id))[1]!.body).toMatch(/3 Tage|3 Tagen/)
    expect(await kinds(listened.id)).toEqual([
      ["learning", "skipped", "nothing_to_send"],
      ["streak_saver", "skipped", "listened_today"],
    ])
    expect(await kinds(none.id)).toEqual([
      ["learning", "skipped", "nothing_to_send"],
      ["streak_saver", "skipped", "no_streak"],
    ])
    // Its 08:00 reminder (streak copy) took the day's slot.
    expect(await kinds(reminded.id)).toEqual([
      ["reminder", "sent", expect.stringMatching(/^streak\./)],
      ["streak_saver", "skipped", "daily_cap"],
    ])
  })

  it("the heartbeat that makes today a streak day reports a milestone", async () => {
    const { id, auth } = await user({ timezone: "UTC" })
    await setTimes(id, {
      "2026-10-01": 61,
      "2026-10-02": 61,
      "2026-10-03": 61,
      "2026-10-04": 61,
      "2026-10-05": 61,
      "2026-10-06": 61,
    })
    const beat = (listenedSec: number) => ({
      episodeId,
      level: "bg",
      positionSec: 10,
      durationSec: 600,
      listenedSec,
      date: "2026-10-07",
    })
    const first = await t.http().post("/v1/me/listening").set(auth).send(beat(40)).expect(200)
    expect(first.body.milestone).toBeNull()
    const second = await t.http().post("/v1/me/listening").set(auth).send(beat(30)).expect(200)
    expect(second.body).toMatchObject({ today: { seconds: 70 }, milestone: 7 })
    const third = await t.http().post("/v1/me/listening").set(auth).send(beat(30)).expect(200)
    expect(third.body.milestone).toBeNull()
  })

  it("a scheduled episode → one bundled push to followers; no back catalog, no re-notify after unpublish", async () => {
    const admin = await asAdmin()
    const show = await podcast("Fresh Show")
    const t0 = at("2030-10-21T10:00:00Z")
    const create = (title: string, publishedAt: string, notifyFollowers?: boolean) =>
      t
        .http()
        .post("/v1/admin/episodes")
        .set(admin)
        .send({
          podcastId: show,
          title,
          publishedAt,
          ...(notifyFollowers === undefined ? {} : { notifyFollowers }),
        })
        .expect(201)
    const a = await create("Part one", t0.toISOString())
    const b = await create("Part two", t0.toISOString())
    const quiet = await create("Quiet one", t0.toISOString(), false)
    const old = await create("Back catalog", "2026-09-01T00:00:00Z")
    expect(a.body).toMatchObject({ status: "scheduled", notifyFollowers: true, followersNotifiedAt: null })
    expect(quiet.body.notifyFollowers).toBe(false)

    const follower = await user({ timezone: "Europe/Istanbul", pushEnabled: true, uiLanguage: "en" })
    const started = await user({ timezone: "Europe/Istanbul", pushEnabled: true })
    const optedOut = await user({ timezone: "Europe/Istanbul", pushEnabled: true, notifyNewEpisodes: false })
    for (const u of [follower, started, optedOut])
      await t.http().put(`/v1/me/follows/${show}`).set(u.auth).expect(204)
    await t.db.execute(sql`
      INSERT INTO app.listening_progress (user_id, episode_id, level, position_sec, duration_sec, updated_at)
      VALUES (${started.id}, ${a.body.id}, 'bg', 5, 600, ${t0.toISOString()}),
             (${started.id}, ${b.body.id}, 'bg', 5, 600, ${t0.toISOString()})`)
    const ids = [follower.id, started.id, optedOut.id]

    expect(
      (await content.markLive(minutes(t0, -1))).filter((id) => [a.body.id, b.body.id].includes(id)),
    ).toEqual([])
    const live = await content.markLive(minutes(t0, 1))
    expect(live).toEqual(expect.arrayContaining([a.body.id, b.body.id]))
    expect(live).not.toContain(quiet.body.id)
    expect(live).not.toContain(old.body.id)
    expect(kicks).toHaveBeenCalled() // creating a live episode asks for a tick
    const marked = await t.http().get(`/v1/admin/episodes/${a.body.id}`).set(admin).expect(200)
    expect(marked.body.followersNotifiedAt).toBe(minutes(t0, 1).toISOString())

    await tick(minutes(t0, 10), minutes(t0, 5), ids) // still within the debounce
    expect(t.fakes.onesignal.to(follower.id)).toEqual([])
    await tick(minutes(t0, 20), minutes(t0, 15), ids)
    const pushes = t.fakes.onesignal.to(follower.id)
    expect(pushes).toHaveLength(1)
    expect(pushes[0]).toMatchObject({
      group: "content",
      data: { t: "podcast", id: show, k: "content", ref: "new_episodes" },
      title: expect.stringContaining("Fresh Show"),
      body: expect.stringContaining("2 new episodes"),
    })
    expect((await sends(follower.id))[0]!.episode_ids.sort()).toEqual([a.body.id, b.body.id].sort())
    expect(t.fakes.onesignal.to(started.id)).toEqual([])
    expect(t.fakes.onesignal.to(optedOut.id)).toEqual([])

    // Unpublished and published again: never a second push.
    await t.http().post(`/v1/admin/episodes/${a.body.id}/unpublish`).set(admin).expect(200)
    const again = await t
      .http()
      .post(`/v1/admin/episodes/${a.body.id}/publish`)
      .set(admin)
      .send({ notifyFollowers: true })
      .expect(200)
    expect(again.body.followersNotifiedAt).toBe(minutes(t0, 1).toISOString())
    await content.markLive(at("2030-10-22T09:00:00Z"))
    await tick(at("2030-10-22T09:00:00Z"), at("2030-10-22T08:55:00Z"), ids)
    expect(t.fakes.onesignal.to(follower.id)).toHaveLength(1)

    // …publish can switch the followers' push off.
    const off = await t
      .http()
      .post(`/v1/admin/episodes/${old.body.id}/publish`)
      .set(admin)
      .send({ notifyFollowers: false })
      .expect(200)
    expect(off.body.notifyFollowers).toBe(false)
  })

  describe("campaigns", () => {
    let audiencePodcast: string
    let en1: { id: string; auth: Auth }
    let en2: { id: string; auth: Auth }
    let tr1: { id: string; auth: Auth }
    let de1: { id: string; auth: Auth }
    let noNews: { id: string; auth: Auth }
    let noPush: { id: string; auth: Auth }
    let ids: string[]
    const input = {
      name: "Autumn offer",
      sourceLanguage: "en",
      messages: {
        en: { title: "Autumn offer", body: "Pro is 50% off this week." },
        tr: { title: "Sonbahar fırsatı", body: "Pro bu hafta %50 indirimli." },
      },
      link: { type: "paywall" },
    }

    beforeAll(async () => {
      audiencePodcast = await podcast("Campaign Audience")
      const follower = async (fields: Record<string, unknown>) => {
        const u = await user({ pushEnabled: true, ...fields })
        await t.http().put(`/v1/me/follows/${audiencePodcast}`).set(u.auth).expect(204)
        return u
      }
      en1 = await follower({ uiLanguage: "en", timezone: "Europe/Istanbul" })
      en2 = await follower({ uiLanguage: "en-GB", timezone: "Pacific/Auckland" })
      tr1 = await follower({ uiLanguage: "tr", timezone: "Europe/Istanbul", proActive: true })
      de1 = await follower({ uiLanguage: "de", timezone: "Pacific/Kiritimati" })
      noNews = await follower({ uiLanguage: "en", notifyNews: false })
      noPush = await follower({ uiLanguage: "en", pushEnabled: false })
      ids = [en1.id, en2.id, tr1.id, de1.id, noNews.id, noPush.id]
    })

    const create = async (over: Record<string, unknown> = {}) =>
      (
        await t
          .http()
          .post("/v1/admin/notifications/campaigns")
          .set(await asAdmin())
          .send({ ...input, audience: { segment: "all", podcastIds: [audiencePodcast] }, ...over })
          .expect(201)
      ).body as { id: string; status: string }

    it("CRUD: drafts are editable, sent ones are not", async () => {
      const admin = await asAdmin()
      const draft = await create()
      expect(draft).toMatchObject({
        status: "draft",
        sourceLanguage: "en",
        respectQuietHours: true,
        delivery: null,
        recipients: null,
        imageUrl: null,
        createdBy: { id: ADMIN, email: "push-admin@glotcast.test" },
      })
      await t
        .http()
        .post("/v1/admin/notifications/campaigns")
        .set(admin)
        .send({ ...input, audience: { segment: "all" }, link: { type: "episode" } })
        .expect(400)
      const patched = await t
        .http()
        .patch(`/v1/admin/notifications/campaigns/${draft.id}`)
        .set(admin)
        .send({ name: "Autumn offer (v2)", imageUrl: "https://cdn.example.com/autumn.jpg" })
        .expect(200)
      expect(patched.body).toMatchObject({
        name: "Autumn offer (v2)",
        imageUrl: "https://cdn.example.com/autumn.jpg",
      })
      const list = await t.http().get("/v1/admin/notifications/campaigns?status=draft").set(admin).expect(200)
      expect(list.body.items.map((c: { id: string }) => c.id)).toContain(draft.id)
      await t.http().delete(`/v1/admin/notifications/campaigns/${draft.id}`).set(admin).expect(204)
      await t.http().get(`/v1/admin/notifications/campaigns/${draft.id}`).set(admin).expect(404)
    })

    it("translates from the source language into all 16", async () => {
      const before = t.fakes.translate.calls.length
      const res = await t
        .http()
        .post("/v1/admin/notifications/translate")
        .set(await asAdmin())
        .send({ source: "tr", title: "Sonbahar fırsatı", body: "Pro bu hafta %50 indirimli." })
        .expect(200)
      expect(Object.keys(res.body.messages).sort()).toEqual(
        [
          "ar",
          "de",
          "en",
          "es",
          "fr",
          "hi",
          "id",
          "it",
          "ja",
          "ko",
          "pl",
          "pt",
          "ru",
          "tr",
          "vi",
          "zh",
        ].sort(),
      )
      expect(res.body.messages.tr).toEqual({ title: "Sonbahar fırsatı", body: "Pro bu hafta %50 indirimli." })
      expect(res.body.messages.de).toEqual({
        title: "[de] Sonbahar fırsatı",
        body: "[de] Pro bu hafta %50 indirimli.",
      })
      expect(res.body.messages.zh.title).toBe("[zh-CN] Sonbahar fırsatı")
      const calls = t.fakes.translate.calls.slice(before)
      expect(calls).toHaveLength(15)
      expect(new Set(calls.map((c) => c.source))).toEqual(new Set(["tr"]))
    })

    it("reach: who matches, who can be reached, per language", async () => {
      const admin = await asAdmin()
      const all = await t
        .http()
        .post("/v1/admin/notifications/reach")
        .set(admin)
        .send({ audience: { segment: "all", podcastIds: [audiencePodcast] } })
        .expect(200)
      expect(all.body).toEqual({
        matched: 6,
        reachable: 4,
        byLanguage: [
          { language: "en", reachable: 2 },
          { language: "de", reachable: 1 },
          { language: "tr", reachable: 1 },
        ],
      })
      const pro = await t
        .http()
        .post("/v1/admin/notifications/reach")
        .set(admin)
        .send({ audience: { segment: "pro", podcastIds: [audiencePodcast], languages: ["tr", "en"] } })
        .expect(200)
      expect(pro.body).toEqual({ matched: 1, reachable: 1, byLanguage: [{ language: "tr", reachable: 1 }] })
    })

    it("test send: to the caller or a user, in their language; 409 without a push subscription", async () => {
      const admin = await asAdmin()
      const campaign = await create()
      await t.http().get("/v1/me").set(admin).expect(200) // the admin's own app user
      const mine = await t
        .http()
        .post(`/v1/admin/notifications/campaigns/${campaign.id}/test`)
        .set(admin)
        .send({})
        .expect(200)
      expect(mine.body.onesignalId).toMatch(/^os-/)
      const toTr = await t
        .http()
        .post(`/v1/admin/notifications/campaigns/${campaign.id}/test`)
        .set(admin)
        .send({ userId: tr1.id })
        .expect(200)
      expect(toTr.body.onesignalId).toMatch(/^os-/)
      const last = t.fakes.onesignal.sent[t.fakes.onesignal.sent.length - 1]!
      expect(last).toMatchObject({
        externalIds: [tr1.id],
        title: "Sonbahar fırsatı",
        group: "test",
        data: { t: "paywall", k: "test", ref: `c:${campaign.id}` },
      })
      t.fakes.onesignal.invalid.add(noPush.id)
      const err = await t
        .http()
        .post(`/v1/admin/notifications/campaigns/${campaign.id}/test`)
        .set(admin)
        .send({ userId: noPush.id, language: "de" })
        .expect(409)
      expect(err.body.detail).toBe("no_subscription")
      expect((await sends(noPush.id)).at(-1)).toMatchObject({
        kind: "test",
        status: "unreachable",
        language: "en",
      })
      // A test push doesn't make the campaign sent, and the app reports its tap.
      const opened = (await sends(tr1.id)).at(-1)!
      expect(opened).toMatchObject({ kind: "test", status: "sent", opened_at: null })
      await t
        .http()
        .post("/v1/me/notifications/opened")
        .set(tr1.auth)
        .send({ ref: `c:${campaign.id}` })
        .expect(204)
      await t.http().post("/v1/me/notifications/opened").set(tr1.auth).send({ ref: "nothing" }).expect(204)
      expect((await sends(tr1.id)).at(-1)!.opened_at).toBeInstanceOf(Date)
    })

    it("send now: one OneSignal batch per language, the opted-out left out, stats", async () => {
      const admin = await asAdmin()
      const campaign = await create({ respectQuietHours: false })
      const queued = await t
        .http()
        .post(`/v1/admin/notifications/campaigns/${campaign.id}/send`)
        .set(admin)
        .send({ delivery: { mode: "now" } })
        .expect(200)
      expect(queued.body).toMatchObject({ status: "scheduled", delivery: { mode: "now" } })
      expect(kicks).toHaveBeenCalled()
      await t
        .http()
        .patch(`/v1/admin/notifications/campaigns/${campaign.id}`)
        .set(admin)
        .send({ name: "x" })
        .expect(409)
      await t.http().delete(`/v1/admin/notifications/campaigns/${campaign.id}`).set(admin).expect(409)

      const now = minutes(new Date(), 1)
      const before = t.fakes.onesignal.sent.length
      expect(await campaigns.expandDue({ now, campaignIds: [campaign.id], userIds: ids })).toEqual([
        { campaignId: campaign.id, queued: 4, skipped: 0 },
      ])
      await dispatcher.run({ now, userIds: ids })
      await campaigns.finalize(now)
      const batches = t.fakes.onesignal.sent.slice(before)
      expect(batches.map((b) => [b.title, [...b.externalIds].sort()]).sort()).toEqual(
        [
          ["Autumn offer", [en1.id, en2.id, de1.id].sort()], // de falls back to en
          ["Sonbahar fırsatı", [tr1.id]],
        ].sort(),
      )
      expect(batches[0]).toMatchObject({ group: "campaign", data: { t: "paywall", k: "campaign" } })

      const sent = await t
        .http()
        .get(`/v1/admin/notifications/campaigns/${campaign.id}`)
        .set(admin)
        .expect(200)
      expect(sent.body).toMatchObject({ status: "sent", recipients: 4, sentAt: expect.any(String) })
      const stats = await t
        .http()
        .get(`/v1/admin/notifications/campaigns/${campaign.id}/stats?refresh=1`)
        .set(admin)
        .expect(200)
      expect(stats.body).toEqual({
        recipients: 4,
        queued: 0,
        sent: 4,
        failed: 0,
        unreachable: 0,
        skipped: 0,
        opened: 0,
        onesignal: { successful: 6, failed: 2, errored: 0, converted: 4, received: 6 },
        byLanguage: [
          { language: "en", recipients: 3, opened: 0 },
          { language: "tr", recipients: 1, opened: 0 },
        ],
        refreshedAt: expect.any(String),
      })
      const log = await t
        .http()
        .get(`/v1/admin/notifications/sends?campaignId=${campaign.id}&limit=2`)
        .set(admin)
        .expect(200)
      expect(log.body.entries).toHaveLength(2)
      expect(log.body.nextBefore).toBe(log.body.entries[1].id)
      expect(log.body.entries[0]).toMatchObject({
        kind: "campaign",
        status: "sent",
        campaignId: campaign.id,
        link: { type: "paywall" },
        user: { id: expect.any(String), isAnonymous: false },
      })
      // A campaign counts toward the day's cap.
      expect((await sends(de1.id)).find((s) => s.kind === "campaign")).toMatchObject({ status: "sent" })
    })

    it("send at a time: users in quiet hours get it at 08:00 their time; cancel stops the rest", async () => {
      const admin = await asAdmin()
      const campaign = await create()
      const sendAt = "2026-12-01T12:00:00Z" // 15:00 Istanbul, 01:00 Auckland, 02:00 Kiritimati
      const queued = await t
        .http()
        .post(`/v1/admin/notifications/campaigns/${campaign.id}/send`)
        .set(admin)
        .send({ delivery: { mode: "at", sendAt } })
        .expect(200)
      expect(queued.body.status).toBe("scheduled")
      expect(
        await campaigns.expandDue({ now: at("2026-12-01T11:59:00Z"), campaignIds: [campaign.id] }),
      ).toEqual([])
      await campaigns.expandDue({ now: at(sendAt), campaignIds: [campaign.id], userIds: ids })
      const due = async (id: string) =>
        (await sends(id)).find((s) => s.kind === "campaign" && s.due_at >= at("2026-12-01T00:00:00Z"))?.due_at
      expect(await due(en1.id)).toEqual(at(sendAt))
      expect(await due(tr1.id)).toEqual(at(sendAt))
      expect(await due(en2.id)).toEqual(at("2026-12-01T19:00:00Z")) // 08:00 NZDT
      expect(await due(de1.id)).toEqual(at("2026-12-01T18:00:00Z")) // 08:00 at UTC+14

      const before = t.fakes.onesignal.sent.length
      await dispatcher.run({ now: at(sendAt), userIds: ids })
      expect(
        t.fakes.onesignal.sent
          .slice(before)
          .flatMap((b) => b.externalIds)
          .sort(),
      ).toEqual([en1.id, tr1.id].sort())
      await dispatcher.run({ now: at("2026-12-01T18:00:00Z"), userIds: ids })
      expect(t.fakes.onesignal.to(de1.id).at(-1)!.title).toBe("Autumn offer")

      const canceled = await t
        .http()
        .post(`/v1/admin/notifications/campaigns/${campaign.id}/cancel`)
        .set(admin)
        .expect(200)
      expect(canceled.body.status).toBe("canceled")
      expect((await sends(en2.id)).find((s) => s.kind === "campaign" && s.status === "canceled")).toBeTruthy()
      await t.http().post(`/v1/admin/notifications/campaigns/${campaign.id}/cancel`).set(admin).expect(409)
      await t.http().delete(`/v1/admin/notifications/campaigns/${campaign.id}`).set(admin).expect(204)
    })

    it("send at each user's local time: skips those for whom it passed over an hour ago", async () => {
      const admin = await asAdmin()
      const campaign = await create()
      await t
        .http()
        .post(`/v1/admin/notifications/campaigns/${campaign.id}/send`)
        .set(admin)
        .send({ delivery: { mode: "local", date: "2026-12-05", time: "09:00" } })
        .expect(200)
      // Expanded once the first time zone (UTC+14) reaches it: 2026-12-04T19:00Z. Here 1.5 h after Auckland's 09:00.
      expect(
        await campaigns.expandDue({ now: at("2026-12-04T18:59:00Z"), campaignIds: [campaign.id] }),
      ).toEqual([])
      const [expanded] = await campaigns.expandDue({
        now: at("2026-12-04T21:30:00Z"),
        campaignIds: [campaign.id],
        userIds: ids,
      })
      expect(expanded).toEqual({ campaignId: campaign.id, queued: 2, skipped: 2 })
      const row = async (id: string) => (await sends(id)).find((s) => s.local_date === "2026-12-05")
      expect(await row(en1.id)).toMatchObject({ status: "queued", due_at: at("2026-12-05T06:00:00Z") })
      expect(await row(en2.id)).toMatchObject({ status: "skipped", skip_reason: "time_passed" })
      expect(await row(de1.id)).toMatchObject({ status: "skipped", skip_reason: "time_passed" })
    })

    it("send needs a source-language message; anonymous callers and plain users are refused", async () => {
      const admin = await asAdmin()
      const campaign = await create({ sourceLanguage: "tr", messages: { en: input.messages.en } })
      await t
        .http()
        .post(`/v1/admin/notifications/campaigns/${campaign.id}/send`)
        .set(admin)
        .send({ delivery: { mode: "now" } })
        .expect(400)
      await t
        .http()
        .post(`/v1/admin/notifications/campaigns/${campaign.id}/send`)
        .set(await t.as(randomUUID()))
        .send({ delivery: { mode: "now" } })
        .expect(403)
    })
  })

  it("claim-guest carries the guest's time zone, push opt-in, onboarding and today's sends over", async () => {
    const guest = await user(
      { timezone: "Asia/Tokyo", pushEnabled: true, level: "ad", dailyGoalMin: 20 },
      { anonymous: true },
    )
    await t.db.execute(sql`
      INSERT INTO app.notification_sends (user_id, kind, grp, daily_slot, local_date, due_at, status, language, title,
        body, data, payload_hash)
      VALUES (${guest.id}, 'reminder', 'habit', true, (now() AT TIME ZONE 'Asia/Tokyo')::date, now(), 'sent', 'en',
        't', 'b', '{"t":"home","k":"habit","ref":"reminder"}', 'h')`)
    // Only device fields synced by the app: the account still takes the guest's onboarding answers.
    const account = await user({ uiLanguage: "pt-BR", notifyNews: false }, { email: "claimer@example.com" })
    await t
      .http()
      .post("/v1/me/claim-guest")
      .set(account.auth)
      .send({ guestAccessToken: await t.token(guest.id, { anonymous: true }) })
      .expect(200)
    const me = await t.http().get("/v1/me").set(account.auth).expect(200)
    expect(me.body).toMatchObject({
      timezone: "Asia/Tokyo",
      pushEnabled: true,
      level: "ad",
      dailyGoalMin: 20,
      uiLanguage: "pt-BR",
      notifyNews: false,
    })
    expect(await sends(account.id)).toEqual([expect.objectContaining({ kind: "reminder", daily_slot: true })])
  })

  it("notify dry-run plans in a transaction and rolls it back", async () => {
    const dry = await user({
      timezone: "Europe/Istanbul",
      reminderTime: "20:00",
      uiLanguage: "tr",
      pushEnabled: true,
    })
    const out = await t.app
      .get(NotifyCliService)
      .dryRun({ at: at("2026-10-08T17:00:00Z"), windowMin: 5, user: dry.id })
    expect(out.rows).toEqual([
      expect.objectContaining({ kind: "reminder", language: "tr", status: "queued", localTime: "Thu 20:00" }),
    ])
    expect(await sends(dry.id)).toEqual([])
  })
})
