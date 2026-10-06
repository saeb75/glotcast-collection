import { describe, expect, it } from "vitest"
import { buildSystemPrompt, fillTokens, STYLE_IDS } from "./styles"

describe("cover styles", () => {
  it("builds a system prompt for each of the 5 styles, keeping the tokens", () => {
    expect(STYLE_IDS).toHaveLength(5)
    for (const style of STYLE_IDS) {
      const prompt = buildSystemPrompt(style)
      expect(prompt).toContain(`Style brief: ${style}.`)
      expect(prompt).toContain('"{episode}"')
      expect(prompt).toContain('"{podcast}"')
    }
  })
  it("fills the tokens with the real names", () => {
    expect(fillTokens('Title "{episode}" under "{podcast}" — {episode}', "Around the World", "Lisbon")).toBe(
      'Title "Lisbon" under "Around the World" — Lisbon',
    )
  })
})
