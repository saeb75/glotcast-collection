import { describe, expect, it } from "vitest"
import { LEVELS } from "../../database/schema/app"
import { LOCALES, type Locale } from "../locales"
import { type Field, type Variant } from "./en"
import { BODY_MAX, COPY, MESSAGE_KEYS, PARAM_MAX, render, TITLE_MAX, variantCount } from "./index"

const FIELDS: Field[] = ["title", "body"]
const COUNTS = [0, 1, 2, 3, 4, 5, 11, 12, 21, 22, 25, 100, 101, 111]
// Worst-case inserted values: names as long as render() lets them be.
const PARAMS = {
  title: "T".repeat(PARAM_MAX.title! + 10),
  podcast: "P".repeat(PARAM_MAX.podcast! + 10),
  level: "in" as const,
}

const placeholders = (text: string) => [...text.matchAll(/\{\{\s*(\w+)\s*\}\}/g)].map((m) => m[1]!)
/** Every form of a field: the plain string, or its plural forms. */
const forms = (variant: Variant, field: Field) =>
  Object.entries(variant).filter(([key]) => key === field || key.startsWith(`${field}_`))
const fieldPlaceholders = (variant: Variant, field: Field) =>
  [...new Set(forms(variant, field).flatMap(([, text]) => placeholders(text)))].sort()
/** The plural categories integer counts can reach in a language (plus `other`, the fallback). */
const neededCategories = (locale: Locale) => {
  const rules = new Intl.PluralRules(locale)
  return new Set([...Array.from({ length: 1001 }, (_, n) => rules.select(n)), "other"])
}
const chars = (text: string) => [...text].length

describe("push copy", () => {
  it("has every language, with the level names", () => {
    expect(Object.keys(COPY).sort()).toEqual([...LOCALES].sort())
    for (const locale of LOCALES)
      for (const level of LEVELS) expect(COPY[locale].levels[level].trim(), `${locale}.${level}`).not.toBe("")
  })

  for (const locale of LOCALES) {
    describe(locale, () => {
      const copy = COPY[locale]

      it("has the same messages and variant counts as English", () => {
        expect(Object.keys(copy.messages).sort()).toEqual([...MESSAGE_KEYS].sort())
        for (const key of MESSAGE_KEYS) expect(copy.messages[key].length, key).toBe(variantCount(key))
      })

      it("uses the same placeholders, never an empty string, and complete plural forms", () => {
        const needed = neededCategories(locale)
        for (const key of MESSAGE_KEYS) {
          copy.messages[key].forEach((variant, i) => {
            const where = `${locale}.${key}[${i}]`
            for (const field of FIELDS) {
              const english = COPY.en.messages[key][i]!
              expect(fieldPlaceholders(variant, field), `${where}.${field}`).toEqual(
                fieldPlaceholders(english, field),
              )
              const all = forms(variant, field)
              expect(all.length, `${where}.${field} missing`).toBeGreaterThan(0)
              for (const [form, text] of all) expect(text.trim(), `${where}.${form}`).not.toBe("")
              const plain = variant[field] !== undefined
              if (!plain) {
                const categories = all.map(([form]) => form.slice(field.length + 1))
                for (const category of needed)
                  expect(categories, `${where}.${field}_${category}`).toContain(category)
                expect(fieldPlaceholders(variant, field), `${where}.${field} plural without count`).toContain(
                  "count",
                )
              } else {
                expect(all.length, `${where}: ${field} is both plain and plural`).toBe(1)
              }
            }
          })
        }
      })

      it("renders within the length limits, with nothing left unfilled", () => {
        for (const key of MESSAGE_KEYS) {
          for (let i = 0; i < variantCount(key); i++) {
            for (const count of COUNTS) {
              const out = render(locale, key, i, { ...PARAMS, count })
              const where = `${locale}.${key}[${i}] count=${count}`
              expect(chars(out.title), `${where} title: ${out.title}`).toBeLessThanOrEqual(TITLE_MAX)
              expect(chars(out.body), `${where} body: ${out.body}`).toBeLessThanOrEqual(BODY_MAX)
              for (const text of [out.title, out.body]) {
                expect(text, where).not.toMatch(/\{\{|\}\}|undefined|null|NaN/)
                expect(text.trim(), where).toBe(text)
              }
            }
          }
        }
      })
    })
  }

  it("picks plural forms with Intl.PluralRules and fills the level name", () => {
    expect(render("en", "wordsDue", 0, { count: 1 }).body).toBe(
      "1 word is waiting. A quick review helps it stick.",
    )
    expect(render("en", "wordsDue", 0, { count: 7 }).body).toBe(
      "7 words are waiting. A quick review helps them stick.",
    )
    expect(render("ru", "newEpisodesPodcast", 0, { count: 3, podcast: "X" }).body).toBe(
      "Вас ждут 3 новых выпуска.",
    )
    expect(render("ru", "newEpisodesPodcast", 0, { count: 5, podcast: "X" }).body).toBe(
      "Вас ждут 5 новых выпусков.",
    )
    expect(render("ar", "wordsDue", 1, { count: 2 }).body).toBe(
      "لديك كلمتان للمراجعة. لن يستغرق ذلك سوى دقيقة.",
    )
    expect(render("tr", "newEpisode", 2, { title: "Lisbon", level: "bg" }).body).toBe(
      "“Lisbon” geldi. Kolay sürümün hazır.",
    )
    expect(render("en", "newEpisodeFollowed", 0, { title: "A", podcast: "Around the World" })).toEqual({
      title: "New from Around the World",
      body: "“A” is out now. Listen at your level.",
      variant: "newEpisodeFollowed.0",
    })
  })

  it("clips long names and wraps the variant index", () => {
    const out = render("en", "continue", 4, { title: "x".repeat(80), count: 3 })
    expect(out.variant).toBe("continue.1")
    expect(out.body).toContain(`“${"x".repeat(PARAM_MAX.title! - 1)}…”`)
  })
})
