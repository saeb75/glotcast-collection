/**
 * OpenAPI 3.1 lets `type` be a list (`["number", "string"]`); zod unions of primitives export that way, but code
 * generators (orval) keep only the first type. Rewrite such lists as `anyOf`, leaving plain nullables
 * (`["string", "null"]`), which every generator reads, as they are.
 */
export function splitTypeUnions<T>(node: T): T {
  if (Array.isArray(node)) return node.map(splitTypeUnions) as T
  if (!node || typeof node !== "object") return node
  const out: Record<string, unknown> = {}
  for (const [key, value] of Object.entries(node)) out[key] = splitTypeUnions(value)
  const types = out.type
  if (Array.isArray(types) && types.filter((t) => t !== "null").length > 1) {
    delete out.type
    out.anyOf = (types as unknown[]).map((type) => ({ type }))
  }
  return out as T
}
