import { Injectable, Logger } from "@nestjs/common"
import { TtlCache } from "../common/ttl-cache"
import { AppConfig } from "../config/app-config.service"
import { GoogleTranslateClient } from "../translate/google-translate.client"
import { googleTarget } from "../translate/targets"
import {
  baseForm,
  cleanWord,
  parseDictionaryApi,
  parseGoogleGtx,
  parseYandex,
  ttsUrl,
  type WordLookup,
} from "./lookup"

const TIMEOUT_MS = 6_000

/**
 * Word lookup, as glotcast-vocab and the old app did it: Yandex Dictionary (translations by part of speech) and
 * dictionaryapi.dev (English definitions, IPA, recordings) in parallel on the base form; Google's free endpoint
 * when Yandex has nothing (or no key / no language pair) — and, since that unofficial endpoint throttles server
 * clients, Cloud Translation (the API key) when it fails; Google TTS when there is no recording. Every upstream
 * failure degrades to fewer fields, never to an error. Results are cached for a day.
 */
@Injectable()
export class DictionaryClient {
  private readonly logger = new Logger(DictionaryClient.name)
  private readonly yandexKey: string | null
  private readonly cache = new TtlCache<WordLookup>(24 * 3600_000, 5_000)

  constructor(
    config: AppConfig,
    private readonly cloud: GoogleTranslateClient,
  ) {
    this.yandexKey = config.get("YANDEX_DICT_KEY") ?? null
  }

  async lookup(raw: string, target: string): Promise<WordLookup> {
    const word = cleanWord(raw) || raw.trim().toLowerCase()
    const lemma = baseForm(word)
    const key = `${googleTarget(target)}|${word}`
    const hit = this.cache.get(key)
    if (hit) return hit
    const tl = googleTarget(target)
    const [dictionary, yandex] = await Promise.all([this.dictionaryApi(lemma), this.yandex(lemma, tl)])
    const translations = yandex.translations.length ? yandex.translations : await this.fallback(word, tl)
    const result: WordLookup = {
      word,
      lemma,
      phonetic: dictionary.phonetic ?? (yandex.ts ? `/${yandex.ts}/` : null),
      audioUrl: dictionary.audioUrl ?? ttsUrl(lemma),
      translations,
      definitions: dictionary.definitions,
    }
    if (translations.length || result.definitions.length) this.cache.set(key, result)
    return result
  }

  private async json(url: string): Promise<unknown> {
    try {
      const res = await fetch(url, { signal: AbortSignal.timeout(TIMEOUT_MS) })
      if (!res.ok) return null
      return await res.json()
    } catch (err) {
      this.logger.debug(`lookup source failed: ${new URL(url).host} (${String(err)})`)
      return null
    }
  }

  private async dictionaryApi(lemma: string) {
    return parseDictionaryApi(
      await this.json(`https://api.dictionaryapi.dev/api/v2/entries/en/${encodeURIComponent(lemma)}`),
    )
  }

  private async yandex(lemma: string, tl: string) {
    if (!this.yandexKey || tl === "en") return { translations: [], ts: null }
    const lang = tl.split("-")[0]!
    return parseYandex(
      await this.json(
        `https://dictionary.yandex.net/api/v1/dicservice.json/lookup?key=${encodeURIComponent(this.yandexKey)}` +
          `&lang=en-${lang}&text=${encodeURIComponent(lemma)}`,
      ),
    )
  }

  /** Google's free dictionary endpoint, else a plain Cloud Translation of the word. */
  private async fallback(word: string, tl: string): Promise<WordLookup["translations"]> {
    if (tl === "en") return []
    const free = await this.google(word, tl)
    if (free.length || !this.cloud.configured) return free
    try {
      const [text] = await this.cloud.translate([word], tl)
      return text ? [{ partOfSpeech: null, terms: [text] }] : []
    } catch {
      return []
    }
  }

  private async google(word: string, tl: string) {
    return parseGoogleGtx(
      await this.json(
        `https://translate.googleapis.com/translate_a/single?client=gtx&sl=en&tl=${encodeURIComponent(tl)}` +
          `&dt=t&dt=bd&dj=1&q=${encodeURIComponent(word)}`,
      ),
    )
  }
}
