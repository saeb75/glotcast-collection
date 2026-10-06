import { createZodDto } from "nestjs-zod"
import { z } from "zod"
import { levelSchema, refSchema } from "../catalog/catalog.dto"
import { languageSchema } from "../me/me.dto"

export class TranslateTranscriptDto extends createZodDto(
  z.object({ episodeId: refSchema, level: levelSchema, target: languageSchema }),
) {}
export class TranscriptTranslationDto extends createZodDto(
  z.object({
    target: z.string(),
    chunks: z.array(z.string()).describe("index-aligned with Transcript.chunks"),
  }),
) {}
export class TranslateTextDto extends createZodDto(
  z.object({ texts: z.array(z.string().max(5000)).min(1).max(100), target: languageSchema }),
) {}
export class TextTranslationDto extends createZodDto(
  z.object({ target: z.string(), texts: z.array(z.string()) }),
) {}
