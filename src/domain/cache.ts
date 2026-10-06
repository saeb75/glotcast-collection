/** One cached answer: data once loaded, when (ms), in flight, the last error's message. */
export interface Entry<T> {
  data?: T
  at: number
  loading: boolean
  error?: string
}

export const EMPTY: Entry<never> = { at: 0, loading: false }

export const isFresh = (entry: Entry<unknown> | undefined, maxAgeMs: number) =>
  entry?.data !== undefined && Date.now() - entry.at < maxAgeMs

/** Load unless a fresh copy is there or a load is already running. */
export const needsLoad = (entry: Entry<unknown> | undefined, maxAgeMs: number, force: boolean) =>
  !entry?.loading && (force || !isFresh(entry, maxAgeMs))

/** The same entry with new data (after a save), marked fresh. */
export const withData = <T>(data: T): Entry<T> => ({ data, at: Date.now(), loading: false })

/** Every entry kept but marked stale: shown until the next load replaces it (after a write). */
export const staleAll = <T>(entries: Record<string, Entry<T>>): Record<string, Entry<T>> =>
  Object.fromEntries(Object.entries(entries).map(([key, entry]) => [key, { ...entry, at: 0 }]))
