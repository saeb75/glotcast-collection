import {
  type CoverAspect,
  type CoverModel,
  coverImageSchema,
  coverPromptSchema,
  type CoverStyle,
  transcribeJobSchema,
  transcriptionSchema,
} from "@/schemas/admin"
import { api } from "./client"

/** Starts an AssemblyAI transcription of a public audio URL. */
export async function startTranscription(audioUrl: string) {
  return transcribeJobSchema.parse((await api.post("/v1/admin/transcribe", { audioUrl })).data)
}

/** queued → processing → completed (utterances, sentences, paragraphs) | error. */
export async function getTranscription(jobId: string) {
  return transcriptionSchema.parse((await api.get(`/v1/admin/transcribe/${jobId}`, { timeout: 60_000 })).data)
}

/** A cover prompt written from the transcript (gpt-4o-mini), with the show and episode names in place. */
export async function writeCoverPrompt(body: {
  podcastName: string
  episodeTitle: string
  transcriptText: string
  style: CoverStyle
}) {
  return coverPromptSchema.parse((await api.post("/v1/admin/covers/prompt", body, { timeout: 90_000 })).data)
}

/** Draws the image (Gemini or gpt-image-1); the API stores it in R2 and answers its URL. */
export async function generateCoverImage(body: { prompt: string; model: CoverModel; aspect: CoverAspect }) {
  return coverImageSchema.parse((await api.post("/v1/admin/covers/image", body, { timeout: 180_000 })).data)
}
