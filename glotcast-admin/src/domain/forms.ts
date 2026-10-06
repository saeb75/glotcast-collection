import { type z } from "zod"

/** A zod failure as one message per field (the first issue of each), for the form's inline errors. */
export function fieldErrors(error: z.ZodError): Record<string, string> {
  const out: Record<string, string> = {}
  for (const issue of error.issues) {
    const key = issue.path.map(String).join(".") || "_"
    if (!(key in out)) out[key] = issue.message
  }
  return out
}

/** "" → null, anything else trimmed (optional text fields the API stores as null). */
export const blankToNull = (value: string): string | null => (value.trim() === "" ? null : value.trim())

/** A whole number from an input, or null when empty; NaN stays NaN so the schema reports it. */
export const numberOrNull = (value: string): number | null => (value.trim() === "" ? null : Number(value))
