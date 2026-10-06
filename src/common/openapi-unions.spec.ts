import { describe, expect, it } from "vitest"
import { splitTypeUnions } from "./openapi-unions"

describe("splitTypeUnions", () => {
  it("rewrites a list of several types as anyOf, deep inside the document", () => {
    const doc = { a: { additionalProperties: { type: ["number", "string"] } } }
    expect(splitTypeUnions(doc)).toEqual({
      a: { additionalProperties: { anyOf: [{ type: "number" }, { type: "string" }] } },
    })
  })
  it("leaves plain nullables and single types alone", () => {
    const doc = { x: { type: ["string", "null"] }, y: { type: "number" }, z: [{ type: ["integer", "null"] }] }
    expect(splitTypeUnions(doc)).toEqual(doc)
  })
})
