import { create } from "zustand"
import { type Entry } from "@/domain/cache"
import { type AdminList, type AdminListDetail } from "@/schemas/admin"

interface ListsState {
  entry?: Entry<AdminList[]>
  details: Record<string, Entry<AdminListDetail>>
  setEntry: (entry: Entry<AdminList[]>) => void
  setDetail: (id: string, entry: Entry<AdminListDetail>) => void
  clear: () => void
}

export const useListsStore = create<ListsState>()((set) => ({
  details: {},
  setEntry: (entry) => set({ entry }),
  setDetail: (id, entry) => set((s) => ({ details: { ...s.details, [id]: entry } })),
  clear: () => set({ entry: undefined, details: {} }),
}))
