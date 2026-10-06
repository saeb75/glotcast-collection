import { z } from "zod"

/** `page` (1-based) and `pageSize` (≤ 50) — every paginated route takes these. */
export const pageQuerySchema = z.object({
  page: z.coerce.number().int().min(1).default(1),
  pageSize: z.coerce.number().int().min(1).max(50).default(20),
})
export type PageQuery = z.infer<typeof pageQuerySchema>

/** `Page<T>` of the contract. */
export const pageOf = <T extends z.ZodType>(item: T) =>
  z.object({
    items: z.array(item),
    page: z.number().int(),
    pageSize: z.number().int(),
    total: z.number().int(),
    hasMore: z.boolean(),
  })

export interface Page<T> {
  items: T[]
  page: number
  pageSize: number
  total: number
  hasMore: boolean
}

export const offsetOf = (q: PageQuery): number => (q.page - 1) * q.pageSize

export function toPage<T>(items: T[], total: number, q: PageQuery): Page<T> {
  return { items, page: q.page, pageSize: q.pageSize, total, hasMore: offsetOf(q) + items.length < total }
}
