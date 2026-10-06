import { Injectable } from "@nestjs/common"
import { R2Storage } from "../../storage/r2.service"
import { type Aspect, ImageModels } from "./image-models"
import { buildSystemPrompt, fillTokens, IMAGE_TEXT_RULE, type StyleId } from "./styles"

const TRANSCRIPT_CHARS = 8000

@Injectable()
export class AdminCoversService {
  constructor(
    private readonly models: ImageModels,
    private readonly storage: R2Storage,
  ) {}

  /** One cover prompt in the chosen style, from the transcript, with the show and episode names in place. */
  async prompt(input: { podcastName: string; episodeTitle: string; transcriptText: string; style: StyleId }) {
    const raw = await this.models.chat(
      buildSystemPrompt(input.style),
      `Transcript:\n\n${input.transcriptText.slice(0, TRANSCRIPT_CHARS)}`,
    )
    return { prompt: fillTokens(raw, input.podcastName, input.episodeTitle) }
  }

  /** Draws the cover and stores it in R2 under images/. */
  async image(input: { prompt: string; model: "gemini" | "openai"; aspect: Aspect }) {
    const prompt = `${input.prompt.trim()}\n\n${IMAGE_TEXT_RULE}`
    const png =
      input.model === "openai"
        ? await this.models.openaiImage(prompt, input.aspect)
        : await this.models.geminiImage(prompt, input.aspect)
    const name = `cover-${input.model}-${input.aspect.replace(":", "x")}.png`
    return { url: await this.storage.put(png, name, "image/png", "images") }
  }
}
