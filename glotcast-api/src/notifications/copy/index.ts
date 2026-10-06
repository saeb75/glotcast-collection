import { LEVELS } from "../../database/schema/app"
import { type Locale } from "../locales"
import { ar } from "./ar"
import { de } from "./de"
import { type Copy, en, type Field, type MessageKey, type Params, type Variant } from "./en"
import { es } from "./es"
import { fr } from "./fr"
import { hi } from "./hi"
import { id } from "./id"
import { it } from "./it"
import { ja } from "./ja"
import { ko } from "./ko"
import { pl } from "./pl"
import { pt } from "./pt"
import { ru } from "./ru"
import { tr } from "./tr"
import { vi } from "./vi"
import { zh } from "./zh"

export { type Copy, type MessageKey, MESSAGE_KEYS, type Params, type Variant } from "./en"

export const COPY: Record<Locale, Copy> = { ar, de, en, es, fr, hi, id, it, ja, ko, pl, pt, ru, tr, vi, zh }

/** Inserted names are clipped so a long title can't push the text past what a banner shows. */
export const PARAM_MAX: Partial<Record<keyof Params, number>> = { title: 40, podcast: 24 }
export const TITLE_MAX = 50
export const BODY_MAX = 150

const clip = (text: string, max: number): string => {
  const chars = [...text.trim()]
  return chars.length <= max
    ? chars.join("")
    : `${chars
        .slice(0, max - 1)
        .join("")
        .trimEnd()}…`
}

const pluralRules = new Map<Locale, Intl.PluralRules>()
function pluralCategory(locale: Locale, count: number): string {
  let rules = pluralRules.get(locale)
  if (!rules) pluralRules.set(locale, (rules = new Intl.PluralRules(locale)))
  return rules.select(count)
}

/** A field's template: the plain string, or the plural form for `count` (falling back to `_other`). */
export function template(variant: Variant, field: Field, locale: Locale, count = 0): string {
  const plain = variant[field]
  if (plain !== undefined) return plain
  const category = pluralCategory(locale, count) as "other"
  return variant[`${field}_${category}`] ?? variant[`${field}_other`] ?? ""
}

export function interpolate(text: string, locale: Locale, params: Params): string {
  return text.replace(/\{\{\s*(\w+)\s*\}\}/g, (whole, name: string) => {
    const key = name as keyof Params
    const value = params[key]
    if (value === undefined) return whole
    if (key === "level")
      return (LEVELS as readonly string[]).includes(String(value)) ? COPY[locale].levels[params.level!] : ""
    if (typeof value === "number") return String(value)
    const max = PARAM_MAX[key]
    return max ? clip(value, max) : value
  })
}

export const variantCount = (key: MessageKey): number => en.messages[key].length

export interface Rendered {
  title: string
  body: string
  /** "<message>.<index>", kept in the send log. */
  variant: string
}

/** Variant `index` (wrapped) of a message in `locale`, with its params filled in. */
export function render(locale: Locale, key: MessageKey, index: number, params: Params): Rendered {
  const variants = COPY[locale].messages[key]
  const i = ((index % variants.length) + variants.length) % variants.length
  const variant = variants[i]!
  return {
    title: interpolate(template(variant, "title", locale, params.count), locale, params),
    body: interpolate(template(variant, "body", locale, params.count), locale, params),
    variant: `${key}.${i}`,
  }
}
