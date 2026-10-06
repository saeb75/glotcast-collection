import { describe, expect, it } from "vitest"
import { baseForm, cleanWord, parseDictionaryApi, parseGoogleGtx, parseYandex, ttsUrl } from "./lookup"

describe("cleanWord / baseForm", () => {
  it("cleans a tapped token", () => {
    expect(cleanWord("  Running,")).toBe("running")
    expect(cleanWord("“Don’t”")).toBe("don't")
    expect(cleanWord("well-known.")).toBe("well-known")
  })
  it("finds the dictionary form", () => {
    expect(baseForm("running")).toBe("run")
    expect(baseForm("went")).toBe("go")
    expect(baseForm("boxes")).toBe("box")
    expect(baseForm("don't")).toBe("do")
    expect(baseForm("happier")).toBe("happy")
    expect(baseForm("coffee")).toBe("coffee")
  })
})

describe("parseYandex", () => {
  it("keeps the first translation and its synonyms per part of speech, and the IPA", () => {
    const body = {
      def: [
        {
          text: "run",
          pos: "verb",
          ts: "rʌn",
          tr: [{ text: "koşmak", syn: [{ text: "çalıştırmak" }, { text: "yönetmek" }] }],
        },
        { text: "run", pos: "noun", ts: "rʌn", tr: [{ text: "koşu" }] },
        { text: "run", pos: "verb", tr: [{ text: "ignored: second verb entry" }] },
      ],
    }
    expect(parseYandex(body)).toEqual({
      translations: [
        { partOfSpeech: "verb", terms: ["koşmak", "çalıştırmak", "yönetmek"] },
        { partOfSpeech: "noun", terms: ["koşu"] },
      ],
      ts: "rʌn",
    })
  })
  it("survives an empty or odd body", () => {
    expect(parseYandex({})).toEqual({ translations: [], ts: null })
    expect(parseYandex(null)).toEqual({ translations: [], ts: null })
  })
})

describe("parseDictionaryApi", () => {
  it("collects definitions, the phonetic and a recording", () => {
    const body = [
      {
        word: "run",
        phonetics: [{ text: "/ɹʌn/" }, { audio: "//ssl.gstatic.com/run.mp3" }],
        meanings: [
          {
            partOfSpeech: "verb",
            definitions: [
              { definition: "To move swiftly.", example: "She ran home." },
              { definition: "Two" },
              { definition: "Three" },
              { definition: "Four (dropped)" },
            ],
          },
          { partOfSpeech: "noun", definitions: [{ definition: "An act of running." }] },
        ],
      },
    ]
    const out = parseDictionaryApi(body)
    expect(out.phonetic).toBe("/ɹʌn/")
    expect(out.audioUrl).toBe("https://ssl.gstatic.com/run.mp3")
    expect(out.definitions).toHaveLength(4)
    expect(out.definitions[0]).toEqual({
      partOfSpeech: "verb",
      definition: "To move swiftly.",
      example: "She ran home.",
    })
    expect(out.definitions[3]).toEqual({
      partOfSpeech: "noun",
      definition: "An act of running.",
      example: null,
    })
  })
  it("returns nothing for a 'not found' body", () => {
    expect(parseDictionaryApi({ title: "No Definitions Found" })).toEqual({
      definitions: [],
      phonetic: null,
      audioUrl: null,
    })
  })
})

describe("parseGoogleGtx", () => {
  it("prefers dictionary terms, falls back to the sentence", () => {
    expect(
      parseGoogleGtx({
        sentences: [{ trans: "koşmak" }],
        dict: [{ pos: "verb", terms: ["koşmak", "a", "b", "c", "d", "e"] }],
      }),
    ).toEqual([{ partOfSpeech: "verb", terms: ["koşmak", "a", "b", "c", "d"] }])
    expect(parseGoogleGtx({ sentences: [{ trans: "merhaba " }, { trans: "dünya" }] })).toEqual([
      { partOfSpeech: null, terms: ["merhaba dünya"] },
    ])
    expect(parseGoogleGtx({})).toEqual([])
  })
  it("builds the TTS URL", () => {
    expect(ttsUrl("well done")).toBe(
      "https://translate.googleapis.com/translate_tts?ie=UTF-8&q=well%20done&tl=en&client=gtx",
    )
  })
})
