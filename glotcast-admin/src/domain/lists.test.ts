import { describe, expect, it } from "vitest"
import { episodesParams, episodesRequest, parseAudit, parseEpisodes, PAGE_SIZE } from "./lists"
import { safeNext } from "./query"

describe("episode list query ↔ URL", () => {
  it("defaults to everything, page 1", () => {
    expect(parseEpisodes(new URLSearchParams())).toEqual({ q: "", podcast: "all", status: "all", page: 1 })
  })

  it("reads known values and ignores the rest", () => {
    const q = parseEpisodes(new URLSearchParams("q=%20lisbon%20&podcast=abc&status=draft&page=3"))
    expect(q).toEqual({ q: "lisbon", podcast: "abc", status: "draft", page: 3 })
    expect(parseEpisodes(new URLSearchParams("status=gone&page=-1"))).toMatchObject({
      status: "all",
      page: 1,
    })
    expect(episodesRequest(q)).toEqual({
      q: "lisbon",
      podcastId: "abc",
      status: "draft",
      page: 3,
      pageSize: PAGE_SIZE,
    })
  })

  it("writes only what differs from the defaults", () => {
    expect(episodesParams({ q: "", podcast: "all", status: "all", page: 1 }).toString()).toBe("")
    expect(episodesParams({ q: "x", podcast: "all", status: "published", page: 2 }).toString()).toBe(
      "q=x&status=published&page=2",
    )
  })

  it("reads the audit filters", () => {
    expect(parseAudit(new URLSearchParams("action=episode.publish"))).toEqual({
      action: "episode.publish",
      target: "",
    })
  })
})

describe("safeNext", () => {
  it("only follows paths of this site", () => {
    expect(safeNext("/episodes/1?tab=bg")).toBe("/episodes/1?tab=bg")
    expect(safeNext("//evil.example")).toBe("/")
    expect(safeNext("https://evil.example")).toBe("/")
    expect(safeNext("/login")).toBe("/")
    expect(safeNext(null)).toBe("/")
  })
})
