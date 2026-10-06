import { createZodDto } from "nestjs-zod"
import { z } from "zod"

export class PresignDto extends createZodDto(
  z.object({
    folder: z.enum(["podcasts", "images"]).describe("podcasts = audio, images = covers and banners"),
    filename: z.string().trim().min(1).max(200),
    contentType: z
      .string()
      .trim()
      .regex(/^(audio|image)\/[a-z0-9.+-]+$/i, "an audio/* or image/* type"),
  }),
) {}

export class PresignedDto extends createZodDto(
  z.object({
    uploadUrl: z.string().describe("PUT the file here with the same Content-Type"),
    publicUrl: z.string().describe("where the file is served once uploaded"),
    expiresAt: z.string(),
  }),
) {}
