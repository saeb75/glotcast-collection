import { create } from "zustand"
import { type Entry } from "@/domain/cache"
import { type AuditEntry } from "@/schemas/admin"

export interface AuditLog {
  items: AuditEntry[]
  nextBefore?: number
}

interface AuditState {
  /** One log per filter, keyed by `auditKey`. */
  logs: Record<string, Entry<AuditLog>>
  loadingMore: Record<string, boolean>
  setLog: (key: string, entry: Entry<AuditLog>) => void
  setLoadingMore: (key: string, loading: boolean) => void
  clear: () => void
}

export const useAuditStore = create<AuditState>()((set) => ({
  logs: {},
  loadingMore: {},
  setLog: (key, entry) => set((s) => ({ logs: { ...s.logs, [key]: entry } })),
  setLoadingMore: (key, loading) => set((s) => ({ loadingMore: { ...s.loadingMore, [key]: loading } })),
  clear: () => set({ logs: {}, loadingMore: {} }),
}))
