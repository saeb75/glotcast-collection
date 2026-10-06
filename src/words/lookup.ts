import lemmatizer from "wink-lemmatizer"

/** What the lookup returns (contract `WordLookup`). */
export interface WordLookup {
  word: string
  lemma: string
  phonetic: string | null
  audioUrl: string | null
  translations: { partOfSpeech: string | null; terms: string[] }[]
  definitions: { partOfSpeech: string | null; definition: string; example: string | null }[]
}

const CONTRACTIONS: Record<string, string> = {
  "don't": "do",
  "doesn't": "do",
  "didn't": "do",
  "won't": "will",
  "wouldn't": "would",
  "can't": "can",
  "couldn't": "could",
  "shouldn't": "should",
  "it's": "it",
  "he's": "he",
  "she's": "she",
  "that's": "that",
  "i'm": "i",
  "you're": "you",
  "they're": "they",
  "we're": "we",
  "i've": "i",
  "you've": "you",
  "they've": "they",
  "we've": "we",
  "i'd": "i",
  "you'd": "you",
  "he'd": "he",
  "she'd": "she",
  "i'll": "i",
  "you'll": "you",
  "he'll": "he",
}

/** A tapped token → the word: lowercase, curly quotes straightened, surrounding punctuation dropped. */
export function cleanWord(raw: string): string {
  return raw
    .toLowerCase()
    .replace(/[‘’]/g, "'")
    .trim()
    .replace(/^[^\p{L}\p{N}]+|[^\p{L}\p{N}]+$/gu, "")
}

/** The dictionary form: contractions, then verbs ("running" → "run"), then nouns ("boxes" → "box"). */
export function baseForm(word: string): string {
  if (CONTRACTIONS[word]) return CONTRACTIONS[word]
  if (!/^[a-z]+(?:[-'][a-z]+)*$/.test(word)) return word
  const verb = lemmatizer.verb(word)
  if (verb !== word) return verb
  const noun = lemmatizer.noun(word)
  if (noun !== word) return noun
  const adjective = lemmatizer.adjective(word)
  return adjective || word
}

const MAX_TERMS = 5

/** Yandex Dictionary `lookup` → translations by part of speech (first translation + synonyms) and the IPA. */
export function parseYandex(body: unknown): { translations: WordLookup["translations"]; ts: string | null } {
  const defs = ((body as { def?: unknown[] } | null)?.def ?? []) as {
    pos?: string
    ts?: string
    tr?: { text?: string; syn?: { text?: string }[] }[]
  }[]
  const translations: WordLookup["translations"] = []
  const seen = new Set<string>()
  for (const def of defs) {
    const pos = def.pos ?? null
    const key = pos ?? "-"
    if (seen.has(key)) continue
    const first = def.tr?.[0]
    if (!first?.text) continue
    seen.add(key)
    const terms = [first.text, ...(first.syn ?? []).map((s) => s.text ?? "")].filter(Boolean)
    translations.push({ partOfSpeech: pos, terms: [...new Set(terms)].slice(0, MAX_TERMS) })
  }
  return { translations, ts: defs.find((d) => d.ts)?.ts ?? null }
}

/** dictionaryapi.dev → definitions (≤ 3 per part of speech, ≤ 10 in all), phonetic and a recording. */
export function parseDictionaryApi(body: unknown): {
  definitions: WordLookup["definitions"]
  phonetic: string | null
  audioUrl: string | null
} {
  const entries = (Array.isArray(body) ? body : []) as {
    phonetic?: string
    phonetics?: { text?: string; audio?: string }[]
    meanings?: { partOfSpeech?: string; definitions?: { definition?: string; example?: string }[] }[]
  }[]
  const definitions: WordLookup["definitions"] = []
  let phonetic: string | null = null
  let audioUrl: string | null = null
  for (const entry of entries) {
    phonetic ??= entry.phonetic || entry.phonetics?.find((p) => p.text)?.text || null
    audioUrl ??= entry.phonetics?.find((p) => p.audio)?.audio || null
    for (const meaning of entry.meanings ?? []) {
      for (const d of (meaning.definitions ?? []).slice(0, 3)) {
        if (!d.definition || definitions.length >= 10) continue
        definitions.push({
          partOfSpeech: meaning.partOfSpeech ?? null,
          definition: d.definition,
          example: d.example ?? null,
        })
      }
    }
  }
  if (audioUrl?.startsWith("//")) audioUrl = `https:${audioUrl}`
  return { definitions, phonetic, audioUrl }
}

/** Google's free `translate_a/single?client=gtx&dt=t&dt=bd&dj=1` → dictionary terms, else the sentence. */
export function parseGoogleGtx(body: unknown): WordLookup["translations"] {
  const b = (body ?? {}) as { sentences?: { trans?: string }[]; dict?: { pos?: string; terms?: string[] }[] }
  const dict = (b.dict ?? [])
    .filter((d) => d.terms?.length)
    .map((d) => ({ partOfSpeech: d.pos || null, terms: d.terms!.slice(0, MAX_TERMS) }))
  if (dict.length) return dict
  const sentence = (b.sentences ?? [])
    .map((s) => s.trans ?? "")
    .join("")
    .trim()
  return sentence ? [{ partOfSpeech: null, terms: [sentence] }] : []
}

/** The free Google TTS URL for a word (the fallback pronunciation). */
export const ttsUrl = (word: string): string =>
  `https://translate.googleapis.com/translate_tts?ie=UTF-8&q=${encodeURIComponent(word)}&tl=en&client=gtx`
