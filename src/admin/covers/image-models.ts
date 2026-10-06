import { BadGatewayException, Injectable, Logger, ServiceUnavailableException } from "@nestjs/common"
import { AppConfig } from "../../config/app-config.service"

export type Aspect = "3:4" | "4:3" | "1:1"

const OPENAI = "https://api.openai.com/v1"
const GEMINI = "https://generativelanguage.googleapis.com/v1beta/models"

/** The models behind the cover pipeline: gpt-4o-mini writes prompts; gpt-image-1 or Gemini draws. */
@Injectable()
export class ImageModels {
  private readonly logger = new Logger(ImageModels.name)
  private readonly openaiKey: string | null
  private readonly geminiKey: string | null
  private readonly geminiModel: string

  constructor(config: AppConfig) {
    this.openaiKey = config.get("OPENAI_API_KEY") ?? null
    this.geminiKey = config.get("GEMINI_API_KEY") ?? null
    this.geminiModel = config.get("GEMINI_IMAGE_MODEL")
  }

  private async post<T>(
    what: string,
    url: string,
    headers: Record<string, string>,
    body: unknown,
  ): Promise<T> {
    const res = await fetch(url, {
      method: "POST",
      headers: { "Content-Type": "application/json", ...headers },
      body: JSON.stringify(body),
      signal: AbortSignal.timeout(170_000),
    })
    if (!res.ok) {
      const detail = (await res.text().catch(() => "")).slice(0, 500)
      this.logger.warn({ status: res.status, detail }, `${what} failed`)
      throw new BadGatewayException(`${what} answered ${res.status}`)
    }
    return (await res.json()) as T
  }

  private openai(): string {
    if (!this.openaiKey) throw new ServiceUnavailableException("OPENAI_API_KEY is not configured")
    return this.openaiKey
  }

  /** gpt-4o-mini, temperature 0.7 (as whisper-transcriber). */
  async chat(system: string, user: string): Promise<string> {
    const res = await this.post<{ choices?: { message?: { content?: string } }[] }>(
      "OpenAI",
      `${OPENAI}/chat/completions`,
      { Authorization: `Bearer ${this.openai()}` },
      {
        model: "gpt-4o-mini",
        temperature: 0.7,
        messages: [
          { role: "system", content: system },
          { role: "user", content: user },
        ],
      },
    )
    const text = res.choices?.[0]?.message?.content?.trim()
    if (!text) throw new BadGatewayException("the model returned an empty prompt")
    return text
  }

  /** gpt-image-1, high quality, PNG. */
  async openaiImage(prompt: string, aspect: Aspect): Promise<Uint8Array> {
    const size = aspect === "3:4" ? "1024x1536" : aspect === "4:3" ? "1536x1024" : "1024x1024"
    const res = await this.post<{ data?: { b64_json?: string }[] }>(
      "OpenAI images",
      `${OPENAI}/images/generations`,
      { Authorization: `Bearer ${this.openai()}` },
      { model: "gpt-image-1", prompt, size, quality: "high", n: 1 },
    )
    const b64 = res.data?.[0]?.b64_json
    if (!b64) throw new BadGatewayException("OpenAI returned no image")
    return Buffer.from(b64, "base64")
  }

  /** Gemini image generation (GEMINI_IMAGE_MODEL, default gemini-3.1-flash-image-preview). */
  async geminiImage(prompt: string, aspect: Aspect): Promise<Uint8Array> {
    if (!this.geminiKey) throw new ServiceUnavailableException("GEMINI_API_KEY is not configured")
    const hint =
      aspect === "3:4"
        ? "Vertical portrait composition with a 3:4 aspect ratio."
        : aspect === "4:3"
          ? "Horizontal landscape composition with a 4:3 aspect ratio."
          : "Perfectly square composition with a 1:1 aspect ratio."
    const res = await this.post<{
      candidates?: { content?: { parts?: { inlineData?: { data?: string } }[] } }[]
    }>(
      "Gemini",
      `${GEMINI}/${encodeURIComponent(this.geminiModel)}:generateContent`,
      { "x-goog-api-key": this.geminiKey },
      {
        contents: [{ role: "user", parts: [{ text: `${prompt}\n\n${hint}` }] }],
        generationConfig: { responseModalities: ["IMAGE"], imageConfig: { aspectRatio: aspect } },
      },
    )
    const b64 = res.candidates?.[0]?.content?.parts?.find((p) => p.inlineData?.data)?.inlineData?.data
    if (!b64) throw new BadGatewayException("Gemini returned no image")
    return Buffer.from(b64, "base64")
  }
}
