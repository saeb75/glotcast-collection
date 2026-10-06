import { describe, expect, it } from "vitest"
import { absoluteUrl, mapLevels, normalizeLevel, normalizeTranscript } from "./strapi-mapping"

describe("normalizeLevel", () => {
  it("reads the stored enum values, typo included", () => {
    expect(normalizeLevel("BG,")).toBe("bg")
    expect(normalizeLevel("IN,")).toBe("in")
    expect(normalizeLevel("AD")).toBe("ad")
  })
  it("reads the long and odd forms", () => {
    expect(normalizeLevel("Beginner,")).toBe("bg")
    expect(normalizeLevel(" intermediate ")).toBe("in")
    expect(normalizeLevel("INT")).toBe("in")
    expect(normalizeLevel("Advanced")).toBe("ad")
    expect(normalizeLevel("adv.")).toBe("ad")
  })
  it("refuses anything else", () => {
    expect(normalizeLevel("C1")).toBeNull()
    expect(normalizeLevel("")).toBeNull()
    expect(normalizeLevel(null)).toBeNull()
    expect(normalizeLevel(3)).toBeNull()
  })
})

describe("normalizeTranscript", () => {
  it("turns Whisper chunks into {text, speaker, start, end} in seconds", () => {
    const out = normalizeTranscript({
      text: "Hello there. Welcome back.",
      chunks: [
        { text: " Hello there.", speaker: "A", timestamp: [0, 2.5] },
        { text: "Welcome back.", speaker: "B", timestamp: [2.5, 61.25] },
      ],
    })
    expect(out).toEqual({
      chunks: [
        { text: "Hello there.", speaker: "A", start: 0, end: 2.5 },
        { text: "Welcome back.", speaker: "B", start: 2.5, end: 61.25 },
      ],
      durationSec: 61.25,
      milliseconds: false,
    })
  })

  it("detects milliseconds (largest timestamp over 60000)", () => {
    const out = normalizeTranscript({
      chunks: [
        { text: "One", timestamp: [0, 2500] },
        { text: "Two", timestamp: [2500, 61250] },
      ],
    })
    expect(out.milliseconds).toBe(true)
    expect(out.chunks.map((c) => [c.start, c.end])).toEqual([
      [0, 2.5],
      [2.5, 61.25],
    ])
    expect(out.durationSec).toBe(61.25)
    // 59 999 ms would be read as seconds: the threshold is the documented rule.
    expect(normalizeTranscript({ chunks: [{ text: "x", timestamp: [0, 60000] }] }).milliseconds).toBe(false)
  })

  it("fills a missing end, drops empty chunks, defaults the speaker", () => {
    const out = normalizeTranscript({
      chunks: [
        { text: "Coffee first.", speaker: null, timestamp: [0.5, 3] },
        { text: "   ", timestamp: [3, 3.2] },
        { text: "  Then quantum.  ", timestamp: [3.2, null] },
      ],
    })
    expect(out.chunks).toEqual([
      { text: "Coffee first.", speaker: null, start: 0.5, end: 3 },
      { text: "Then quantum.", speaker: null, start: 3.2, end: 3.2 },
    ])
    expect(out.durationSec).toBe(3.2)
  })

  it("accepts a bare array, a JSON string, start/end fields and words", () => {
    expect(normalizeTranscript('[{"text":"Hi","start":1,"end":2}]').chunks).toEqual([
      { text: "Hi", speaker: null, start: 1, end: 2 },
    ])
    expect(
      normalizeTranscript([
        { text: "Hi you", startTime: 1, endTime: 2, words: [{ text: "Hi", start: 1, end: 1.4 }] },
      ]).chunks,
    ).toEqual([
      { text: "Hi you", speaker: null, start: 1, end: 2, words: [{ text: "Hi", start: 1, end: 1.4 }] },
    ])
  })

  it("survives garbage", () => {
    expect(normalizeTranscript(null)).toEqual({ chunks: [], durationSec: 0, milliseconds: false })
    expect(normalizeTranscript("not json")).toEqual({ chunks: [], durationSec: 0, milliseconds: false })
    expect(normalizeTranscript({ chunks: [null, 4, { text: "ok", timestamp: ["1", "2"] }] }).chunks).toEqual([
      { text: "ok", speaker: null, start: 1, end: 2 },
    ])
  })
})

describe("absoluteUrl", () => {
  it("keeps absolute URLs and prefixes upload paths", () => {
    expect(absoluteUrl("https://cdn.example.com/a.png")).toBe("https://cdn.example.com/a.png")
    expect(absoluteUrl("//cdn.example.com/a.png")).toBe("https://cdn.example.com/a.png")
    expect(absoluteUrl("/uploads/a.png", "https://panel.example.com/")).toBe(
      "https://panel.example.com/uploads/a.png",
    )
    expect(absoluteUrl("/uploads/a.png")).toBe("/uploads/a.png")
    expect(absoluteUrl("  ")).toBeNull()
    expect(absoluteUrl(null)).toBeNull()
  })
})

describe("mapLevels", () => {
  const t = { chunks: [{ text: "x", timestamp: [0, 5] }] }
  it("keeps one level each in component order and reports what it skipped", () => {
    const report = mapLevels(
      [
        { order: 2, level: "AD", url: "https://a/ad2.mp3", transcript: t, description: "dup" },
        { order: 1, level: "AD", url: "https://a/ad.mp3", transcript: t, description: " Advanced " },
        { order: 3, level: "IN,", url: "", transcript: t, description: null },
        { order: 4, level: "Expert", url: "https://a/x.mp3", transcript: t, description: null },
        { order: 5, level: "Beginner,", url: "/uploads/bg.mp3", transcript: t, description: null },
      ],
      "https://panel.example.com",
    )
    expect(report.levels.map((l) => [l.level, l.audioUrl, l.description, l.transcript.durationSec])).toEqual([
      ["ad", "https://a/ad.mp3", "Advanced", 5],
      ["bg", "https://panel.example.com/uploads/bg.mp3", null, 5],
    ])
    expect(report).toMatchObject({ unknownLevel: 1, noAudio: 1, duplicates: 1 })
  })
})
