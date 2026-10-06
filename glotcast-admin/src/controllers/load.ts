import { errorCode } from "@/api/errors"
import { ERRORS } from "@/copy/common"
import { type Entry, EMPTY, needsLoad } from "@/domain/cache"
import { ToastService } from "@/services/ToastService"

/**
 * The cache rule every controller follows: skip when fresh or already loading, keep the old data while
 * reloading, store the error's wording on failure. Returns the new data, or undefined when nothing loaded.
 */
export async function loadEntry<T>(
  get: () => Entry<T> | undefined,
  put: (entry: Entry<T>) => void,
  fetcher: () => Promise<T>,
  maxAgeMs: number,
  force = false,
): Promise<T | undefined> {
  const current = get()
  if (!needsLoad(current, maxAgeMs, force)) return undefined
  put({ ...(current ?? EMPTY), loading: true, error: undefined })
  try {
    const data = await fetcher()
    put({ data, at: Date.now(), loading: false })
    return data
  } catch (error) {
    const failure = errorCode(error)
    put({ ...(get() ?? EMPTY), loading: false, error: ERRORS[failure.code] ?? failure.message })
    return undefined
  }
}

/**
 * A list page: `loadEntry`, then mark the query as the one shown (screens keep showing the previous query's
 * rows until this one has data — no flash while typing or paging).
 */
export async function loadShown<T>(
  get: () => Entry<T> | undefined,
  put: (entry: Entry<T>) => void,
  setShown: () => void,
  fetcher: () => Promise<T>,
  maxAgeMs: number,
  force = false,
): Promise<void> {
  await loadEntry(get, put, fetcher, maxAgeMs, force)
  if (get()?.data !== undefined) setShown()
}

/** The toast for a failed write: what it means, and the API's own words when it said something specific. */
export function toastFailure(error: unknown, title?: string): void {
  const failure = errorCode(error)
  const meaning = ERRORS[failure.code]
  const detail = failure.status && failure.message !== meaning ? failure.message : undefined
  ToastService.error(title ?? meaning, title ? (detail ?? meaning) : detail)
}

/** A write: runs it, toasts the outcome, returns its result — or undefined when it failed. */
export async function runAction<T>(action: () => Promise<T>, success?: string): Promise<T | undefined> {
  try {
    const result = await action()
    if (success) ToastService.success(success)
    return result
  } catch (error) {
    toastFailure(error)
    return undefined
  }
}
