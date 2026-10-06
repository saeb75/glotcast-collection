import { getAudit } from "@/api/audit"
import { errorCode } from "@/api/errors"
import { ERRORS } from "@/copy/common"
import { type AuditQuery, auditKey, auditRequest } from "@/domain/lists"
import { ToastService } from "@/services/ToastService"
import { useAuditStore } from "@/stores/useAuditStore"
import { loadEntry } from "./load"

const store = useAuditStore.getState
const MAX_AGE = 15_000

export class AuditController {
  static async load(query: AuditQuery, force = false): Promise<void> {
    const key = auditKey(query)
    await loadEntry(
      () => store().logs[key],
      (e) => store().setLog(key, e),
      async () => {
        const page = await getAudit(auditRequest(query))
        return { items: page.entries, nextBefore: page.nextBefore }
      },
      MAX_AGE,
      force,
    )
  }

  /** Older entries for the same filters, appended. */
  static async loadMore(query: AuditQuery): Promise<void> {
    const key = auditKey(query)
    const entry = store().logs[key]
    const before = entry?.data?.nextBefore
    if (!entry?.data || before === undefined || store().loadingMore[key]) return
    store().setLoadingMore(key, true)
    try {
      const page = await getAudit({ ...auditRequest(query), before })
      const items = [...(store().logs[key]?.data?.items ?? []), ...page.entries]
      store().setLog(key, { ...entry, data: { items, nextBefore: page.nextBefore } })
    } catch (error) {
      ToastService.error(ERRORS[errorCode(error).code])
    } finally {
      store().setLoadingMore(key, false)
    }
  }

  static reset(): void {
    store().clear()
  }
}
