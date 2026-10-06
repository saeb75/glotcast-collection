import { describe, expect, it } from "vitest"
import { type TranscriptChunk } from "@/schemas/admin"
import {
  activeIndex,
  availableModes,
  chunksFor,
  mergeChunks,
  mergeWithNext,
  nextSpeaker,
  plainText,
  removeAt,
  speakersOf,
  splitAt,
  splitChunk,
  transcriptIssues,
  withText,
  withTime,
} from "./transcript"

const timed: TranscriptChunk = {
  text: "Hello there my friend",
  speaker: "A",
  start: 1,
  end: 3,
  words: [
    { text: "Hello", start: 1, end: 1.4 },
    { text: "there", start: 1.5, end: 1.9 },
    { text: "my", start: 2.1, end: 2.3 },
    { text: "friend", start: 2.4, end: 3 },
  ],
}
const plain: TranscriptChunk = { text: "abcd efgh", speaker: null, start: 10, end: 12 }

describe("splitChunk", () => {
  it("cuts between words at the caret, using word timings", () => {
    const parts = splitChunk(timed, "Hello there".length)
    expect(parts).not.toBeNull()
    const [a, b] = parts!
    expect(a).toMatchObject({ text: "Hello there", start: 1, end: 1.9, speaker: "A" })
    expect(b).toMatchObject({ text: "my friend", start: 2.1, end: 3, speaker: "A" })
    expect(a.words).toHaveLength(2)
    expect(b.words).toHaveLength(2)
  })

  it("moves a caret inside a word to that word's end", () => {
    const [a, b] = splitChunk(timed, 2)!
    expect(a.text).toBe("Hello")
    expect(b.text).toBe("there my friend")
  })

  it("shares the time by characters without word timings", () => {
    const [a, b] = splitChunk(plain, 4)!
    expect(a).toMatchObject({ text: "abcd", start: 10, end: 11 })
    expect(b).toMatchObject({ text: "efgh", start: 11, end: 12 })
    expect(a.words).toBeUndefined()
  })

  it("splits near the middle without a caret, and refuses a single word", () => {
    expect(splitChunk(timed)!.map((c) => c.text)).toEqual(["Hello there", "my friend"])
    expect(splitChunk({ ...plain, text: "word" })).toBeNull()
    expect(splitChunk(plain, 0)).toBeNull()
    expect(splitChunk(plain, plain.text.length)).toBeNull()
  })
})

describe("merge, remove, split in a list", () => {
  it("merges two lines over their whole span, keeping words only when both have them", () => {
    const [a, b] = splitChunk(timed, "Hello there".length)!
    expect(mergeChunks(a, b)).toEqual({ ...timed })
    expect(mergeChunks(timed, plain).words).toBeUndefined()
    expect(mergeChunks(timed, plain)).toMatchObject({ start: 1, end: 12, speaker: "A" })
  })

  it("works on the array, leaving it alone when there is nothing to do", () => {
    const list = [timed, plain]
    expect(splitAt(list, 0, 5)).toHaveLength(3)
    expect(mergeWithNext(list, 0)).toHaveLength(1)
    expect(mergeWithNext(list, 1)).toEqual(list)
    expect(removeAt(list, 0)).toEqual([plain])
  })
})

describe("withText", () => {
  it("keeps word timings for a same-length fix and drops them otherwise", () => {
    expect(withText(timed, "Hello there my friends").words?.[3]).toEqual({
      text: "friends",
      start: 2.4,
      end: 3,
    })
    expect(withText(timed, "Hello friend").words).toBeUndefined()
  })
})

describe("withTime", () => {
  it("keeps lines non-negative, inside the audio and at least 50 ms long", () => {
    expect(withTime(plain, "start", -2).start).toBe(0)
    expect(withTime(plain, "start", 13).start).toBe(11.95)
    expect(withTime(plain, "end", 9).end).toBe(10.05)
    expect(withTime(plain, "end", 99, 11.5).end).toBe(11.5)
    expect(withTime(plain, "end", 12.345).end).toBe(12.35)
  })
})

describe("activeIndex", () => {
  it("finds the line being played, none between lines", () => {
    const list = [timed, plain]
    expect(activeIndex(list, 0.5)).toBe(-1)
    expect(activeIndex(list, 1)).toBe(0)
    expect(activeIndex(list, 2.99)).toBe(0)
    expect(activeIndex(list, 5)).toBe(-1)
    expect(activeIndex(list, 11)).toBe(1)
  })
})

describe("speakers, text, issues, modes", () => {
  it("lists speakers and proposes the next letter", () => {
    expect(speakersOf([timed, plain, { ...plain, speaker: "C" }])).toEqual(["A", "C"])
    expect(nextSpeaker(["A", "B"])).toBe("C")
  })

  it("joins the text", () => {
    expect(plainText([timed, plain])).toBe("Hello there my friend abcd efgh")
  })

  it("blocks empty and backwards lines, warns about overlaps and lines past the end", () => {
    const issues = transcriptIssues(
      [timed, { ...plain, text: " " }, { ...plain, start: 5, end: 4 }, { ...plain, start: 4, end: 40 }],
      20,
    )
    expect(issues.filter((i) => i.blocking).map((i) => [i.index, i.kind])).toEqual([
      [1, "empty"],
      [2, "range"],
    ])
    expect(issues.filter((i) => !i.blocking).map((i) => i.kind)).toEqual(["overlap", "beyond"])
  })

  it("reads a finished transcription's groupings", () => {
    const result = { status: "completed" as const, utterances: [timed], sentences: [] }
    expect(availableModes(result)).toEqual(["utterance"])
    expect(chunksFor(result, "utterance")).toEqual([timed])
    expect(chunksFor(result, "paragraph")).toEqual([])
    expect(availableModes(undefined)).toEqual([])
  })
})

describe("parseTimestamp", () => {
  it("reads seconds and clock times", async () => {
    const { parseTimestamp } = await import("./transcript")
    expect(parseTimestamp("83.4")).toBe(83.4)
    expect(parseTimestamp("01:23.4")).toBe(83.4)
    expect(parseTimestamp("1:02:03.5")).toBe(3723.5)
    expect(parseTimestamp("abc")).toBeNull()
    expect(parseTimestamp("")).toBeNull()
  })
})
