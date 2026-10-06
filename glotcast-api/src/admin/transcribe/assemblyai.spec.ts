import { describe, expect, it } from "vitest"
import { jobStatus, toChunks } from "./assemblyai"

describe("toChunks", () => {
  it("converts milliseconds to seconds and keeps the words", () => {
    expect(
      toChunks([
        {
          text: " Hello there. ",
          start: 120,
          end: 1830,
          speaker: "A",
          words: [
            { text: "Hello", start: 120, end: 540 },
            { text: "there.", start: 600, end: 1830 },
          ],
        },
        { text: "", start: 2000, end: 2100, speaker: "B" },
        { text: "Hi.", start: 2000, end: 2333.4, speaker: null, words: null },
      ]),
    ).toEqual([
      {
        text: "Hello there.",
        speaker: "A",
        start: 0.12,
        end: 1.83,
        words: [
          { text: "Hello", start: 0.12, end: 0.54 },
          { text: "there.", start: 0.6, end: 1.83 },
        ],
      },
      { text: "Hi.", speaker: null, start: 2, end: 2.333, words: [] },
    ])
  })

  it("maps statuses", () => {
    expect(jobStatus("completed")).toBe("completed")
    expect(jobStatus("whatever")).toBe("processing")
  })
})
