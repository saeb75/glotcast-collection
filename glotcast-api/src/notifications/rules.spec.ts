import { describe, expect, it } from "vitest"
import {
  decide,
  epochDay,
  type Facts,
  fnv1a,
  hm,
  hmText,
  inQuietHours,
  milestoneOf,
  variantIndex,
} from "./rules"
import { DEFAULT_SETTINGS, type AutomationSettings } from "./settings"

const settings: AutomationSettings = {
  ...DEFAULT_SETTINGS,
  reminder: { enabled: true, weeklyRecap: true, minDue: 5 },
  streakSaver: { enabled: true, time: "21:00", minStreak: 2 },
  learning: { enabled: true, time: "18:00" },
}

const facts = (over: Partial<Facts> = {}): Facts => ({
  userId: "8d2c1f7e-5b1a-4c5e-9a8d-1f2e3d4c5b6a",
  localDate: "2026-10-07", // a Wednesday
  weekday: 3,
  slotMinute: hm("19:00"),
  reminderMinute: null,
  todaySec: 0,
  goalSec: 600,
  weekSec: 0,
  streakDays: 0,
  wordsDue: 0,
  activeNow: false,
  continueItem: null,
  newEpisode: null,
  sentToday: 0,
  dailySlotUsed: false,
  ...over,
})

const item = {
  episodeId: "e1",
  title: "Coffee in Lisbon",
  coverUrl: "https://cdn/x.jpg",
  level: "in" as const,
  positionSec: 300,
  durationSec: 540,
  idleHours: 30,
}
const fresh = { episodeId: "e2", title: "New one", coverUrl: null, level: "bg" as const }

const kind = (d: ReturnType<typeof decide>) => (d.send ? d.message : `skip:${d.reason}`)

describe("time helpers", () => {
  it("parses and prints HH:mm", () => {
    expect(hm("00:00")).toBe(0)
    expect(hm("21:30")).toBe(21 * 60 + 30)
    expect(hmText(hm("08:05"))).toBe("08:05")
  })

  it("quiet hours wrap around midnight, and an empty range is none", () => {
    const q = { from: "22:00", to: "08:00" }
    expect(inQuietHours(hm("22:00"), q)).toBe(true)
    expect(inQuietHours(hm("23:59"), q)).toBe(true)
    expect(inQuietHours(hm("00:00"), q)).toBe(true)
    expect(inQuietHours(hm("07:59"), q)).toBe(true)
    expect(inQuietHours(hm("08:00"), q)).toBe(false)
    expect(inQuietHours(hm("21:59"), q)).toBe(false)
    const day = { from: "13:00", to: "15:00" }
    expect(inQuietHours(hm("14:00"), day)).toBe(true)
    expect(inQuietHours(hm("15:00"), day)).toBe(false)
    expect(inQuietHours(hm("12:00"), { from: "10:00", to: "10:00" })).toBe(false)
  })

  it("rotates variants one step a day, from a per-user start", () => {
    expect(fnv1a("")).toBe(0x811c9dc5)
    expect(fnv1a("a")).toBe(0xe40c292c)
    expect(epochDay("1970-01-02")).toBe(1)
    const user = "8d2c1f7e-5b1a-4c5e-9a8d-1f2e3d4c5b6a"
    const days = ["2026-10-07", "2026-10-08", "2026-10-09", "2026-10-10"].map((d) => variantIndex(user, d, 3))
    expect(days[1]).toBe((days[0]! + 1) % 3)
    expect(days[2]).toBe((days[0]! + 2) % 3)
    expect(days[3]).toBe(days[0])
    expect(variantIndex(user, "2026-10-07", 1)).toBe(0)
  })

  it("knows the milestones", () => {
    expect([6, 7, 30, 31, 100, 365].map(milestoneOf)).toEqual([null, 7, 30, null, 100, 365])
  })
})

describe("decide", () => {
  it("applies the caps first", () => {
    expect(kind(decide("reminder", facts({ dailySlotUsed: true }), settings))).toBe("skip:daily_cap")
    expect(kind(decide("reminder", facts({ sentToday: 2 }), settings))).toBe("skip:cap")
    expect(kind(decide("reminder", facts({ sentToday: 1 }), settings))).toBe("generic")
  })

  it("lets the user's own reminder through quiet hours, not the fixed-time slots", () => {
    const late = facts({ slotMinute: hm("23:30") })
    expect(kind(decide("reminder", late, settings))).toBe("generic")
    expect(kind(decide("learning", { ...late, wordsDue: 9 }, settings))).toBe("skip:quiet_hours")
    expect(kind(decide("streak_saver", { ...late, streakDays: 4 }, settings))).toBe("skip:quiet_hours")
  })

  it("reminder: goal met → words due or nothing; listening now → nothing", () => {
    expect(kind(decide("reminder", facts({ todaySec: 600 }), settings))).toBe("skip:goal_met")
    expect(kind(decide("reminder", facts({ todaySec: 900, wordsDue: 5 }), settings))).toBe("wordsDue")
    expect(kind(decide("reminder", facts({ activeNow: true, streakDays: 9 }), settings))).toBe(
      "skip:active_now",
    )
  })

  it("reminder priority: recap (Sunday) > streak ≥ 3 > continue > words due > new episode > generic", () => {
    const all = facts({
      weekday: 0,
      weekSec: 1800,
      streakDays: 5,
      continueItem: item,
      wordsDue: 8,
      newEpisode: fresh,
    })
    expect(kind(decide("reminder", all, settings))).toBe("recap")
    expect(
      kind(decide("reminder", all, { ...settings, reminder: { ...settings.reminder, weeklyRecap: false } })),
    ).toBe("streak")
    expect(kind(decide("reminder", { ...all, weekday: 1 }, settings))).toBe("streak")
    expect(kind(decide("reminder", { ...all, weekday: 1, streakDays: 2 }, settings))).toBe("continue")
    expect(
      kind(decide("reminder", { ...all, weekday: 1, streakDays: 2, continueItem: null }, settings)),
    ).toBe("wordsDue")
    expect(
      kind(
        decide("reminder", { ...all, weekday: 1, streakDays: 2, continueItem: null, wordsDue: 4 }, settings),
      ),
    ).toBe("newEpisode")
    expect(kind(decide("reminder", facts({ weekday: 0, weekSec: 30 }), settings))).toBe("generic")
  })

  it("reminder messages carry their params, links and images", () => {
    expect(decide("reminder", facts({ continueItem: item }), settings)).toEqual({
      send: true,
      message: "continue",
      params: { title: "Coffee in Lisbon", count: 4 },
      link: { type: "player", id: "e1", level: "in" },
      imageUrl: "https://cdn/x.jpg",
      episodeIds: ["e1"],
    })
    expect(decide("reminder", facts({ streakDays: 3 }), settings)).toMatchObject({
      message: "streak",
      params: { count: 3 },
      link: { type: "home" },
    })
    expect(decide("reminder", facts({ newEpisode: fresh }), settings)).toMatchObject({
      message: "newEpisode",
      params: { title: "New one", level: "bg" },
      link: { type: "episode", id: "e2" },
      episodeIds: ["e2"],
    })
    expect(decide("reminder", facts({ wordsDue: 6 }), settings)).toMatchObject({ link: { type: "review" } })
    expect(decide("reminder", facts({ weekday: 0, weekSec: 3000 }), settings)).toMatchObject({
      message: "recap",
      params: { count: 50 },
    })
  })

  it("learning: recap, words due, or finishing an episode; nothing otherwise", () => {
    const slot = { slotMinute: hm("18:00") }
    expect(kind(decide("learning", facts({ ...slot, weekday: 0, weekSec: 600 }), settings))).toBe("recap")
    expect(kind(decide("learning", facts({ ...slot, wordsDue: 5 }), settings))).toBe("wordsDue")
    expect(kind(decide("learning", facts({ ...slot, continueItem: item }), settings))).toBe("finish")
    expect(
      kind(decide("learning", facts({ ...slot, continueItem: { ...item, idleHours: 5 } }), settings)),
    ).toBe("skip:nothing_to_send")
    expect(
      kind(decide("learning", facts({ ...slot, continueItem: { ...item, positionSec: 60 } }), settings)),
    ).toBe("skip:nothing_to_send")
    expect(
      kind(decide("learning", facts({ ...slot, continueItem: { ...item, idleHours: 200 } }), settings)),
    ).toBe("skip:nothing_to_send")
    expect(kind(decide("learning", facts(slot), settings))).toBe("skip:nothing_to_send")
    expect(kind(decide("learning", facts({ ...slot, activeNow: true, wordsDue: 9 }), settings))).toBe(
      "skip:active_now",
    )
  })

  it("streak saver: only with a streak, nothing today, and no reminder still to come", () => {
    const slot = { slotMinute: hm("21:00") }
    expect(kind(decide("streak_saver", facts({ ...slot, streakDays: 1 }), settings))).toBe("skip:no_streak")
    expect(kind(decide("streak_saver", facts({ ...slot, streakDays: 4, todaySec: 60 }), settings))).toBe(
      "skip:listened_today",
    )
    expect(
      kind(decide("streak_saver", facts({ ...slot, streakDays: 4, reminderMinute: hm("21:30") }), settings)),
    ).toBe("skip:reminder_later")
    expect(
      kind(decide("streak_saver", facts({ ...slot, streakDays: 4, reminderMinute: hm("08:00") }), settings)),
    ).toBe("streakSaver")
    expect(
      decide("streak_saver", facts({ ...slot, streakDays: 2, continueItem: item }), settings),
    ).toMatchObject({
      message: "streakSaver",
      params: { count: 2 },
      link: { type: "player", id: "e1", level: "in" },
    })
  })
})
