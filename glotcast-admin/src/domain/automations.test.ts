import { describe, expect, it } from "vitest"
import { type AutomationSettings } from "@/schemas/admin"
import { automationsFormSchema } from "@/schemas/forms"
import {
  automationsForm,
  automationsFormValues,
  hm,
  inQuietHours,
  isAutomationsDirty,
  tickIsStale,
  weekOf,
} from "./automations"
import { fieldErrors } from "./forms"

const DEFAULTS: AutomationSettings = {
  quietHours: { from: "22:00", to: "08:00" },
  reminder: { enabled: false, weeklyRecap: true, minDue: 5 },
  streakSaver: { enabled: false, time: "21:00", minStreak: 2 },
  learning: { enabled: false, time: "18:00" },
  newEpisodes: { enabled: false, debounceMin: 15, freshHours: 36 },
}

describe("quiet hours", () => {
  it("reads HH:mm", () => {
    expect(hm("00:00")).toBe(0)
    expect(hm("21:45")).toBe(21 * 60 + 45)
  })

  it("wraps around midnight like the API", () => {
    const quiet = { from: "22:00", to: "08:00" }
    expect(inQuietHours("22:00", quiet)).toBe(true)
    expect(inQuietHours("03:00", quiet)).toBe(true)
    expect(inQuietHours("07:59", quiet)).toBe(true)
    expect(inQuietHours("08:00", quiet)).toBe(false)
    expect(inQuietHours("21:00", quiet)).toBe(false)
    expect(inQuietHours("13:00", { from: "12:00", to: "14:00" })).toBe(true)
    expect(inQuietHours("13:00", { from: "12:00", to: "12:00" })).toBe(false)
  })
})

describe("the automations form", () => {
  it("round-trips the settings and knows when it changed", () => {
    const form = automationsForm(DEFAULTS)
    expect(form.reminder.minDue).toBe("5")
    expect(automationsFormSchema.parse(automationsFormValues(form))).toEqual(DEFAULTS)
    expect(isAutomationsDirty(form, DEFAULTS)).toBe(false)
    expect(isAutomationsDirty({ ...form, learning: { ...form.learning, enabled: true } }, DEFAULTS)).toBe(
      true,
    )
    expect(isAutomationsDirty({ ...form, reminder: { ...form.reminder, minDue: " 5 " } }, DEFAULTS)).toBe(
      false,
    )
  })

  it("puts a slot time inside the quiet hours on that field, like the API's 400", () => {
    const form = automationsForm(DEFAULTS)
    const late = {
      ...form,
      streakSaver: { ...form.streakSaver, time: "23:00" },
      learning: { ...form.learning, time: "07:30" },
    }
    const parsed = automationsFormSchema.safeParse(automationsFormValues(late))
    expect(parsed.success).toBe(false)
    expect(Object.keys(parsed.success ? {} : fieldErrors(parsed.error)).sort()).toEqual([
      "learning.time",
      "streakSaver.time",
    ])
    // Moving the quiet hours instead fixes it.
    const moved = { ...late, quietHours: { from: "23:30", to: "07:00" } }
    expect(automationsFormSchema.safeParse(automationsFormValues(moved)).success).toBe(true)
  })

  it("wants whole numbers in the API's ranges", () => {
    const form = automationsForm(DEFAULTS)
    const bad = {
      ...form,
      reminder: { ...form.reminder, minDue: "" },
      newEpisodes: { ...form.newEpisodes, debounceMin: "-1", freshHours: "1.5" },
    }
    const parsed = automationsFormSchema.safeParse(automationsFormValues(bad))
    expect(Object.keys(parsed.success ? {} : fieldErrors(parsed.error)).sort()).toEqual([
      "newEpisodes.debounceMin",
      "newEpisodes.freshHours",
      "reminder.minDue",
    ])
  })
})

describe("the scheduler", () => {
  it("gives zeros for a kind with nothing sent", () => {
    expect(weekOf([{ kind: "reminder", sent: 4, opened: 1 }], "learning")).toEqual({
      kind: "learning",
      sent: 0,
      opened: 0,
    })
    expect(weekOf([{ kind: "reminder", sent: 4, opened: 1 }], "reminder").sent).toBe(4)
  })

  it("calls a run stale after three missed ticks", () => {
    const now = Date.parse("2026-10-07T12:00:00Z")
    expect(tickIsStale(null, now)).toBe(false)
    expect(tickIsStale("2026-10-07T11:50:00Z", now)).toBe(false)
    expect(tickIsStale("2026-10-07T11:40:00Z", now)).toBe(true)
  })
})
