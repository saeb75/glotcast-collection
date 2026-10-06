import { describe, expect, it } from "vitest"
import { intervalDays, review } from "./leitner"

const NOW = new Date("2026-10-06T12:00:00Z")
const days = (d: Date) => (d.getTime() - NOW.getTime()) / 86_400_000

describe("Leitner", () => {
  it("moves a known word one box up with the box's interval", () => {
    const out = review({ box: 1, correctCount: 0, incorrectCount: 0 }, true, NOW)
    expect(out).toMatchObject({ box: 2, correctCount: 1, incorrectCount: 0, lastReviewedAt: NOW })
    expect(days(out.nextReviewAt)).toBe(2)
    expect(days(review({ box: 3, correctCount: 2, incorrectCount: 0 }, true, NOW).nextReviewAt)).toBe(8)
  })

  it("keeps a mastered word in box 5, reviewed again after 16 days", () => {
    const out = review({ box: 5, correctCount: 4, incorrectCount: 1 }, true, NOW)
    expect(out.box).toBe(5)
    expect(days(out.nextReviewAt)).toBe(16)
  })

  it("sends an unknown word back to box 1 for tomorrow", () => {
    const out = review({ box: 4, correctCount: 3, incorrectCount: 0 }, false, NOW)
    expect(out).toMatchObject({ box: 1, correctCount: 3, incorrectCount: 1 })
    expect(days(out.nextReviewAt)).toBe(1)
  })

  it("has intervals of 1/2/4/8/16 days for boxes 1–5", () => {
    expect([1, 2, 3, 4, 5].map(intervalDays)).toEqual([1, 2, 4, 8, 16])
  })
})
