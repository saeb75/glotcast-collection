import { describe, expect, it } from "vitest"
import {
  episodeLabel,
  formatBytes,
  formatClock,
  formatListening,
  formatLockScreenDay,
  formatRate,
  formatRelative,
  formatTimestamp,
  initials,
} from "./format"
import { safeFileName } from "./media"
import { addUnique, move, sameOrder } from "./order"
import { slugify } from "./slug"

describe("formats", () => {
  it("formats audio lengths and transcript times", () => {
    expect(formatClock(65)).toBe("1:05")
    expect(formatClock(3723.9)).toBe("1:02:03")
    expect(formatClock(null)).toBe("—")
    expect(formatTimestamp(83.44)).toBe("01:23.4")
    expect(formatTimestamp(3723.96)).toBe("1:02:04.0")
  })

  it("formats listening time, sizes and relative times", () => {
    expect(formatListening(45)).toBe("45 s")
    expect(formatListening(3 * 3600 + 12 * 60)).toBe("3 h 12 min")
    expect(formatBytes(4.2 * 1024 * 1024)).toBe("4.2 MB")
    const now = Date.parse("2026-10-06T12:00:00Z")
    expect(formatRelative("2026-10-06T11:55:00Z", now)).toBe("5 minutes ago")
    expect(formatRelative(null, now)).toBe("Never")
  })

  it("formats rates and a lock screen's day", () => {
    expect(formatRate(1, 3)).toBe("33.3%")
    expect(formatRate(5, 5)).toBe("100%")
    expect(formatRate(1, 0)).toBe("—")
    expect(formatLockScreenDay(new Date(2026, 9, 7))).toBe("Wednesday, October 7")
  })

  it("labels episodes and people", () => {
    expect(episodeLabel({ number: 12, title: "Lisbon" })).toBe("#12 · Lisbon")
    expect(episodeLabel({ number: null, title: "Lisbon" })).toBe("Lisbon")
    expect(initials("ash.ketchum@example.com")).toBe("AK")
    expect(initials("Misty")).toBe("M")
  })
})

describe("slugs, file names, order", () => {
  it("slugifies like the API", () => {
    expect(slugify("  Lisbon Mornings: Café & Co.  ")).toBe("lisbon-mornings-cafe-co")
  })

  it("makes safe file names", () => {
    expect(safeFileName("Ep 12 – Final.MP3")).toBe("ep-12-final.mp3")
    expect(safeFileName("Çay.jpeg")).toBe("cay.jpeg")
  })

  it("moves, adds and compares ids", () => {
    expect(move(["a", "b", "c"], 0, 2)).toEqual(["b", "c", "a"])
    expect(move(["a", "b"], 0, 5)).toEqual(["a", "b"])
    expect(addUnique(["a"], "a")).toEqual(["a"])
    expect(sameOrder(["a", "b"], ["a", "b"])).toBe(true)
    expect(sameOrder(["a", "b"], ["b", "a"])).toBe(false)
  })
})
