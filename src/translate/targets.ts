/**
 * The app speaks BCP-47-ish codes ("tr", "pt-BR", "zh-Hant"); Google's translation endpoints want their own:
 * mostly the bare language, with the Chinese scripts and European Portuguese kept apart.
 */
export function googleTarget(code: string): string {
  const [language = "", ...rest] = code.trim().split(/[-_]/)
  const lang = language.toLowerCase()
  const tags = rest.map((t) => t.toLowerCase())
  if (lang === "zh") {
    return tags.some((t) => t === "hant" || t === "tw" || t === "hk" || t === "mo") ? "zh-TW" : "zh-CN"
  }
  if (lang === "pt" && tags.includes("pt")) return "pt-PT"
  if (lang === "fr" && tags.includes("ca")) return "fr-CA"
  return lang
}

/** Translating English into English: the text itself. */
export const isEnglish = (code: string): boolean => googleTarget(code) === "en"
