import { describe, expect, it } from "vitest"
import { type AdminEpisodeLevelDetail } from "@/schemas/admin"
import { draftFrom, isDirty, levelInput, redo, saveProblem, undo, withChunks } from "./levelDraft"

const saved: AdminEpisodeLevelDetail = {
  level: "bg",
  audioUrl: "https://media.example/podcasts/a.mp3",
  durationSec: 61.2,
  description: null,
  chunkCount: 1,
  hasWordTimings: false,
  updatedAt: "2026-10-01T10:00:00Z",
  transcript: { chunks: [{ text: "Hi", speaker: "A", start: 0, end: 1 }] },
}

describe("level drafts", () => {
  it("starts clean from the saved level, and empty for a new one", () => {
    expect(isDirty(draftFrom("bg", saved))).toBe(false)
    expect(isDirty(draftFrom("in", null))).toBe(false)
    expect(isDirty({ ...draftFrom("in", null), audioUrl: "https://x.example/a.mp3" })).toBe(true)
  })

  it("is dirty after an edit and clean again after undoing it", () => {
    const d = draftFrom("bg", saved)
    const edited = withChunks(d, [{ text: "Hello", speaker: "A", start: 0, end: 1 }])
    expect(isDirty(edited)).toBe(true)
    const back = undo(edited)
    expect(isDirty(back)).toBe(false)
    expect(redo(back).chunks).toBe(edited.chunks)
    expect(undo(d)).toBe(d)
  })

  it("explains what blocks a save", () => {
    const d = draftFrom("in", null)
    expect(saveProblem(d)).toBe("no_audio")
    expect(saveProblem({ ...d, audioUrl: "not a url" })).toBe("bad_url")
    expect(saveProblem({ ...d, audioUrl: "https://x.example/a.mp3" })).toBe("no_duration")
    const ok = { ...d, audioUrl: "https://x.example/a.mp3", durationSec: 30 }
    expect(saveProblem(ok)).toBeNull()
    expect(saveProblem({ ...ok, chunks: [{ text: "", speaker: null, start: 0, end: 1 }] })).toBe("lines")
    expect(saveProblem({ ...ok, saving: true })).toBe("busy")
  })

  it("builds the PUT body", () => {
    const d = { ...draftFrom("bg", saved), description: "  ", durationSec: 61.234 }
    expect(levelInput(d)).toEqual({
      audioUrl: saved.audioUrl,
      durationSec: 61.23,
      description: null,
      transcript: { chunks: saved.transcript.chunks },
    })
  })
})
