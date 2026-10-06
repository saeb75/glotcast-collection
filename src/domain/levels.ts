import { type Level } from "@/schemas/admin"

/** Beginner, intermediate, advanced — always in this order. */
export const LEVELS = ["bg", "in", "ad"] as const satisfies readonly Level[]

export const isLevel = (value: string | null | undefined): value is Level =>
  LEVELS.includes(value as Level)

/** A level's entry from a list, or undefined. */
export const levelOf = <T extends { level: Level }>(levels: T[], level: Level): T | undefined =>
  levels.find((l) => l.level === level)
