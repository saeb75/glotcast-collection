import { BadGatewayException, Injectable, Logger, ServiceUnavailableException } from "@nestjs/common"
import { AppConfig } from "../../config/app-config.service"
import { type AaiSegment } from "./assemblyai"

const BASE = "https://api.assemblyai.com/v2"

export interface AaiTranscript {
  id: string
  status: string
  error?: string | null
  audio_duration?: number | null
  utterances?: AaiSegment[] | null
}

/** AssemblyAI's REST API: Universal-2 with speaker labels, as whisper-transcriber used it. */
@Injectable()
export class AssemblyAiClient {
  private readonly logger = new Logger(AssemblyAiClient.name)
  private readonly key: string | null

  constructor(config: AppConfig) {
    this.key = config.get("ASSEMBLYAI_API_KEY") ?? null
  }

  private async call<T>(path: string, init?: RequestInit): Promise<T> {
    if (!this.key) throw new ServiceUnavailableException("AssemblyAI is not configured")
    const res = await fetch(`${BASE}${path}`, {
      ...init,
      headers: { authorization: this.key, "content-type": "application/json" },
      signal: AbortSignal.timeout(30_000),
    })
    if (!res.ok) {
      const detail = (await res.text().catch(() => "")).slice(0, 300)
      this.logger.warn({ status: res.status, path, detail }, "AssemblyAI request failed")
      throw new BadGatewayException(`AssemblyAI answered ${res.status}`)
    }
    return (await res.json()) as T
  }

  /** Starts a transcription of a public audio URL; returns AssemblyAI's transcript id. */
  async submit(audioUrl: string): Promise<string> {
    const body = { audio_url: audioUrl, speaker_labels: true, speech_models: ["universal-2"] }
    const res = await this.call<{ id: string }>("/transcript", { method: "POST", body: JSON.stringify(body) })
    return res.id
  }

  get(id: string): Promise<AaiTranscript> {
    return this.call<AaiTranscript>(`/transcript/${encodeURIComponent(id)}`)
  }

  async grouping(id: string, kind: "sentences" | "paragraphs"): Promise<AaiSegment[]> {
    const res = await this.call<Record<string, AaiSegment[] | undefined>>(
      `/transcript/${encodeURIComponent(id)}/${kind}`,
    )
    return res[kind] ?? []
  }
}
