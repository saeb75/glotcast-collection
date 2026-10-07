/**
 * Push campaigns, pure: the 16 app languages, message checks, the editor's draft ↔ the API's input, the
 * delivery choice, summaries (worded by the caller) and what a failed send or test push means.
 */
import {
  type AdminCampaign,
  type Audience,
  type AudienceSegment,
  type CampaignDelivery,
  type CampaignInput,
  type CampaignMessage,
  type CampaignPatch,
  type CampaignSource,
  type CampaignStats,
  type Level,
  type Locale,
  type PushLink,
  type PushLinkType,
} from "@/schemas/admin"
import { fromLocalInput, toLocalInput } from "./datetime"
import { formatDateTime, formatDay } from "./format"
import { LEVELS } from "./levels"

// Languages

/** The app's languages: a push is written in the user's app language. */
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
] as const satisfies readonly Locale[]

/** The languages a campaign can be written in (and machine-translated from). */
export const SOURCE_LANGUAGES = ["en", "tr"] as const satisfies readonly CampaignSource[]

export const isLocale = (value: string | null | undefined): value is Locale =>
  LOCALES.includes(value as Locale)

const displayNames = new Intl.DisplayNames(["en"], { type: "language" })

/** "de" → "German". */
export const localeName = (locale: string): string => displayNames.of(locale) ?? locale.toUpperCase()

/** The source language first, then the others by name. */
export const localesSourceFirst = (source: Locale): Locale[] => [
  source,
  ...LOCALES.filter((l) => l !== source).sort((a, b) => localeName(a).localeCompare(localeName(b))),
]

/** "A", "A or B", "A, B or C", "A, B, C and 2 more". */
export function joinNames(names: string[], last: string, max = 3): string {
  if (names.length <= 1) return names[0] ?? ""
  if (names.length > max) return `${names.slice(0, max).join(", ")} and ${names.length - max} more`
  return `${names.slice(0, -1).join(", ")} ${last} ${names[names.length - 1]}`
}

// Messages

export const NAME_MAX = 120
export const TITLE_MAX = 60
export const BODY_MAX = 180

export interface MessageDraft {
  title: string
  body: string
}
export type MessagesDraft = Record<Locale, MessageDraft>

export const emptyMessages = (): MessagesDraft =>
  Object.fromEntries(LOCALES.map((l) => [l, { title: "", body: "" }])) as MessagesDraft

/** What the API counts against the limits (it trims first). */
export const textLength = (text: string) => text.trim().length

/** Past 90 % of the limit is "near", past the limit "over". */
export const counterLevel = (length: number, max: number): "ok" | "near" | "over" =>
  length > max ? "over" : length >= Math.ceil(max * 0.9) ? "near" : "ok"

export type MessageProblem = "missing" | "incomplete" | "title_long" | "body_long"

/** Why a language's message can't be sent as is; null when it's fine. */
export function messageProblem(message: MessageDraft | undefined): MessageProblem | null {
  const title = message?.title.trim() ?? ""
  const body = message?.body.trim() ?? ""
  if (!title && !body) return "missing"
  if (!title || !body) return "incomplete"
  if (title.length > TITLE_MAX) return "title_long"
  if (body.length > BODY_MAX) return "body_long"
  return null
}

/** Languages with no text at all (their users get English, else the source language). */
export const missingLocales = (messages: Partial<Record<Locale, MessageDraft>>): Locale[] =>
  LOCALES.filter((l) => messageProblem(messages[l]) === "missing")

/** Languages ready to send. */
export const readyLocales = (messages: Partial<Record<Locale, MessageDraft>>): Locale[] =>
  LOCALES.filter((l) => messageProblem(messages[l]) === null)

const sameMessage = (a: MessageDraft | undefined, b: MessageDraft | undefined) =>
  (a?.title ?? "") === (b?.title ?? "") && (a?.body ?? "") === (b?.body ?? "")

/** Languages whose text is not the machine translation's (written or edited by hand). */
export const editedLocales = (
  messages: Partial<Record<Locale, MessageDraft>>,
  machine: Partial<Record<Locale, MessageDraft>>,
): Locale[] => LOCALES.filter((l) => machine[l] !== undefined && !sameMessage(messages[l], machine[l]))

/** The translations "Translate" would replace: other languages with text that isn't the last machine one. */
export const overwrittenByTranslate = (
  messages: Partial<Record<Locale, MessageDraft>>,
  machine: Partial<Record<Locale, MessageDraft>>,
  source: Locale,
): Locale[] =>
  LOCALES.filter(
    (l) => l !== source && messageProblem(messages[l]) !== "missing" && !sameMessage(messages[l], machine[l]),
  )

/** What the API stores: trimmed, languages without any text left out. */
export function messagesInput(
  messages: Partial<Record<Locale, MessageDraft>>,
): Record<string, CampaignMessage> {
  const out: Record<string, CampaignMessage> = {}
  for (const l of LOCALES) {
    const title = messages[l]?.title.trim() ?? ""
    const body = messages[l]?.body.trim() ?? ""
    if (title || body) out[l] = { title, body }
  }
  return out
}

/** The message a user of `locale` gets: theirs, else English, else the source language (the API's rule). */
export function messageFor(
  messages: Partial<Record<string, MessageDraft>>,
  locale: Locale,
  source: Locale,
): { language: Locale; message: MessageDraft } | null {
  for (const language of [locale, "en", source] as Locale[]) {
    const message = messages[language]
    if (message?.title.trim() && message.body.trim()) return { language, message }
  }
  return null
}

// Audience

export const SEGMENTS = [
  "all",
  "pro",
  "free",
  "guests",
  "signedIn",
] as const satisfies readonly AudienceSegment[]
export const DAYS_MAX = 3650

export interface AudienceDraft {
  segment: AudienceSegment
  levels: Level[]
  languages: Locale[]
  /** Text inputs: "" = no filter. */
  inactiveDays: string
  activeWithinDays: string
  podcastIds: string[]
}

export const emptyAudience = (): AudienceDraft => ({
  segment: "all",
  levels: [],
  languages: [],
  inactiveDays: "",
  activeWithinDays: "",
  podcastIds: [],
})

const days = (text: string): number | undefined => {
  const value = text.trim()
  const n = Number(value)
  return value && Number.isInteger(n) && n >= 1 && n <= DAYS_MAX ? n : undefined
}

/** The API's audience: empty filters left out, levels and languages in a fixed order (a stable cache key). */
export function audienceInput(d: AudienceDraft): Audience {
  const a: Audience = { segment: d.segment }
  if (d.levels.length) a.levels = LEVELS.filter((l) => d.levels.includes(l))
  if (d.languages.length) a.languages = LOCALES.filter((l) => d.languages.includes(l))
  const inactive = days(d.inactiveDays)
  if (inactive) a.inactiveDays = inactive
  const active = days(d.activeWithinDays)
  if (active) a.activeWithinDays = active
  if (d.podcastIds.length) a.podcastIds = [...d.podcastIds]
  return a
}

export const audienceDraft = (a: Audience): AudienceDraft => ({
  segment: a.segment,
  levels: a.levels ?? [],
  languages: a.languages ?? [],
  inactiveDays: a.inactiveDays ? String(a.inactiveDays) : "",
  activeWithinDays: a.activeWithinDays ? String(a.activeWithinDays) : "",
  podcastIds: a.podcastIds ?? [],
})

/** One cache key per audience (the reach). */
export const audienceKey = (a: Audience) => JSON.stringify(audienceInput(audienceDraft(a)))

/** "Not seen for N+ days" with "seen within M days" matches nobody unless M > N. */
export const audienceContradicts = (a: Pick<Audience, "inactiveDays" | "activeWithinDays">) =>
  a.inactiveDays !== undefined && a.activeWithinDays !== undefined && a.inactiveDays >= a.activeWithinDays

export interface AudienceWords {
  segments: Record<AudienceSegment, string>
  levelNames: Record<Level, string>
  levels: (names: string[]) => string
  languages: (names: string[]) => string
  inactive: (days: number) => string
  active: (days: number) => string
  podcasts: (names: string[]) => string
  unknownPodcast: string
  separator: string
}

/** "Pro users · Beginner or Intermediate · App in German or Turkish · Following Lisbon Mornings". */
export function audienceSummary(
  a: Audience,
  words: AudienceWords,
  podcastName: (id: string) => string | undefined = () => undefined,
): string {
  const parts = [words.segments[a.segment]]
  if (a.levels?.length) parts.push(words.levels(a.levels.map((l) => words.levelNames[l])))
  if (a.languages?.length) parts.push(words.languages(a.languages.map(localeName)))
  if (a.inactiveDays) parts.push(words.inactive(a.inactiveDays))
  if (a.activeWithinDays) parts.push(words.active(a.activeWithinDays))
  if (a.podcastIds?.length)
    parts.push(words.podcasts(a.podcastIds.map((id) => podcastName(id) ?? words.unknownPodcast)))
  return parts.join(words.separator)
}

// The link a tap opens

export const LINK_TYPES = [
  "home",
  "episode",
  "player",
  "podcast",
  "paywall",
  "review",
  "words",
] as const satisfies readonly PushLinkType[]

/** Episode, player and podcast links need the record's id (400 otherwise). */
export const linkNeedsId = (type: PushLinkType) =>
  type === "episode" || type === "player" || type === "podcast"
export const linksEpisode = (type: PushLinkType) => type === "episode" || type === "player"

export interface LinkDraft {
  type: PushLinkType
  id: string
  /** Player only; "" = the user's own level. */
  level: Level | ""
}

/** Only what the type uses: an id for episode / player / podcast, a level for the player. */
export function linkInput(d: LinkDraft): PushLink {
  const link: PushLink = { type: d.type }
  if (linkNeedsId(d.type) && d.id) link.id = d.id
  if (d.type === "player" && d.level) link.level = d.level
  return link
}

export const linkDraft = (l: PushLink): LinkDraft => ({ type: l.type, id: l.id ?? "", level: l.level ?? "" })

/** Another link type: an episode id survives between episode and player, nothing else does. */
export const withLinkType = (d: LinkDraft, type: PushLinkType): LinkDraft => ({
  type,
  id: linksEpisode(d.type) && linksEpisode(type) ? d.id : "",
  level: type === "player" ? d.level : "",
})

// Delivery

export type DeliveryMode = CampaignDelivery["mode"]
export const DELIVERY_MODES = ["now", "at", "local"] as const satisfies readonly DeliveryMode[]
export const HM_RE = /^([01]\d|2[0-3]):[0-5]\d$/
const DATE_RE = /^\d{4}-\d{2}-\d{2}$/

export interface DeliveryDraft {
  mode: DeliveryMode
  /** `<input type="datetime-local">`, the viewer's time. */
  at: string
  /** "YYYY-MM-DD" and "HH:mm", each user's local time. */
  date: string
  time: string
}

const pad = (n: number) => String(n).padStart(2, "0")

/** The viewer's calendar date: "2026-10-07". */
export const localDateOf = (now: Date) =>
  `${now.getFullYear()}-${pad(now.getMonth() + 1)}-${pad(now.getDate())}`

/** Now; or in an hour or two (on the hour); or tomorrow at 10:00 local time. */
export function defaultDelivery(now: Date): DeliveryDraft {
  const at = new Date(now)
  at.setHours(at.getHours() + 2, 0, 0, 0)
  const tomorrow = new Date(now)
  tomorrow.setDate(tomorrow.getDate() + 1)
  return { mode: "now", at: toLocalInput(at.toISOString()), date: localDateOf(tomorrow), time: "10:00" }
}

export type DeliveryProblem = "at_missing" | "at_past" | "date_missing" | "date_past" | "time_missing"

export function deliveryProblem(d: DeliveryDraft, now: Date): DeliveryProblem | null {
  if (d.mode === "at") {
    const iso = fromLocalInput(d.at)
    if (!iso) return "at_missing"
    if (Date.parse(iso) <= now.getTime()) return "at_past"
  }
  if (d.mode === "local") {
    if (!DATE_RE.test(d.date)) return "date_missing"
    if (!HM_RE.test(d.time)) return "time_missing"
    if (d.date < localDateOf(now)) return "date_past"
  }
  return null
}

/** "local" today: users whose time passed more than an hour ago are skipped. */
export const deliveryIsLateToday = (d: DeliveryDraft, now: Date) =>
  d.mode === "local" && d.date === localDateOf(now)

/** What `send` takes; null while the choice is incomplete. */
export function deliveryInput(d: DeliveryDraft): CampaignDelivery | null {
  if (d.mode === "now") return { mode: "now" }
  if (d.mode === "at") {
    const sendAt = fromLocalInput(d.at)
    return sendAt ? { mode: "at", sendAt } : null
  }
  return DATE_RE.test(d.date) && HM_RE.test(d.time) ? { mode: "local", date: d.date, time: d.time } : null
}

export interface DeliveryWords {
  none: string
  now: string
  at: (when: string) => string
  local: (day: string, time: string) => string
}

/** "Right away" · "On Oct 9, 2026, 10:00 AM" · "On Oct 9, 2026 at 09:00, each user's local time". */
export function deliverySummary(d: CampaignDelivery | null, words: DeliveryWords): string {
  if (!d) return words.none
  if (d.mode === "now") return words.now
  if (d.mode === "at") return words.at(formatDateTime(d.sendAt))
  return words.local(formatDay(d.date), d.time)
}

// The whole campaign

export interface CampaignDraft {
  name: string
  sourceLanguage: CampaignSource
  messages: MessagesDraft
  audience: AudienceDraft
  link: LinkDraft
  imageUrl: string | null
  respectQuietHours: boolean
}

export const newCampaignDraft = (): CampaignDraft => ({
  name: "",
  sourceLanguage: "en",
  messages: emptyMessages(),
  audience: emptyAudience(),
  link: { type: "home", id: "", level: "" },
  imageUrl: null,
  respectQuietHours: true,
})

export function draftFromCampaign(c: AdminCampaign): CampaignDraft {
  const messages = emptyMessages()
  for (const l of LOCALES) {
    const m = c.messages[l]
    if (m) messages[l] = { title: m.title, body: m.body }
  }
  return {
    name: c.name,
    sourceLanguage: c.sourceLanguage,
    messages,
    audience: audienceDraft(c.audience),
    link: linkDraft(c.link),
    imageUrl: c.imageUrl,
    respectQuietHours: c.respectQuietHours,
  }
}

/** What POST takes (and PATCH, field by field). */
export const campaignInput = (
  d: CampaignDraft,
): Required<Omit<CampaignInput, "imageUrl">> & {
  imageUrl: string | null
} => ({
  name: d.name.trim(),
  sourceLanguage: d.sourceLanguage,
  messages: messagesInput(d.messages),
  audience: audienceInput(d.audience),
  link: linkInput(d.link),
  imageUrl: d.imageUrl,
  respectQuietHours: d.respectQuietHours,
})

/** The fields that changed, for PATCH (the audit log records what was sent). */
export function campaignPatch(base: CampaignDraft, draft: CampaignDraft): CampaignPatch {
  const before = campaignInput(base)
  const after = campaignInput(draft)
  const patch: Record<string, unknown> = {}
  for (const key of Object.keys(after) as (keyof typeof after)[])
    if (JSON.stringify(before[key]) !== JSON.stringify(after[key])) patch[key] = after[key]
  return patch as CampaignPatch
}

/** Text typed in a days filter counts as a change even before it is a valid number. */
const draftKey = (d: CampaignDraft) =>
  JSON.stringify([campaignInput(d), d.audience.inactiveDays.trim(), d.audience.activeWithinDays.trim()])

export const sameDraft = (a: CampaignDraft, b: CampaignDraft) => draftKey(a) === draftKey(b)

/** The values `campaignFormSchema` checks (numbers parsed, only languages with text). */
export function campaignFormValues(d: CampaignDraft) {
  const number = (text: string) => (text.trim() === "" ? null : Number(text))
  return {
    name: d.name,
    sourceLanguage: d.sourceLanguage,
    messages: Object.fromEntries(
      LOCALES.filter((l) => messageProblem(d.messages[l]) !== "missing").map((l) => [l, d.messages[l]]),
    ),
    audience: {
      ...d.audience,
      inactiveDays: number(d.audience.inactiveDays),
      activeWithinDays: number(d.audience.activeWithinDays),
    },
    link: d.link,
    imageUrl: d.imageUrl,
    respectQuietHours: d.respectQuietHours,
  }
}

// Sending and testing

const UUID_RE = /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i
const EMAIL_RE = /^[^\s@]+@[^\s@]+\.[^\s@]+$/

export const isUuid = (value: string) => UUID_RE.test(value.trim())

/** A test push's recipient typed by the admin: a user id or an email; null when it is neither. */
export function testTarget(text: string): { userId: string } | { email: string } | null {
  const value = text.trim()
  if (UUID_RE.test(value)) return { userId: value.toLowerCase() }
  if (EMAIL_RE.test(value)) return { email: value.toLowerCase() }
  return null
}

export type SendFailure = "not_configured" | "disabled" | "no_source_message" | "past" | "not_draft" | "other"

/** Why `send` was refused, from the error's code and the API's detail. */
export function sendFailure(code: string, detail: string): SendFailure {
  if (code === "unavailable")
    return /NOTIFICATIONS_ENABLED|disabled/i.test(detail) ? "disabled" : "not_configured"
  if (code === "conflict") return "not_draft"
  if (code === "invalid" && /source language/i.test(detail)) return "no_source_message"
  if (code === "invalid" && /past/i.test(detail)) return "past"
  return "other"
}

export type TestFailure =
  | "no_account"
  | "no_subscription"
  | "not_configured"
  | "onesignal_down"
  | "onesignal_refused"
  | "no_message"
  | "other"

/** Why a test push failed (404 no app account, 409 no subscription, 503 no OneSignal, 400 no message). */
export function testFailure(code: string, status: number | undefined, detail: string): TestFailure {
  if (code === "not_found" && /user/i.test(detail)) return "no_account"
  if (code === "conflict") return "no_subscription"
  if (code === "unavailable") return /answer/i.test(detail) ? "onesignal_down" : "not_configured"
  if (status === 502) return "onesignal_refused"
  if (code === "invalid" && /no message/i.test(detail)) return "no_message"
  return "other"
}

// Results

export interface CampaignNumbers {
  delivered: number
  /** Where `delivered` comes from: OneSignal's confirmed deliveries, its accepted pushes, or our sends. */
  deliveredBy: "received" | "successful" | "sent"
  clicked: number
  /** OneSignal's clicks, or the opens the app reported. */
  clickedBy: "converted" | "opened"
  /** Clicked per delivered (0–1); null before anything was delivered. */
  ctr: number | null
}

export function campaignNumbers(s: CampaignStats): CampaignNumbers {
  const os = s.onesignal
  const [delivered, deliveredBy]: [number, CampaignNumbers["deliveredBy"]] =
    os && os.received > 0
      ? [os.received, "received"]
      : os && os.successful > 0
        ? [os.successful, "successful"]
        : [s.sent, "sent"]
  const [clicked, clickedBy]: [number, CampaignNumbers["clickedBy"]] =
    os && os.converted > 0 ? [os.converted, "converted"] : [s.opened, "opened"]
  return {
    delivered,
    deliveredBy,
    clicked,
    clickedBy,
    ctr: delivered > 0 ? Math.min(1, clicked / delivered) : null,
  }
}

/** Scheduled and sending campaigns can be canceled, not deleted. */
export const isLive = (status: AdminCampaign["status"]) => status === "scheduled" || status === "sending"
