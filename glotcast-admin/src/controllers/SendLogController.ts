import { errorCode } from "@/api/errors"
import { listSends } from "@/api/notifications"
import { ERRORS } from "@/copy/common"
import { type SendLogQuery, sendLogKey, sendLogRequest } from "@/domain/lists"
import { ToastService } from "@/services/ToastService"
import { useSendLogStore } from "@/stores/useSendLogStore"
import { loadEntry } from "./load"

const store = useSendLogStore.getState
const MAX_AGE = 15_000

/** Every planned push, newest first, by filter; older ones appended by cursor. */
export class SendLogController {
  static async load(query: SendLogQuery, force = false): Promise<void> {
    const key = sendLogKey(query)
    await loadEntry(
      () => store().logs[key],
      (e) => store().setLog(key, e),
      async () => {
        const page = await listSends(sendLogRequest(query))
        return { items: page.entries, nextBefore: page.nextBefore }
      },
      MAX_AGE,
      force,
    )
  }

  /** Older entries for the same filters, appended. */
  static async loadMore(query: SendLogQuery): Promise<void> {
    const key = sendLogKey(query)
    const entry = store().logs[key]
    const before = entry?.data?.nextBefore
    if (!entry?.data || before === undefined || store().loadingMore[key]) return
    store().setLoadingMore(key, true)
    try {
      const page = await listSends({ ...sendLogRequest(query), before })
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
