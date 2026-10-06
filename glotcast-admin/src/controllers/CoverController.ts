import { generateCoverImage, writeCoverPrompt } from "@/api/pipeline"
import { type CoverSession, NEW_COVER_SESSION, useCoverStore } from "@/stores/useCoverStore"
import { toastFailure } from "./load"

const store = useCoverStore.getState

export interface CoverSource {
  podcastName: string
  episodeTitle: string
  text: string
}

/** The cover generator: a prompt from the transcript (or typed), then an image stored in R2 by the API. */
export class CoverController {
  static session(key: string): CoverSession {
    return store().sessions[key] ?? NEW_COVER_SESSION
  }

  static set(key: string, patch: Partial<CoverSession>): void {
    store().patch(key, patch)
  }

  static async writePrompt(key: string, source: CoverSource): Promise<void> {
    const s = this.session(key)
    if (s.writing || !source.text.trim()) return
    store().patch(key, { writing: true, error: undefined })
    try {
      const { prompt } = await writeCoverPrompt({
        podcastName: source.podcastName.trim() || source.episodeTitle,
        episodeTitle: source.episodeTitle.trim() || source.podcastName,
        transcriptText: source.text.slice(0, 200_000),
        style: s.style,
      })
      store().patch(key, { prompt })
    } catch (error) {
      toastFailure(error)
    } finally {
      store().patch(key, { writing: false })
    }
  }

  static async generate(key: string): Promise<void> {
    const s = this.session(key)
    if (s.drawing || !s.prompt.trim()) return
    store().patch(key, { drawing: true, error: undefined })
    try {
      const { url } = await generateCoverImage({ prompt: s.prompt.trim(), model: s.model, aspect: s.aspect })
      const images = [url, ...this.session(key).images.filter((u) => u !== url)]
      store().patch(key, { images, selected: url })
    } catch (error) {
      toastFailure(error)
    } finally {
      store().patch(key, { drawing: false })
    }
  }

  static reset(): void {
    store().clear()
  }
}
