import { describe, expect, it } from "vitest"
import { objectKey, publicUrl } from "./r2"

describe("objectKey", () => {
  it("builds {folder}/{timestamp}-{slug}.{ext}", () => {
    expect(objectKey("Episode 12 — Lisbon (BG).MP3", "podcasts", 1700000000000)).toBe(
      "podcasts/1700000000000-episode-12-lisbon-bg.mp3",
    )
    expect(objectKey("cover.png", "images", 1)).toBe("images/1-cover.png")
  })
  it("survives odd names", () => {
    expect(objectKey("noext", "images", 1)).toBe("images/1-noext.bin")
    expect(objectKey("çğü.jpeg", "images", 1)).toBe("images/1-file.jpeg")
    expect(objectKey(".hidden", "images", 1)).toBe("images/1-hidden.bin")
  })
  it("joins the public base", () => {
    expect(publicUrl("https://cdn.glotcast.app/", "images/1-a.png")).toBe(
      "https://cdn.glotcast.app/images/1-a.png",
    )
  })
})
