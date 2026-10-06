import { z } from "zod"
import { hm, inQuietHours } from "./rules"

export const hmSchema = z.string().regex(/^([01]\d|2[0-3]):[0-5]\d$/, '"HH:mm"')

/** The automations' switches and parameters (contract: AutomationSettings), stored in app.notification_settings. */
export const automationSettingsSchema = z
  .object({
    quietHours: z.object({ from: hmSchema, to: hmSchema }).describe("local time, default 22:00–08:00"),
    reminder: z.object({
      enabled: z.boolean(),
      weeklyRecap: z.boolean().describe("Sunday: a recap of the week instead of the usual reminder"),
      minDue: z.number().int().min(1).max(500).describe("words due before a words-due push (default 5)"),
    }),
    streakSaver: z.object({
      enabled: z.boolean(),
      time: hmSchema.describe('local time (default "21:00")'),
      minStreak: z.number().int().min(1).max(365).describe("default 2"),
    }),
    learning: z.object({ enabled: z.boolean(), time: hmSchema.describe('local time (default "18:00")') }),
    newEpisodes: z.object({
      enabled: z.boolean(),
      debounceMin: z
        .number()
        .int()
        .min(0)
        .max(24 * 60)
        .describe("wait after going live (bundles releases)"),
      freshHours: z
        .number()
        .int()
        .min(1)
        .max(7 * 24)
        .describe("how long an episode stays pushable"),
    }),
  })
  .superRefine((s, ctx) => {
    for (const [path, time] of [
      [["streakSaver", "time"], s.streakSaver.time],
      [["learning", "time"], s.learning.time],
    ] as const) {
      if (inQuietHours(hm(time), s.quietHours))
        ctx.addIssue({ code: "custom", path: [...path], message: "must be outside the quiet hours" })
    }
  })
export type AutomationSettings = z.infer<typeof automationSettingsSchema>

export const DEFAULT_SETTINGS: AutomationSettings = {
  quietHours: { from: "22:00", to: "08:00" },
  reminder: { enabled: false, weeklyRecap: true, minDue: 5 },
  streakSaver: { enabled: false, time: "21:00", minStreak: 2 },
  learning: { enabled: false, time: "18:00" },
  newEpisodes: { enabled: false, debounceMin: 15, freshHours: 36 },
}

type Section = Record<string, unknown>

/** The stored JSON over the defaults, section by section (a key added later gets its default). */
export function withDefaults(stored: unknown): AutomationSettings {
  const raw = (stored && typeof stored === "object" ? stored : {}) as Record<string, Section | undefined>
  const merged = Object.fromEntries(
    Object.entries(DEFAULT_SETTINGS).map(([key, defaults]) => [
      key,
      { ...(defaults as Section), ...(raw[key] && typeof raw[key] === "object" ? raw[key] : {}) },
    ]),
  )
  const parsed = automationSettingsSchema.safeParse(merged)
  return parsed.success ? parsed.data : DEFAULT_SETTINGS
}
