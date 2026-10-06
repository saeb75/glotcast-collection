import { create } from "zustand"
import { type Entry, staleAll } from "@/domain/cache"
import { type AdminEpisodeDetail, type EpisodePage } from "@/schemas/admin"

interface EpisodesState {
  /** One entry per list query, keyed by `episodesKey`. */
  pages: Record<string, Entry<EpisodePage>>
  shownKey?: string
  /** Episodes with their transcripts (the editor). */
  details: Record<string, Entry<AdminEpisodeDetail>>
  /** An action in flight on an episode (publish, unpublish, schedule, delete, save details). */
  busy: Record<string, string | undefined>
  setPage: (key: string, entry: Entry<EpisodePage>) => void
  setShownKey: (key: string) => void
  setDetail: (id: string, entry: Entry<AdminEpisodeDetail>) => void
  setBusy: (id: string, action: string | undefined) => void
  dropPages: () => void
  dropDetail: (id: string) => void
  clear: () => void
}

export const useEpisodesStore = create<EpisodesState>()((set) => ({
  pages: {},
  details: {},
  busy: {},
  setPage: (key, entry) => set((s) => ({ pages: { ...s.pages, [key]: entry } })),
  setShownKey: (shownKey) => set({ shownKey }),
  setDetail: (id, entry) => set((s) => ({ details: { ...s.details, [id]: entry } })),
  setBusy: (id, action) => set((s) => ({ busy: { ...s.busy, [id]: action } })),
  dropPages: () => set((s) => ({ pages: staleAll(s.pages) })),
  dropDetail: (id) =>
    set((s) => {
      const { [id]: _gone, ...details } = s.details
      return { details }
    }),
  clear: () => set({ pages: {}, shownKey: undefined, details: {}, busy: {} }),
}))
