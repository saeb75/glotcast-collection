import { create } from "zustand"
import { type Entry, staleAll } from "@/domain/cache"
import { type AdminPodcast, type PodcastPage } from "@/schemas/admin"

interface PodcastsState {
  /** One entry per list query, keyed by `podcastsKey`. */
  pages: Record<string, Entry<PodcastPage>>
  /** The last query that loaded: shown while the next one loads (no flash while typing). */
  shownKey?: string
  details: Record<string, Entry<AdminPodcast>>
  /** Every podcast (for pickers: the episode filter and form). */
  options?: Entry<AdminPodcast[]>
  setPage: (key: string, entry: Entry<PodcastPage>) => void
  setShownKey: (key: string) => void
  setDetail: (id: string, entry: Entry<AdminPodcast>) => void
  setOptions: (entry: Entry<AdminPodcast[]>) => void
  /** After a write: every cached list is stale (still shown until reloaded). */
  dropPages: () => void
  clear: () => void
}

export const usePodcastsStore = create<PodcastsState>()((set) => ({
  pages: {},
  details: {},
  setPage: (key, entry) => set((s) => ({ pages: { ...s.pages, [key]: entry } })),
  setShownKey: (shownKey) => set({ shownKey }),
  setDetail: (id, entry) => set((s) => ({ details: { ...s.details, [id]: entry } })),
  setOptions: (options) => set({ options }),
  dropPages: () => set((s) => ({ pages: staleAll(s.pages), options: s.options && { ...s.options, at: 0 } })),
  clear: () => set({ pages: {}, shownKey: undefined, details: {}, options: undefined }),
}))
