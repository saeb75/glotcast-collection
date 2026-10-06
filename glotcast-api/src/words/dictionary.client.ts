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

/** How long one upstream may take before its part of the answer is left out. */
const TIMEOUT_MS = 4_000
/** English definitions are extras: once the meanings are ready, the answer waits at most this long for them. */
const DEFINITIONS_GRACE_MS = 700
/** A source that failed (timeout, network, 5xx, throttled) is skipped this long, so an unreachable one costs nothing. */
const RETRY_AFTER_MS = 10 * 60_000
/** An answer that went out without its definitions is cached this long (they may come next time). */
const PARTIAL_TTL_MS = 30 * 60_000

const delay = (ms: number) => new Promise<undefined>((resolve) => setTimeout(() => resolve(undefined), ms))

/**
 * Word lookup, as glotcast-vocab and the old app did it: Yandex Dictionary (translations by part of speech) and
 * dictionaryapi.dev (English definitions, IPA, recordings) in parallel on the base form; Google's free endpoint
 * when Yandex has nothing (or no key / no language pair) — and, since that unofficial endpoint throttles server
 * clients, Cloud Translation (the API key) when it fails; Google TTS when there is no recording. Every upstream
 * failure degrades to fewer fields, never to an error. The meanings set the response time: the definitions get a
 * short grace and, when later, join the cached answer for next time. A failing source is skipped for a while.
 * Results are cached for a day.
 */
@Injectable()
export class DictionaryClient {
  private readonly logger = new Logger(DictionaryClient.name)
  private readonly yandexKey: string | null
  private readonly cache = new TtlCache<WordLookup>(24 * 3600_000, 5_000)
  /** Hosts that failed recently, until when they are skipped. */
  private readonly downUntil = new Map<string, number>()

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
    const dictionary = this.dictionaryApi(lemma)
    const yandex = await this.yandex(lemma, tl)
    const translations = yandex.translations.length ? yandex.translations : await this.fallback(word, tl)
    const build = (d: Awaited<typeof dictionary>): WordLookup => ({
      word,
      lemma,
      phonetic: d?.phonetic ?? (yandex.ts ? `/${yandex.ts}/` : null),
      audioUrl: d?.audioUrl ?? ttsUrl(lemma),
      translations,
      definitions: d?.definitions ?? [],
    })
    const remember = (r: WordLookup, complete: boolean) => {
      if (r.translations.length || r.definitions.length)
        this.cache.set(key, r, Date.now(), complete ? undefined : PARTIAL_TTL_MS)
    }
    // The definitions get a short grace once the meanings are ready; later ones join the cache for next time.
    const inTime = await Promise.race([dictionary, delay(DEFINITIONS_GRACE_MS)])
    const result = build(inTime ?? null)
    remember(result, !!inTime)
    if (inTime === undefined)
      void dictionary.then((d) => d && remember(build(d), true)).catch(() => undefined)
    return result
  }

  /** An upstream's JSON; null when it has no answer (4xx) or failed. */
  private async json(url: string): Promise<unknown> {
    return (await this.fetchJson(url)).body
  }

  /**
   * An upstream's JSON and whether the source failed (network, timeout, 5xx, 429) — as opposed to having no entry.
   * A failure also skips that host for a while, so an unreachable source doesn't slow every lookup down.
   */
  private async fetchJson(url: string): Promise<{ body: unknown; failed: boolean }> {
    const host = new URL(url).host
    if ((this.downUntil.get(host) ?? 0) > Date.now()) return { body: null, failed: true }
    try {
      const res = await fetch(url, { signal: AbortSignal.timeout(TIMEOUT_MS) })
      if (res.status >= 500 || res.status === 429) {
        this.markDown(host, `HTTP ${res.status}`)
        return { body: null, failed: true }
      }
      return { body: res.ok ? await res.json() : null, failed: false }
    } catch (err) {
      this.markDown(host, String(err))
      return { body: null, failed: true }
    }
  }

  private markDown(host: string, why: string): void {
    this.downUntil.set(host, Date.now() + RETRY_AFTER_MS)
    this.logger.warn(`lookup source ${host} failed (${why}); skipping it for ${RETRY_AFTER_MS / 60_000} min`)
  }

  /** The English definitions; null when the source failed (not when it has no entry for the word). */
  private async dictionaryApi(lemma: string) {
    const r = await this.fetchJson(
      `https://api.dictionaryapi.dev/api/v2/entries/en/${encodeURIComponent(lemma)}`,
    )
    return r.failed ? null : parseDictionaryApi(r.body)
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
