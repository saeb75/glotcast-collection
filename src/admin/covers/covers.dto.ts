import { createZodDto } from "nestjs-zod"
import { z } from "zod"
import { STYLE_IDS } from "./styles"

export class CoverPromptDto extends createZodDto(
  z.object({
    podcastName: z.string().trim().min(1).max(200),
    episodeTitle: z.string().trim().min(1).max(300),
    transcriptText: z.string().trim().min(1).max(200_000).describe("the first 8000 characters are used"),
    style: z.enum(STYLE_IDS).default("vibrant-gradient"),
  }),
) {}
export class CoverPromptResultDto extends createZodDto(z.object({ prompt: z.string() })) {}

export class CoverImageDto extends createZodDto(
  z.object({
    prompt: z.string().trim().min(1).max(10_000),
    model: z.enum(["gemini", "openai"]).default("gemini"),
    aspect: z.enum(["3:4", "4:3", "1:1"]),
  }),
) {}
export class CoverImageResultDto extends createZodDto(
  z.object({ url: z.string().describe("public R2 URL") }),
) {}
