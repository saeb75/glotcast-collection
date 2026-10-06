import { create } from "zustand"
import { type Entry } from "@/domain/cache"
import { type EpisodePage } from "@/schemas/admin"

/** The episode picker's searches (lists, home slider), apart from the Episodes page's own cache. */
interface PickerState {
  results: Record<string, Entry<EpisodePage>>
  shownKey?: string
  setResult: (key: string, entry: Entry<EpisodePage>) => void
  setShownKey: (key: string) => void
  clear: () => void
}

export const usePickerStore = create<PickerState>()((set) => ({
  results: {},
  setResult: (key, entry) => set((s) => ({ results: { ...s.results, [key]: entry } })),
  setShownKey: (shownKey) => set({ shownKey }),
  clear: () => set({ results: {}, shownKey: undefined }),
}))
