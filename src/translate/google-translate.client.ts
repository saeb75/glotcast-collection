import { BadGatewayException, Injectable, Logger, ServiceUnavailableException } from "@nestjs/common"
import { AppConfig } from "../config/app-config.service"

const ENDPOINT = "https://translation.googleapis.com/language/translate/v2"
/** Google's limit is 128 segments per request. */
export const SEGMENTS_PER_REQUEST = 100

/** Google Cloud Translation v2 (Basic): English → `target`, plain text, many segments per request. */
@Injectable()
export class GoogleTranslateClient {
  private readonly logger = new Logger(GoogleTranslateClient.name)
  private readonly key: string | null

  constructor(config: AppConfig) {
    this.key = config.get("GOOGLE_TRANSLATE_API_KEY") ?? null
  }

  get configured(): boolean {
    return this.key !== null
  }

  async translate(texts: string[], target: string): Promise<string[]> {
    if (!this.key) throw new ServiceUnavailableException("translation is not configured")
    const out: string[] = []
    for (let i = 0; i < texts.length; i += SEGMENTS_PER_REQUEST) {
      const batch = texts.slice(i, i + SEGMENTS_PER_REQUEST)
      const res = await fetch(`${ENDPOINT}?key=${encodeURIComponent(this.key)}`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ q: batch, source: "en", target, format: "text" }),
        signal: AbortSignal.timeout(20_000),
      })
      const body = (await res.json().catch(() => null)) as {
        data?: { translations?: { translatedText: string }[] }
        error?: { message?: string }
      } | null
      const translated = body?.data?.translations
      if (!res.ok || !translated || translated.length !== batch.length) {
        this.logger.warn({ status: res.status, error: body?.error?.message, target }, "translation failed")
        throw new BadGatewayException("the translation service failed, try again")
      }
      out.push(...translated.map((t) => t.translatedText))
    }
    return out
  }
}
