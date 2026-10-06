import { createZodDto } from "nestjs-zod"
import { z } from "zod"
import { nullableString } from "../../common/zod"

export const auditEntrySchema = z.object({
  id: z.number().int(),
  at: z.string(),
  actor: z
    .object({ id: z.uuid(), email: nullableString() })
    .nullable()
    .describe("the admin; null = the CLI (role changes)"),
  action: z.string().describe("episode.create · episode.publish · level.put · user.update · role.grant …"),
  targetType: nullableString(),
  targetId: nullableString(),
  meta: z.record(z.string(), z.unknown()),
})
export type AuditEntry = z.infer<typeof auditEntrySchema>

export class AdminAuditDto extends createZodDto(
  z.object({
    entries: z.array(auditEntrySchema),
    nextBefore: z.number().int().optional().describe("pass as ?before= for older entries; absent at the end"),
  }),
) {}

export class AdminAuditQueryDto extends createZodDto(
  z.object({
    action: z.string().max(60).optional(),
    targetId: z.string().max(80).optional(),
    actorId: z.uuid().optional(),
    limit: z.coerce.number().int().min(1).max(200).default(50),
    before: z.coerce.number().int().positive().optional(),
  }),
) {}
