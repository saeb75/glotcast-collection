import { createZodDto } from "nestjs-zod"
import { z } from "zod"

export const homeConfigSchema = z.object({
  sliderEpisodeIds: z.array(z.uuid()).max(30).describe("the home slider, in order"),
  homeListIds: z.array(z.uuid()).max(30).describe("lists on the home screen, in order"),
  exploreListIds: z.array(z.uuid()).max(30).describe("lists on the discover screen, in order"),
})
export type HomeConfigInput = z.infer<typeof homeConfigSchema>

export class HomeConfigDto extends createZodDto(homeConfigSchema) {}
