import { Injectable, Logger, ServiceUnavailableException } from "@nestjs/common"
import { AppConfig } from "../config/app-config.service"
import { type PushData, type PushGroup, TTL_SECONDS } from "./payload"

const ENDPOINT = "https://api.onesignal.com/notifications"
/** OneSignal's limit of external ids per request. */
export const MAX_RECIPIENTS = 20_000
const ATTEMPTS = 3
const TIMEOUT_MS = 15_000

/** One push to many users: the text is already in their language (the dispatcher groups them by language). */
export interface OneSignalMessage {
  externalIds: string[]
  title: string
  body: string
  data: PushData
  imageUrl: string | null
  group: PushGroup
  /** The batch id: OneSignal's idempotency key, so a retry never sends twice. */
  idempotencyKey: string
  /** Shown in the OneSignal dashboard. */
  name: string
}

export interface OneSignalResult {
  /** OneSignal's notification id; null when nobody could be reached. */
  id: string | null
  /** External ids OneSignal doesn't know (no subscription). */
  invalidExternalIds: string[]
  /** Nobody in the request has a push subscription. */
  notSubscribed: boolean
}

export interface OneSignalStats {
  successful: number
  failed: number
  errored: number
  converted: number
  received: number
}

/** OneSignal refused the request (4xx): retrying won't help. */
export class OneSignalRejected extends Error {
  constructor(
    readonly status: number,
    message: string,
  ) {
    super(message)
  }
}

/** Network errors, 429 and 5xx that outlived the retries: the batch can be tried again later (same key). */
export class OneSignalUnavailable extends Error {}

type Answer = {
  id?: string
  errors?: string[] | { invalid_aliases?: { external_id?: string[] } } | Record<string, unknown>
}

const sleep = (ms: number) => new Promise<void>((resolve) => setTimeout(resolve, ms))

/**
 * OneSignal REST API v2: delivery only — who gets what, and when, is decided here. Users are addressed by their
 * external id (the app logs in to OneSignal with the Supabase user id, guests included).
 */
@Injectable()
export class OneSignalClient {
  private readonly logger = new Logger(OneSignalClient.name)
  private readonly appId: string | null
  private readonly apiKey: string | null
  /** Replaceable in tests. */
  delay: (ms: number) => Promise<void> = sleep

  constructor(config: AppConfig) {
    this.appId = config.get("ONESIGNAL_APP_ID") ?? null
    this.apiKey = config.get("ONESIGNAL_API_KEY") ?? null
  }

  get configured(): boolean {
    return this.appId !== null && this.apiKey !== null
  }

  private keys(): { appId: string; apiKey: string } {
    if (!this.appId || !this.apiKey)
      throw new ServiceUnavailableException("push notifications are not configured")
    return { appId: this.appId, apiKey: this.apiKey }
  }

  /** The request body (exported for the spec). */
  body(appId: string, m: OneSignalMessage): Record<string, unknown> {
    return {
      app_id: appId,
      target_channel: "push",
      include_aliases: { external_id: m.externalIds },
      headings: { en: m.title },
      contents: { en: m.body },
      data: m.data,
      ...(m.imageUrl ? { ios_attachments: { img: m.imageUrl }, big_picture: m.imageUrl } : {}),
      idempotency_key: m.idempotencyKey,
      name: m.name,
      ttl: TTL_SECONDS[m.group],
      thread_id: m.group,
      android_group: m.group,
    }
  }

  async send(m: OneSignalMessage): Promise<OneSignalResult> {
    const { appId, apiKey } = this.keys()
    if (m.externalIds.length === 0) return { id: null, invalidExternalIds: [], notSubscribed: true }
    if (m.externalIds.length > MAX_RECIPIENTS)
      throw new RangeError(`at most ${MAX_RECIPIENTS} external ids per request`)
    const body = JSON.stringify(this.body(appId, m))
    let last = "no attempt"
    for (let attempt = 1; attempt <= ATTEMPTS; attempt++) {
      let res: Response
      try {
        res = await fetch(ENDPOINT, {
          method: "POST",
          headers: { "Content-Type": "application/json", Authorization: `Key ${apiKey}` },
          body,
          signal: AbortSignal.timeout(TIMEOUT_MS),
        })
      } catch (err) {
        last = `network: ${String(err)}`
        if (attempt < ATTEMPTS) await this.delay(1000 * 2 ** (attempt - 1))
        continue
      }
      const answer = (await res.json().catch(() => null)) as Answer | null
      if (res.status === 429 || res.status >= 500) {
        last = `HTTP ${res.status}`
        const retryAfter = Number(res.headers.get("retry-after"))
        if (attempt < ATTEMPTS)
          await this.delay(
            Number.isFinite(retryAfter) && retryAfter > 0
              ? Math.min(retryAfter, 60) * 1000
              : 1000 * 2 ** (attempt - 1),
          )
        continue
      }
      if (!res.ok) {
        const message = JSON.stringify(answer?.errors ?? answer ?? res.statusText).slice(0, 500)
        throw new OneSignalRejected(res.status, message)
      }
      return this.result(answer, m.externalIds)
    }
    this.logger.warn({ batch: m.idempotencyKey, last }, "OneSignal unavailable")
    throw new OneSignalUnavailable(last)
  }

  private result(answer: Answer | null, externalIds: string[]): OneSignalResult {
    const id = typeof answer?.id === "string" && answer.id ? answer.id : null
    const errors = answer?.errors
    const messages = Array.isArray(errors) ? errors.map(String) : []
    const invalid =
      errors && !Array.isArray(errors)
        ? ((errors as { invalid_aliases?: { external_id?: unknown } }).invalid_aliases?.external_id ?? [])
        : []
    const invalidExternalIds = Array.isArray(invalid) ? invalid.map(String) : []
    const notSubscribed =
      messages.some((e) => /not subscribed/i.test(e)) ||
      (id === null && invalidExternalIds.length >= externalIds.length)
    return { id, invalidExternalIds: notSubscribed ? externalIds : invalidExternalIds, notSubscribed }
  }

  /** Delivery numbers of a sent notification. */
  async get(id: string): Promise<OneSignalStats> {
    const { appId, apiKey } = this.keys()
    const res = await fetch(`${ENDPOINT}/${encodeURIComponent(id)}?app_id=${encodeURIComponent(appId)}`, {
      headers: { Authorization: `Key ${apiKey}` },
      signal: AbortSignal.timeout(TIMEOUT_MS),
    })
    if (!res.ok) throw new OneSignalUnavailable(`HTTP ${res.status}`)
    const n = (await res.json()) as Partial<Record<keyof OneSignalStats, number | null>>
    const num = (v: number | null | undefined) => (typeof v === "number" ? v : 0)
    return {
      successful: num(n.successful),
      failed: num(n.failed),
      errored: num(n.errored),
      converted: num(n.converted),
      received: num(n.received),
    }
  }
}
