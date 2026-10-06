import { ServiceUnavailableException } from "@nestjs/common"
import { afterEach, describe, expect, it, vi } from "vitest"
import { type AppConfig } from "../config/app-config.service"
import { chunk } from "./limit"
import {
  MAX_RECIPIENTS,
  OneSignalClient,
  type OneSignalMessage,
  OneSignalRejected,
  OneSignalUnavailable,
} from "./onesignal.client"

const config = (keys = true) =>
  ({
    get: (key: string) => (keys ? { ONESIGNAL_APP_ID: "app-1", ONESIGNAL_API_KEY: "key-1" }[key] : undefined),
  }) as unknown as AppConfig

const message = (over: Partial<OneSignalMessage> = {}): OneSignalMessage => ({
  externalIds: ["u1", "u2"],
  title: "Merhaba",
  body: "Bugün dinle",
  data: { t: "player", id: "e1", lv: "bg", k: "habit", ref: "reminder" },
  imageUrl: "https://cdn.example.com/c.jpg",
  group: "habit",
  idempotencyKey: "0b8f5a8e-2d55-4a63-a0f5-3a3d0c0e7d11",
  name: "reminder · tr",
  ...over,
})

const json = (status: number, body: unknown, headers: Record<string, string> = {}) =>
  new Response(JSON.stringify(body), { status, headers: { "content-type": "application/json", ...headers } })

function client(responses: (Response | Error)[]) {
  const calls: { url: string; init: RequestInit }[] = []
  vi.stubGlobal(
    "fetch",
    vi.fn((url: string, init: RequestInit) => {
      calls.push({ url, init })
      const next = responses.shift()
      if (!next) throw new Error("no more responses")
      return next instanceof Error ? Promise.reject(next) : Promise.resolve(next)
    }),
  )
  const c = new OneSignalClient(config())
  const waits: number[] = []
  c.delay = (ms) => {
    waits.push(ms)
    return Promise.resolve()
  }
  return { c, calls, waits }
}

describe("OneSignalClient", () => {
  afterEach(() => {
    vi.unstubAllGlobals()
  })

  it("posts the push to the external ids with Key auth, the data, image, ttl and idempotency key", async () => {
    const { c, calls } = client([json(200, { id: "os-1" })])
    const out = await c.send(message())
    expect(out).toEqual({ id: "os-1", invalidExternalIds: [], notSubscribed: false })
    expect(calls).toHaveLength(1)
    expect(calls[0]!.url).toBe("https://api.onesignal.com/notifications")
    expect(calls[0]!.init.method).toBe("POST")
    expect((calls[0]!.init.headers as Record<string, string>).Authorization).toBe("Key key-1")
    expect(JSON.parse(calls[0]!.init.body as string)).toEqual({
      app_id: "app-1",
      target_channel: "push",
      include_aliases: { external_id: ["u1", "u2"] },
      headings: { en: "Merhaba" },
      contents: { en: "Bugün dinle" },
      data: { t: "player", id: "e1", lv: "bg", k: "habit", ref: "reminder" },
      ios_attachments: { img: "https://cdn.example.com/c.jpg" },
      big_picture: "https://cdn.example.com/c.jpg",
      idempotency_key: "0b8f5a8e-2d55-4a63-a0f5-3a3d0c0e7d11",
      name: "reminder · tr",
      ttl: 7200,
      thread_id: "habit",
      android_group: "habit",
    })
  })

  it("sends no image keys without an image, and a day's ttl for content", async () => {
    const { c, calls } = client([json(200, { id: "os-2" })])
    await c.send(message({ imageUrl: null, group: "content" }))
    const body = JSON.parse(calls[0]!.init.body as string)
    expect(body).not.toHaveProperty("ios_attachments")
    expect(body).not.toHaveProperty("big_picture")
    expect(body.ttl).toBe(86_400)
  })

  it("takes at most 20,000 external ids a request (the dispatcher chunks)", async () => {
    const { c } = client([])
    const ids = Array.from({ length: 45_000 }, (_, i) => `u${i}`)
    expect(chunk(ids, MAX_RECIPIENTS).map((c) => c.length)).toEqual([20_000, 20_000, 5_000])
    await expect(c.send(message({ externalIds: ids }))).rejects.toBeInstanceOf(RangeError)
  })

  it("retries 429 (Retry-After) and 5xx and network errors with the same idempotency key", async () => {
    const { c, calls, waits } = client([
      json(429, { errors: ["rate limited"] }, { "retry-after": "7" }),
      json(503, {}),
      json(200, { id: "os-3" }),
    ])
    expect((await c.send(message())).id).toBe("os-3")
    expect(waits).toEqual([7000, 2000])
    const keys = calls.map(
      (call) => (JSON.parse(call.init.body as string) as { idempotency_key: string }).idempotency_key,
    )
    expect(new Set(keys)).toEqual(new Set(["0b8f5a8e-2d55-4a63-a0f5-3a3d0c0e7d11"]))

    const net = client([new TypeError("fetch failed"), json(200, { id: "os-4" })])
    expect((await net.c.send(message())).id).toBe("os-4")
  })

  it("gives up after 3 attempts (the batch stays pending)", async () => {
    const { c, calls } = client([json(500, {}), json(502, {}), json(500, {})])
    await expect(c.send(message())).rejects.toBeInstanceOf(OneSignalUnavailable)
    expect(calls).toHaveLength(3)
  })

  it("does not retry a 400: the error is kept", async () => {
    const { c, calls } = client([
      json(400, { errors: ["Message Notifications must have English language content"] }),
    ])
    const err = await c.send(message()).catch((e: unknown) => e)
    expect(err).toBeInstanceOf(OneSignalRejected)
    expect((err as OneSignalRejected).status).toBe(400)
    expect((err as OneSignalRejected).message).toContain("English language content")
    expect(calls).toHaveLength(1)
  })

  it("reports external ids OneSignal doesn't know", async () => {
    const { c } = client([json(200, { id: "os-5", errors: { invalid_aliases: { external_id: ["u2"] } } })])
    expect(await c.send(message())).toEqual({ id: "os-5", invalidExternalIds: ["u2"], notSubscribed: false })
  })

  it("reports when nobody is subscribed", async () => {
    const { c } = client([json(200, { id: "", errors: ["All included players are not subscribed"] })])
    expect(await c.send(message())).toEqual({
      id: null,
      invalidExternalIds: ["u1", "u2"],
      notSubscribed: true,
    })
    const all = client([json(200, { errors: { invalid_aliases: { external_id: ["u1", "u2"] } } })])
    expect((await all.c.send(message())).notSubscribed).toBe(true)
  })

  it("reads a notification's delivery numbers", async () => {
    const { c, calls } = client([
      json(200, { successful: 3, failed: 1, errored: 0, converted: 2, received: null }),
    ])
    expect(await c.get("os-1")).toEqual({ successful: 3, failed: 1, errored: 0, converted: 2, received: 0 })
    expect(calls[0]!.url).toBe("https://api.onesignal.com/notifications/os-1?app_id=app-1")
  })

  it("is not configured without its keys (503)", async () => {
    const c = new OneSignalClient(config(false))
    expect(c.configured).toBe(false)
    await expect(c.send(message())).rejects.toBeInstanceOf(ServiceUnavailableException)
    await expect(c.get("x")).rejects.toBeInstanceOf(ServiceUnavailableException)
  })
})
