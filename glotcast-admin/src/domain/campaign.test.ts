import { describe, expect, it } from "vitest"
import { AUDIENCE_WORDS, DELIVERY_WORDS } from "@/copy/notifications"
import { type AdminCampaign, type CampaignStats } from "@/schemas/admin"
import { campaignFormSchema } from "@/schemas/forms"
import {
  audienceContradicts,
  audienceDraft,
  audienceInput,
  audienceKey,
  audienceSummary,
  BODY_MAX,
  campaignFormValues,
  campaignInput,
  campaignNumbers,
  campaignPatch,
  counterLevel,
  defaultDelivery,
  deliveryInput,
  deliveryIsLateToday,
  deliveryProblem,
  deliverySummary,
  draftFromCampaign,
  editedLocales,
  emptyAudience,
  joinNames,
  linkInput,
  LOCALES,
  localeName,
  localesSourceFirst,
  messageFor,
  messageProblem,
  messagesInput,
  missingLocales,
  newCampaignDraft,
  overwrittenByTranslate,
  readyLocales,
  sameDraft,
  sendFailure,
  testFailure,
  testTarget,
  TITLE_MAX,
  withLinkType,
} from "./campaign"
import { fieldErrors } from "./forms"

const PODCAST = "5d1f2c3b-4a5e-4f60-8a7b-9c0d1e2f3a4b"
const EPISODE = "0a1b2c3d-4e5f-4061-8273-94a5b6c7d8e9"

const campaign = (patch: Partial<AdminCampaign> = {}): AdminCampaign => ({
  id: "11111111-2222-4333-8444-555555555555",
  name: "October comeback",
  status: "draft",
  sourceLanguage: "en",
  messages: {
    en: { title: "We miss you", body: "Five minutes today keeps your streak." },
    de: { title: "Wir vermissen dich", body: "Fünf Minuten heute." },
  },
  audience: { segment: "pro", levels: ["bg"], inactiveDays: 7 },
  link: { type: "episode", id: EPISODE },
  imageUrl: null,
  respectQuietHours: true,
  delivery: null,
  recipients: null,
  sentAt: null,
  createdBy: null,
  createdAt: "2026-10-01T10:00:00.000Z",
  updatedAt: "2026-10-01T10:00:00.000Z",
  ...patch,
})

describe("languages", () => {
  it("has the 16 app languages with English names", () => {
    expect(LOCALES).toHaveLength(16)
    expect(localeName("de")).toBe("German")
    expect(localeName("tr")).toBe("Turkish")
    expect(localeName("zh")).toBe("Chinese")
  })

  it("lists the source first, then the others by name", () => {
    const order = localesSourceFirst("tr")
    expect(order[0]).toBe("tr")
    expect(order).toHaveLength(16)
    expect(order[1]).toBe("ar") // Arabic
    expect(order.at(-1)).toBe("vi") // Vietnamese
  })

  it("joins names in plain English", () => {
    expect(joinNames(["German"], "or")).toBe("German")
    expect(joinNames(["German", "Turkish"], "or")).toBe("German or Turkish")
    expect(joinNames(["A", "B", "C"], "or")).toBe("A, B or C")
    expect(joinNames(["A", "B", "C", "D", "E"], "or")).toBe("A, B, C and 2 more")
  })
})

describe("messages", () => {
  it("names what is wrong with a language's message", () => {
    expect(messageProblem(undefined)).toBe("missing")
    expect(messageProblem({ title: "  ", body: "" })).toBe("missing")
    expect(messageProblem({ title: "Hi", body: "" })).toBe("incomplete")
    expect(messageProblem({ title: "x".repeat(TITLE_MAX + 1), body: "ok" })).toBe("title_long")
    expect(messageProblem({ title: "ok", body: "x".repeat(BODY_MAX + 1) })).toBe("body_long")
    // The API trims before counting.
    expect(messageProblem({ title: ` ${"x".repeat(TITLE_MAX)} `, body: "ok" })).toBeNull()
  })

  it("flags the counter near and over the limit", () => {
    expect(counterLevel(10, 60)).toBe("ok")
    expect(counterLevel(54, 60)).toBe("near")
    expect(counterLevel(61, 60)).toBe("over")
  })

  it("finds missing and ready languages", () => {
    const messages = { en: { title: "Hi", body: "There" }, de: { title: "Hallo", body: "" } }
    expect(missingLocales(messages)).toHaveLength(14)
    expect(missingLocales(messages)).not.toContain("de")
    expect(readyLocales(messages)).toEqual(["en"])
  })

  it("keeps only languages with text, trimmed", () => {
    expect(
      messagesInput({
        en: { title: " Hi ", body: "There " },
        de: { title: "", body: "" },
        fr: { title: "Salut", body: "" },
      }),
    ).toEqual({ en: { title: "Hi", body: "There" }, fr: { title: "Salut", body: "" } })
  })

  it("falls back to English, then the source, like the API", () => {
    const messages = { tr: { title: "Merhaba", body: "Selam" }, en: { title: "Hello", body: "Hi" } }
    expect(messageFor(messages, "de", "tr")?.language).toBe("en")
    expect(messageFor({ tr: messages.tr }, "de", "tr")?.language).toBe("tr")
    expect(messageFor(messages, "tr", "tr")?.message.title).toBe("Merhaba")
    expect(messageFor({}, "de", "en")).toBeNull()
  })

  it("knows which translations were edited by hand", () => {
    const machine = { de: { title: "Hallo", body: "Welt" }, fr: { title: "Salut", body: "Monde" } }
    const messages = {
      de: { title: "Hallo!", body: "Welt" },
      fr: { title: "Salut", body: "Monde" },
      es: { title: "Hola", body: "Mundo" },
    }
    expect(editedLocales(messages, machine)).toEqual(["de"])
    // Translating replaces the edited German and the hand-written Spanish, not the untouched French.
    expect(overwrittenByTranslate(messages, machine, "en")).toEqual(["de", "es"])
  })
})

describe("audience", () => {
  it("leaves empty filters out, in a fixed order", () => {
    expect(audienceInput(emptyAudience())).toEqual({ segment: "all" })
    expect(
      audienceInput({
        segment: "free",
        levels: ["ad", "bg"],
        languages: ["tr", "de"],
        inactiveDays: " 30 ",
        activeWithinDays: "abc",
        podcastIds: [PODCAST],
      }),
    ).toEqual({
      segment: "free",
      levels: ["bg", "ad"],
      languages: ["de", "tr"],
      inactiveDays: 30,
      podcastIds: [PODCAST],
    })
  })

  it("round-trips and keys the same audience the same way", () => {
    const a = { segment: "pro" as const, languages: ["tr" as const, "de" as const], activeWithinDays: 7 }
    expect(audienceInput(audienceDraft(a))).toEqual({
      segment: "pro",
      languages: ["de", "tr"],
      activeWithinDays: 7,
    })
    expect(audienceKey(a)).toBe(audienceKey({ segment: "pro", activeWithinDays: 7, languages: ["de", "tr"] }))
  })

  it("sees filters that can't both hold", () => {
    expect(audienceContradicts({ inactiveDays: 30, activeWithinDays: 7 })).toBe(true)
    expect(audienceContradicts({ inactiveDays: 7, activeWithinDays: 30 })).toBe(false)
    expect(audienceContradicts({ inactiveDays: 7 })).toBe(false)
  })

  it("summarises an audience in words", () => {
    expect(audienceSummary({ segment: "all" }, AUDIENCE_WORDS)).toBe("Everyone")
    expect(
      audienceSummary(
        { segment: "pro", levels: ["bg", "in"], languages: ["de"], inactiveDays: 30, podcastIds: [PODCAST] },
        AUDIENCE_WORDS,
        (id) => (id === PODCAST ? "Lisbon Mornings" : undefined),
      ),
    ).toBe(
      "Pro users · Beginner or Intermediate · App in German · Not seen for 30+ days · Following Lisbon Mornings",
    )
  })
})

describe("link", () => {
  it("sends only what the type uses", () => {
    expect(linkInput({ type: "home", id: EPISODE, level: "bg" })).toEqual({ type: "home" })
    expect(linkInput({ type: "episode", id: EPISODE, level: "bg" })).toEqual({ type: "episode", id: EPISODE })
    expect(linkInput({ type: "player", id: EPISODE, level: "bg" })).toEqual({
      type: "player",
      id: EPISODE,
      level: "bg",
    })
    expect(linkInput({ type: "player", id: EPISODE, level: "" })).toEqual({ type: "player", id: EPISODE })
  })

  it("keeps an episode between episode and player only", () => {
    expect(withLinkType({ type: "episode", id: EPISODE, level: "" }, "player").id).toBe(EPISODE)
    expect(withLinkType({ type: "episode", id: EPISODE, level: "" }, "podcast").id).toBe("")
    expect(withLinkType({ type: "player", id: EPISODE, level: "ad" }, "episode")).toEqual({
      type: "episode",
      id: EPISODE,
      level: "",
    })
  })
})

describe("delivery", () => {
  const now = new Date(2026, 9, 7, 14, 20) // Oct 7, 2026, 14:20 local

  it("starts at now, with a later hour and tomorrow 10:00 ready", () => {
    expect(defaultDelivery(now)).toEqual({
      mode: "now",
      at: "2026-10-07T16:00",
      date: "2026-10-08",
      time: "10:00",
    })
  })

  it("checks the chosen time", () => {
    const d = defaultDelivery(now)
    expect(deliveryProblem(d, now)).toBeNull()
    expect(deliveryProblem({ ...d, mode: "at", at: "" }, now)).toBe("at_missing")
    expect(deliveryProblem({ ...d, mode: "at", at: "2026-10-07T14:00" }, now)).toBe("at_past")
    expect(deliveryProblem({ ...d, mode: "local", date: "" }, now)).toBe("date_missing")
    expect(deliveryProblem({ ...d, mode: "local", time: "25:00" }, now)).toBe("time_missing")
    expect(deliveryProblem({ ...d, mode: "local", date: "2026-10-06" }, now)).toBe("date_past")
    expect(deliveryProblem({ ...d, mode: "local", date: "2026-10-07" }, now)).toBeNull()
    expect(deliveryIsLateToday({ ...d, mode: "local", date: "2026-10-07" }, now)).toBe(true)
  })

  it("builds what send takes", () => {
    const d = defaultDelivery(now)
    expect(deliveryInput(d)).toEqual({ mode: "now" })
    expect(deliveryInput({ ...d, mode: "at" })).toEqual({
      mode: "at",
      sendAt: new Date(2026, 9, 7, 16).toISOString(),
    })
    expect(deliveryInput({ ...d, mode: "local" })).toEqual({
      mode: "local",
      date: "2026-10-08",
      time: "10:00",
    })
    expect(deliveryInput({ ...d, mode: "local", time: "" })).toBeNull()
  })

  it("summarises a delivery in words", () => {
    expect(deliverySummary(null, DELIVERY_WORDS)).toBe("Not sent yet")
    expect(deliverySummary({ mode: "now" }, DELIVERY_WORDS)).toBe("Right away")
    expect(deliverySummary({ mode: "local", date: "2026-10-09", time: "09:30" }, DELIVERY_WORDS)).toBe(
      "Oct 9, 2026 at 09:30, each user's local time",
    )
    expect(deliverySummary({ mode: "at", sendAt: "2026-10-09T09:30:00.000Z" }, DELIVERY_WORDS)).toMatch(
      /^At Oct 9, 2026/,
    )
  })
})

describe("the draft", () => {
  it("round-trips a campaign", () => {
    const c = campaign()
    const draft = draftFromCampaign(c)
    expect(draft.messages.fr).toEqual({ title: "", body: "" })
    expect(campaignInput(draft)).toEqual({
      name: c.name,
      sourceLanguage: "en",
      messages: c.messages,
      audience: { segment: "pro", levels: ["bg"], inactiveDays: 7 },
      link: { type: "episode", id: EPISODE },
      imageUrl: null,
      respectQuietHours: true,
    })
  })

  it("patches only what changed", () => {
    const base = draftFromCampaign(campaign())
    expect(campaignPatch(base, base)).toEqual({})
    const edited = { ...base, name: "  Renamed ", audience: { ...base.audience, segment: "all" as const } }
    expect(campaignPatch(base, edited)).toEqual({
      name: "Renamed",
      audience: { segment: "all", levels: ["bg"], inactiveDays: 7 },
    })
  })

  it("is the same draft across whitespace, not across a typed filter", () => {
    const base = draftFromCampaign(campaign())
    expect(sameDraft(base, { ...base, name: `${base.name} ` })).toBe(true)
    expect(sameDraft(base, { ...base, audience: { ...base.audience, activeWithinDays: "x" } })).toBe(false)
    expect(sameDraft(newCampaignDraft(), newCampaignDraft())).toBe(true)
  })

  it("is checked by the form schema, field by field", () => {
    const draft = newCampaignDraft()
    draft.messages.de = { title: "Hallo", body: "" }
    draft.link = { type: "podcast", id: "", level: "" }
    draft.audience.inactiveDays = "0"
    const parsed = campaignFormSchema.safeParse(campaignFormValues(draft))
    expect(parsed.success).toBe(false)
    const errors = parsed.success ? {} : fieldErrors(parsed.error)
    expect(Object.keys(errors).sort()).toEqual([
      "audience.inactiveDays",
      "link.id",
      "messages.de.body",
      "name",
    ])

    const ok = draftFromCampaign(campaign())
    expect(campaignFormSchema.safeParse(campaignFormValues(ok)).success).toBe(true)
  })
})

describe("sending and testing", () => {
  it("reads a test recipient", () => {
    expect(testTarget(" Ash@Example.com ")).toEqual({ email: "ash@example.com" })
    expect(testTarget(EPISODE.toUpperCase())).toEqual({ userId: EPISODE })
    expect(testTarget("ash")).toBeNull()
  })

  it("words why a send was refused", () => {
    expect(sendFailure("unavailable", "push notifications are not configured")).toBe("not_configured")
    expect(sendFailure("unavailable", "notifications are disabled (NOTIFICATIONS_ENABLED)")).toBe("disabled")
    expect(sendFailure("invalid", "a message in the source language (en) is required")).toBe(
      "no_source_message",
    )
    expect(sendFailure("invalid", "sendAt is in the past")).toBe("past")
    expect(sendFailure("conflict", "the campaign is scheduled")).toBe("not_draft")
    expect(sendFailure("server", "boom")).toBe("other")
  })

  it("words why a test push failed", () => {
    expect(
      testFailure("not_found", 404, "no such app user (sign in to the app with that account first)"),
    ).toBe("no_account")
    expect(testFailure("conflict", 409, "no_subscription")).toBe("no_subscription")
    expect(testFailure("unavailable", 503, "push notifications are not configured")).toBe("not_configured")
    expect(testFailure("unavailable", 503, "OneSignal did not answer, try again")).toBe("onesignal_down")
    expect(testFailure("server", 502, "OneSignal refused the push: invalid")).toBe("onesignal_refused")
    expect(testFailure("invalid", 400, "the campaign has no message yet")).toBe("no_message")
    expect(testFailure("not_found", 404, "campaign x not found")).toBe("other")
  })
})

describe("results", () => {
  const stats = (patch: Partial<CampaignStats> = {}): CampaignStats => ({
    recipients: 100,
    queued: 0,
    sent: 90,
    failed: 2,
    unreachable: 5,
    skipped: 3,
    opened: 9,
    onesignal: null,
    byLanguage: [],
    refreshedAt: null,
    ...patch,
  })

  it("uses our counts before OneSignal reports", () => {
    expect(campaignNumbers(stats())).toEqual({
      delivered: 90,
      deliveredBy: "sent",
      clicked: 9,
      clickedBy: "opened",
      ctr: 0.1,
    })
  })

  it("prefers OneSignal's confirmed deliveries and clicks", () => {
    const os = { successful: 88, failed: 1, errored: 0, converted: 11, received: 80 }
    expect(campaignNumbers(stats({ onesignal: os }))).toMatchObject({
      delivered: 80,
      deliveredBy: "received",
      clicked: 11,
      clickedBy: "converted",
    })
    expect(campaignNumbers(stats({ onesignal: { ...os, received: 0, converted: 0 } }))).toMatchObject({
      delivered: 88,
      deliveredBy: "successful",
      clicked: 9,
      clickedBy: "opened",
    })
    expect(campaignNumbers(stats({ sent: 0 })).ctr).toBeNull()
  })
})
