import { BadGatewayException, ServiceUnavailableException } from "@nestjs/common"
import { afterEach, describe, expect, it, vi } from "vitest"
import { type AppConfig } from "../config/app-config.service"
import { GoogleTranslateClient } from "./google-translate.client"

const config = (key?: string) => ({ get: () => key }) as unknown as AppConfig

describe("GoogleTranslateClient", () => {
  afterEach(() => {
    vi.unstubAllGlobals()
  })

  it("sends at most 100 segments per request (source en, plain text) and keeps the order", async () => {
    const bodies: { q: string[]; source: string; target: string; format: string }[] = []
    vi.stubGlobal(
      "fetch",
      vi.fn((url: string, init: { body: string }) => {
        expect(url).toBe("https://translation.googleapis.com/language/translate/v2?key=k%2B1")
        const body = JSON.parse(init.body) as (typeof bodies)[number]
        bodies.push(body)
        const translations = body.q.map((t) => ({ translatedText: `${body.target}:${t}` }))
        return Promise.resolve(new Response(JSON.stringify({ data: { translations } }), { status: 200 }))
      }),
    )
    const texts = Array.from({ length: 250 }, (_, i) => `t${i}`)
    const out = await new GoogleTranslateClient(config("k+1")).translate(texts, "tr")
    expect(bodies.map((b) => b.q.length)).toEqual([100, 100, 50])
    expect(bodies[0]).toMatchObject({ source: "en", target: "tr", format: "text" })
    expect(out).toEqual(texts.map((t) => `tr:${t}`))
  })

  it("translates from another source language when asked (Turkish campaigns)", async () => {
    const bodies: { source: string; target: string }[] = []
    vi.stubGlobal(
      "fetch",
      vi.fn((_url: string, init: { body: string }) => {
        const body = JSON.parse(init.body) as { q: string[]; source: string; target: string }
        bodies.push(body)
        const translations = body.q.map((t) => ({ translatedText: `${body.source}>${body.target}:${t}` }))
        return Promise.resolve(new Response(JSON.stringify({ data: { translations } }), { status: 200 }))
      }),
    )
    const out = await new GoogleTranslateClient(config("k")).translate(["Merhaba"], "de", "tr")
    expect(bodies[0]).toMatchObject({ source: "tr", target: "de" })
    expect(out).toEqual(["tr>de:Merhaba"])
  })

  it("maps an upstream failure to 502 and a missing key to 503", async () => {
    vi.stubGlobal(
      "fetch",
      vi.fn(() =>
        Promise.resolve(new Response(JSON.stringify({ error: { message: "quota" } }), { status: 403 })),
      ),
    )
    await expect(new GoogleTranslateClient(config("k")).translate(["a"], "tr")).rejects.toBeInstanceOf(
      BadGatewayException,
    )
    await expect(new GoogleTranslateClient(config()).translate(["a"], "tr")).rejects.toBeInstanceOf(
      ServiceUnavailableException,
    )
  })
})
