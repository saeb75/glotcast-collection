import { createZodDto } from "nestjs-zod"
import { z } from "zod"
import { transcriptChunkSchema } from "../../catalog/catalog.dto"
import { urlSchema } from "../common/admin.dto"

export const transcriptionSchema = z.object({
  status: z.enum(["queued", "processing", "completed", "error"]),
  error: z.string().optional(),
  durationSec: z.number().optional(),
  utterances: z.array(transcriptChunkSchema).optional().describe("speaker turns, with words"),
  sentences: z.array(transcriptChunkSchema).optional(),
  paragraphs: z.array(transcriptChunkSchema).optional(),
})
export type Transcription = z.infer<typeof transcriptionSchema>

export class TranscribeDto extends createZodDto(
  z.object({ audioUrl: urlSchema.describe("a public audio URL (R2)") }),
) {}
export class TranscribeJobDto extends createZodDto(z.object({ jobId: z.uuid() })) {}
export class TranscriptionDto extends createZodDto(transcriptionSchema) {}
