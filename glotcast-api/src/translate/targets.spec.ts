import { describe, expect, it } from "vitest"
import { googleTarget, isEnglish } from "./targets"

describe("googleTarget", () => {
  it("keeps the bare language for most codes", () => {
    expect(googleTarget("tr")).toBe("tr")
    expect(googleTarget("pt-BR")).toBe("pt")
    expect(googleTarget("es-419")).toBe("es")
    expect(googleTarget("DE")).toBe("de")
  })
  it("keeps the variants Google translates apart", () => {
    expect(googleTarget("zh")).toBe("zh-CN")
    expect(googleTarget("zh-Hans")).toBe("zh-CN")
    expect(googleTarget("zh-Hant")).toBe("zh-TW")
    expect(googleTarget("zh_TW")).toBe("zh-TW")
    expect(googleTarget("pt-PT")).toBe("pt-PT")
    expect(googleTarget("fr-CA")).toBe("fr-CA")
  })
  it("knows English", () => {
    expect(isEnglish("en-GB")).toBe(true)
    expect(isEnglish("tr")).toBe(false)
  })
})
