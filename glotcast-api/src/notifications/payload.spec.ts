import { describe, expect, it } from "vitest"
import { chunk, mapLimit } from "./limit"
import { localeOf } from "./locales"
import { linkOf, payloadHash, pushData } from "./payload"
import { DEFAULT_SETTINGS, automationSettingsSchema, withDefaults } from "./settings"

describe("payload", () => {
  it("builds the push data without per-user values or empty keys", () => {
    expect(pushData({ type: "player", id: "e1", level: "in" }, "habit", "reminder")).toEqual({
      t: "player",
      id: "e1",
      lv: "in",
      k: "habit",
      ref: "reminder",
    })
    expect(pushData({ type: "home" }, "campaign", "c:1")).toEqual({ t: "home", k: "campaign", ref: "c:1" })
    expect(linkOf({ t: "player", id: "e1", lv: "in" })).toEqual({ type: "player", id: "e1", level: "in" })
  })

  it("hashes the whole payload, whatever the key order", () => {
    const base = {
      language: "tr",
      title: "Merhaba",
      body: "Dinle",
      data: pushData({ type: "home" }, "habit", "reminder"),
      imageUrl: null,
    }
    const same = { ...base, data: { ref: "reminder", k: "habit" as const, t: "home" as const } }
    expect(payloadHash(base)).toBe(payloadHash(same))
    expect(payloadHash(base)).toMatch(/^[0-9a-f]{40}$/)
    for (const change of [{ language: "en" }, { title: "x" }, { body: "x" }, { imageUrl: "https://i" }])
      expect(payloadHash({ ...base, ...change })).not.toBe(payloadHash(base))
  })
})

describe("locales", () => {
  it("maps app languages to the copy's, English otherwise", () => {
    expect(localeOf("pt-BR")).toBe("pt")
    expect(localeOf("zh_Hant")).toBe("zh")
    expect(localeOf(" TR ")).toBe("tr")
    expect(localeOf("nl")).toBe("en")
    expect(localeOf(null)).toBe("en")
  })
})

describe("limit", () => {
  it("chunks", () => {
    expect(chunk([1, 2, 3, 4, 5], 2)).toEqual([[1, 2], [3, 4], [5]])
    expect(chunk([], 3)).toEqual([])
    expect(() => chunk([1], 0)).toThrow()
  })

  it("maps with bounded concurrency, keeping the order", async () => {
    let running = 0
    let peak = 0
    const out = await mapLimit([5, 1, 4, 2, 3], 2, async (n) => {
      running++
      peak = Math.max(peak, running)
      await new Promise((r) => setTimeout(r, n))
      running--
      return n * 10
    })
    expect(out).toEqual([50, 10, 40, 20, 30])
    expect(peak).toBe(2)
    expect(await mapLimit([], 4, () => Promise.resolve(1))).toEqual([])
  })
})

describe("settings", () => {
  it("fills missing sections and keys from the defaults", () => {
    expect(withDefaults(null)).toEqual(DEFAULT_SETTINGS)
    expect(withDefaults({ reminder: { enabled: true } }).reminder).toEqual({
      enabled: true,
      weeklyRecap: true,
      minDue: 5,
    })
    expect(withDefaults({ learning: { enabled: true, time: "23:00" } })).toEqual(DEFAULT_SETTINGS)
  })

  it("rejects slot times inside the quiet hours", () => {
    const bad = { ...DEFAULT_SETTINGS, streakSaver: { ...DEFAULT_SETTINGS.streakSaver, time: "22:30" } }
    expect(automationSettingsSchema.safeParse(bad).success).toBe(false)
    expect(automationSettingsSchema.safeParse(DEFAULT_SETTINGS).success).toBe(true)
  })
})
