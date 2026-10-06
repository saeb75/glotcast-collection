import { type SQL, sql } from "drizzle-orm"

/** The app's languages: a push is written in the user's app language (`users.ui_language`), else English. */
export const LOCALES = [
  "ar",
  "de",
  "en",
  "es",
  "fr",
  "hi",
  "id",
  "it",
  "ja",
  "ko",
  "pl",
  "pt",
  "ru",
  "tr",
  "vi",
  "zh",
] as const
export type Locale = (typeof LOCALES)[number]

const KNOWN = new Set<string>(LOCALES)
export const isLocale = (value: string): value is Locale => KNOWN.has(value)

/** "pt-BR" → "pt", "zh_Hant" → "zh"; null or a language the app doesn't have → "en". */
export function localeOf(code: string | null | undefined): Locale {
  const base = (code ?? "").trim().split(/[-_]/)[0]!.toLowerCase()
  return isLocale(base) ? base : "en"
}

/** `localeOf` in SQL, over a column (or expression) holding a ui_language. */
export function localeSql(column: SQL): SQL {
  const base = sql`lower(split_part(replace(btrim(coalesce(${column}, '')), '_', '-'), '-', 1))`
  return sql`(CASE WHEN ${base} = ANY(${`{${LOCALES.join(",")}}`}::text[]) THEN ${base} ELSE 'en' END)`
}
