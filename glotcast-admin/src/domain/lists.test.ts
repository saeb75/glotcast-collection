import { describe, expect, it } from "vitest"
import {
  campaignsParams,
  campaignsRequest,
  episodesParams,
  episodesRequest,
  PAGE_SIZE,
  parseAudit,
  parseCampaigns,
  parseEpisodes,
  parseSendLog,
  sendLogParams,
  sendLogRequest,
} from "./lists"
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

describe("campaign list query ↔ URL", () => {
  it("filters by status and pages", () => {
    expect(parseCampaigns(new URLSearchParams())).toEqual({ status: "all", page: 1 })
    const q = parseCampaigns(new URLSearchParams("status=sent&page=2"))
    expect(campaignsRequest(q)).toEqual({ status: "sent", page: 2, pageSize: PAGE_SIZE })
    expect(campaignsParams({ status: "all", page: 1 }).toString()).toBe("")
    expect(parseCampaigns(new URLSearchParams("status=bogus")).status).toBe("all")
  })
})

describe("send log query ↔ URL", () => {
  const USER = "0A1B2C3D-4E5F-4061-8273-94A5B6C7D8E9"

  it("reads the filters and sends only valid ids", () => {
    const q = parseSendLog(new URLSearchParams(`kind=campaign&status=skipped&campaign=nope&user=${USER}`))
    expect(q).toEqual({ kind: "campaign", status: "skipped", campaign: "nope", user: USER })
    expect(sendLogRequest(q)).toEqual({
      kind: "campaign",
      status: "skipped",
      campaignId: undefined,
      userId: USER.toLowerCase(),
    })
    expect(sendLogRequest(parseSendLog(new URLSearchParams("user=ash")))).toEqual({
      kind: undefined,
      status: undefined,
      campaignId: undefined,
      userId: undefined,
    })
  })

  it("writes only what differs from the defaults", () => {
    expect(sendLogParams({ kind: "all", status: "all", campaign: "all", user: "" }).toString()).toBe("")
    expect(sendLogParams({ kind: "test", status: "all", campaign: "all", user: "" }).toString()).toBe(
      "kind=test",
    )
  })
})
