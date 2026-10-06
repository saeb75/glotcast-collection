import { afterEach, describe, expect, it, vi } from "vitest"
import { type AppConfig } from "../config/app-config.service"
import { type GoogleTranslateClient } from "../translate/google-translate.client"
import { DictionaryClient } from "./dictionary.client"

const DICTIONARY_API = [
  {
    phonetics: [{ text: "/ɹʌn/", audio: "https://api.dictionaryapi.dev/media/run.mp3" }],
    meanings: [{ partOfSpeech: "verb", definitions: [{ definition: "To move swiftly.", example: "Run!" }] }],
  },
]
const YANDEX = { def: [{ pos: "verb", ts: "rʌn", tr: [{ text: "koşmak", syn: [{ text: "çalışmak" }] }] }] }
const GTX = { sentences: [{ trans: "koşma" }], dict: [{ pos: "noun", terms: ["koşu", "koşma"] }] }

type Route = (url: URL) => { status: number; body: unknown } | undefined
const json = (status: number, body: unknown) => ({ status, body })

function stubFetch(route: Route) {
  const calls: string[] = []
  vi.stubGlobal(
    "fetch",
    vi.fn((input: string) => {
      const url = new URL(input)
      calls.push(url.host)
      const hit = route(url) ?? json(404, { title: "No Definitions Found" })
      return Promise.resolve(
        new Response(typeof hit.body === "string" ? hit.body : JSON.stringify(hit.body), {
          status: hit.status,
        }),
      )
    }),
  )
  return calls
}

const client = (
  yandexKey: string | undefined,
  cloud: Partial<GoogleTranslateClient> = { configured: false },
) =>
  new DictionaryClient(
    { get: (key: string) => (key === "YANDEX_DICT_KEY" ? yandexKey : undefined) } as unknown as AppConfig,
    cloud as GoogleTranslateClient,
  )

describe("DictionaryClient", () => {
  afterEach(() => {
    vi.unstubAllGlobals()
  })

  it("Yandex translations + dictionaryapi.dev definitions, on the base form", async () => {
    const calls = stubFetch((url) =>
      url.host === "api.dictionaryapi.dev"
        ? url.pathname.endsWith("/run")
          ? json(200, DICTIONARY_API)
          : undefined
        : url.host === "dictionary.yandex.net" && url.searchParams.get("lang") === "en-tr"
          ? json(200, YANDEX)
          : undefined,
    )
    const out = await client("yx").lookup("Running,", "tr")
    expect(out).toEqual({
      word: "running",
      lemma: "run",
      phonetic: "/ɹʌn/",
      audioUrl: "https://api.dictionaryapi.dev/media/run.mp3",
      translations: [{ partOfSpeech: "verb", terms: ["koşmak", "çalışmak"] }],
      definitions: [{ partOfSpeech: "verb", definition: "To move swiftly.", example: "Run!" }],
    })
    expect(calls.sort()).toEqual(["api.dictionaryapi.dev", "dictionary.yandex.net"])
  })

  it("falls back to Google's free endpoint, then to Cloud Translation, then TTS for audio", async () => {
    stubFetch((url) => (url.host === "translate.googleapis.com" ? json(200, GTX) : undefined))
    const free = await client(undefined).lookup("running", "pt-BR")
    expect(free.translations).toEqual([{ partOfSpeech: "noun", terms: ["koşu", "koşma"] }])
    expect(free.audioUrl).toBe(
      "https://translate.googleapis.com/translate_tts?ie=UTF-8&q=run&tl=en&client=gtx",
    )
    expect(free.phonetic).toBeNull()

    // The free endpoint throttles servers (429 with an HTML page): the keyed API answers instead.
    stubFetch((url) => (url.host === "translate.googleapis.com" ? json(429, "<html>busy</html>") : undefined))
    const translate = vi.fn().mockResolvedValue(["corrida"])
    const keyed = await client(undefined, { configured: true, translate }).lookup("running", "pt-BR")
    expect(keyed.translations).toEqual([{ partOfSpeech: null, terms: ["corrida"] }])
    expect(translate).toHaveBeenCalledWith(["running"], "pt")

    const failing = vi.fn().mockRejectedValue(new Error("quota"))
    const nothing = await client(undefined, { configured: true, translate: failing }).lookup("walked", "de")
    expect(nothing.translations).toEqual([])
  })

  it("caches answers per (target, word) for a day", async () => {
    const calls = stubFetch((url) => (url.host === "translate.googleapis.com" ? json(200, GTX) : undefined))
    const c = client(undefined)
    await c.lookup("Running", "tr")
    const count = calls.length
    await c.lookup("running.", "tr")
    expect(calls.length).toBe(count)
    await c.lookup("running", "de")
    expect(calls.length).toBeGreaterThan(count)
  })

  it("answers with the meanings without waiting for slow definitions, which join the cache later", async () => {
    vi.useFakeTimers()
    try {
      let release: (r: Response) => void = () => {}
      vi.stubGlobal(
        "fetch",
        vi.fn((input: string) => {
          const url = new URL(input)
          if (url.host === "api.dictionaryapi.dev") return new Promise<Response>((r) => (release = r))
          return Promise.resolve(new Response(JSON.stringify(YANDEX), { status: 200 }))
        }),
      )
      const c = client("yx")
      const pending = c.lookup("run", "tr")
      await vi.advanceTimersByTimeAsync(700)
      const first = await pending
      expect(first.translations).toEqual([{ partOfSpeech: "verb", terms: ["koşmak", "çalışmak"] }])
      expect(first.definitions).toEqual([])
      release(new Response(JSON.stringify(DICTIONARY_API), { status: 200 }))
      await vi.advanceTimersByTimeAsync(0)
      const again = await c.lookup("run", "tr")
      expect(again.definitions).toEqual([
        { partOfSpeech: "verb", definition: "To move swiftly.", example: "Run!" },
      ])
    } finally {
      vi.useRealTimers()
    }
  })

  it("skips a source that failed for a while instead of waiting on it again", async () => {
    const calls = stubFetch((url) =>
      url.host === "api.dictionaryapi.dev"
        ? json(503, "down")
        : url.host === "dictionary.yandex.net"
          ? json(200, YANDEX)
          : undefined,
    )
    const c = client("yx")
    await c.lookup("run", "tr")
    await c.lookup("walk", "tr")
    expect(calls.filter((h) => h === "api.dictionaryapi.dev")).toHaveLength(1)
    expect(calls.filter((h) => h === "dictionary.yandex.net")).toHaveLength(2)
  })
})
