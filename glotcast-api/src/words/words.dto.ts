import { createZodDto } from "nestjs-zod"
import { z } from "zod"
import { nullableString } from "../common/zod"
import { levelSchema } from "../catalog/catalog.dto"
import { pageOf, pageQuerySchema } from "../common/pagination"
import { languageSchema } from "../me/me.dto"

export const wordLookupSchema = z
  .object({
    word: z.string(),
    lemma: z.string().describe("the dictionary form the lookup used"),
    phonetic: nullableString(),
    audioUrl: nullableString(),
    translations: z.array(z.object({ partOfSpeech: nullableString(), terms: z.array(z.string()) })),
    definitions: z.array(
      z.object({ partOfSpeech: nullableString(), definition: z.string(), example: nullableString() }),
    ),
  })
  .meta({ id: "WordLookup" })

export const wordSourceSchema = z
  .object({ episodeId: z.uuid(), level: levelSchema, chunkIndex: z.number().int().min(0) })
  .meta({ id: "WordSource" })

export const savedWordSchema = z
  .object({
    id: z.uuid(),
    word: z.string(),
    meaning: z.string(),
    phonetic: nullableString(),
    audioUrl: nullableString(),
    detail: z.unknown().nullable(),
    language: z.string(),
    box: z.literal([1, 2, 3, 4, 5]),
    nextReviewAt: z.string(),
    lastReviewedAt: nullableString(),
    correctCount: z.number().int(),
    incorrectCount: z.number().int(),
    createdAt: z.string(),
    source: wordSourceSchema.nullable(),
  })
  .meta({ id: "SavedWord" })
export type SavedWord = z.infer<typeof savedWordSchema>

export class WordLookupDto extends createZodDto(z.object(wordLookupSchema.shape)) {}
export class LookupDto extends createZodDto(
  z.object({
    word: z.string().trim().min(1).max(80),
    target: languageSchema.describe("translation language"),
  }),
) {}
export class WordsQueryDto extends createZodDto(
  z.object({
    box: z.coerce.number().int().min(1).max(5).optional(),
    q: z.string().trim().max(80).optional().describe("matches the word or its meaning"),
    ...pageQuerySchema.shape,
  }),
) {}
export class WordsPageDto extends createZodDto(pageOf(savedWordSchema)) {}
export class WordStatsDto extends createZodDto(
  z.object({
    total: z.number().int(),
    byBox: z.object({
      "1": z.number().int(),
      "2": z.number().int(),
      "3": z.number().int(),
      "4": z.number().int(),
      "5": z.number().int(),
    }),
    due: z.number().int(),
  }),
) {}
export class SaveWordDto extends createZodDto(
  z.object({
    word: z.string().trim().min(1).max(80),
    meaning: z.string().trim().max(500),
    language: languageSchema,
    phonetic: z.string().max(120).nullable().optional(),
    audioUrl: z.string().max(2000).nullable().optional(),
    detail: z.unknown().optional(),
    source: z
      .object({ episodeId: z.uuid(), level: levelSchema, chunkIndex: z.number().int().min(0) })
      .nullable()
      .optional(),
  }),
) {}
export class SavedWordDto extends createZodDto(z.object(savedWordSchema.shape)) {}
export class SavedWordsDto extends createZodDto(z.array(savedWordSchema)) {}
export class ReviewDto extends createZodDto(z.object({ known: z.boolean() })) {}
