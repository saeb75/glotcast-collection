import { z } from "zod"

/**
 * A nullable string. The `.min(0)` only shapes the OpenAPI document: an unconstrained nullable primitive becomes
 * JSON Schema `type: ["string", "null"]`, which @nestjs/swagger misreads as an array on a DTO's top-level
 * properties; with a constraint zod writes `anyOf: [string, null]`, which every generator reads.
 */
export const nullableString = () => z.string().min(0).nullable()
