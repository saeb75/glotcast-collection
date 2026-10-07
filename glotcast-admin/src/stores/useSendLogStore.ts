import { create } from "zustand"
import { type Entry } from "@/domain/cache"
import { type SendRow } from "@/schemas/admin"

export interface SendLogPage {
  items: SendRow[]
  nextBefore?: number
}

interface SendLogState {
  /** One log per filter, keyed by `sendLogKey`. */
  logs: Record<string, Entry<SendLogPage>>
  loadingMore: Record<string, boolean>
  setLog: (key: string, entry: Entry<SendLogPage>) => void
  setLoadingMore: (key: string, loading: boolean) => void
  clear: () => void
}

export const useSendLogStore = create<SendLogState>()((set) => ({
  logs: {},
  loadingMore: {},
  setLog: (key, entry) => set((s) => ({ logs: { ...s.logs, [key]: entry } })),
  setLoadingMore: (key, loading) => set((s) => ({ loadingMore: { ...s.loadingMore, [key]: loading } })),
  clear: () => set({ logs: {}, loadingMore: {} }),
}))
