import { SetMetadata } from "@nestjs/common"

export const AUDIT = "admin:audit"

/** What an admin endpoint writes to the audit log once it answered successfully. */
export interface AuditSpec {
  action: string
  /**
   * The subject: its kind, and where its id is — a route param, or a field of the response (a created row's id).
   */
  target?: { type: string; param?: string; response?: string }
  /** Query values copied into `meta` (a search term, a filter). */
  query?: string[]
  /** Other route params copied into `meta` (the level of an episode). */
  params?: string[]
  /** Request body fields copied into `meta` (what was changed: a title, a flag — never whole transcripts). */
  body?: string[]
  /** Record only when this query value is present (a search, not every list page). */
  onlyWith?: string
}

export const Audit = (spec: AuditSpec) => SetMetadata(AUDIT, spec)
