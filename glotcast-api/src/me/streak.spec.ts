import { describe, expect, it } from "vitest"
import { clampListened, crossesGoal, isCompleted, lastDays, streaks } from "./streak"

const day = (date: string, seconds = 600) => ({ date, seconds })

describe("streaks", () => {
  it("counts back from today when today qualifies", () => {
    const days = [day("2026-10-04"), day("2026-10-05"), day("2026-10-06")]
    expect(streaks(days, "2026-10-06")).toEqual({ streakDays: 3, bestStreakDays: 3 })
  })

  it("counts back from yesterday while today has no qualifying listening yet", () => {
    const days = [day("2026-10-04"), day("2026-10-05"), day("2026-10-06", 30)]
    expect(streaks(days, "2026-10-06").streakDays).toBe(2)
    expect(streaks([day("2026-10-04"), day("2026-10-05")], "2026-10-06").streakDays).toBe(2)
  })

  it("is broken by a missed day", () => {
    const days = [day("2026-10-01"), day("2026-10-02"), day("2026-10-04")]
    expect(streaks(days, "2026-10-06").streakDays).toBe(0)
    expect(streaks(days, "2026-10-04").streakDays).toBe(1)
  })

  it("needs 60 seconds for a day to count", () => {
    expect(streaks([day("2026-10-06", 59)], "2026-10-06").streakDays).toBe(0)
    expect(streaks([day("2026-10-06", 60)], "2026-10-06").streakDays).toBe(1)
  })

  it("keeps the longest run as the best streak, across months and years", () => {
    const days = [
      day("2025-12-30"),
      day("2025-12-31"),
      day("2026-01-01"),
      day("2026-01-02"),
      day("2026-02-27"),
      day("2026-02-28"),
      day("2026-03-01"),
      day("2026-10-06"),
    ]
    expect(streaks(days, "2026-10-06")).toEqual({ streakDays: 1, bestStreakDays: 4 })
  })

  it("ignores days after today (a client clock ahead)", () => {
    expect(streaks([day("2026-10-06"), day("2026-10-07")], "2026-10-06")).toEqual({
      streakDays: 1,
      bestStreakDays: 1,
    })
  })

  it("is zero without listening", () => {
    expect(streaks([], "2026-10-06")).toEqual({ streakDays: 0, bestStreakDays: 0 })
  })
})

describe("lastDays", () => {
  it("returns the 7 days ending today, oldest first, zero-filled", () => {
    const out = lastDays(
      [day("2026-10-06", 75.6), day("2026-10-02", 30), day("2026-09-01", 999)],
      "2026-10-06",
    )
    expect(out).toEqual([
      { date: "2026-09-30", seconds: 0 },
      { date: "2026-10-01", seconds: 0 },
      { date: "2026-10-02", seconds: 30 },
      { date: "2026-10-03", seconds: 0 },
      { date: "2026-10-04", seconds: 0 },
      { date: "2026-10-05", seconds: 0 },
      { date: "2026-10-06", seconds: 76 },
    ])
  })
})

describe("heartbeats", () => {
  it("completes at 95 % of the duration", () => {
    expect(isCompleted(94.9, 100)).toBe(false)
    expect(isCompleted(95, 100)).toBe(true)
    expect(isCompleted(10, 0)).toBe(false)
  })

  it("clamps the listened delta to [0, 120]", () => {
    expect(clampListened(-5)).toBe(0)
    expect(clampListened(30.5)).toBe(30.5)
    expect(clampListened(500)).toBe(120)
    expect(clampListened(Number.NaN)).toBe(0)
  })

  it("meets the goal only on the heartbeat that crosses it", () => {
    expect(crossesGoal(590, 610, 600)).toBe(true)
    expect(crossesGoal(600, 620, 600)).toBe(false)
    expect(crossesGoal(500, 599, 600)).toBe(false)
    expect(crossesGoal(570, 600, 600)).toBe(true)
  })
})
