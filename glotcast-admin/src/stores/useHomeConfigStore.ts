import { create } from "zustand"
import { type Entry } from "@/domain/cache"
import { type AdminEpisode, type HomeConfig } from "@/schemas/admin"

interface HomeConfigState {
  /** What the API has. */
  entry?: Entry<HomeConfig>
  /** What is on screen (edited, not saved yet). */
  draft?: HomeConfig
  /** Episodes shown in the slider, by id (the config only has ids). */
  episodes: Record<string, AdminEpisode>
  saving: boolean
  setEntry: (entry: Entry<HomeConfig>) => void
  setDraft: (draft: HomeConfig | undefined) => void
  addEpisodes: (episodes: AdminEpisode[]) => void
  setSaving: (saving: boolean) => void
  clear: () => void
}

export const useHomeConfigStore = create<HomeConfigState>()((set) => ({
  episodes: {},
  saving: false,
  setEntry: (entry) => set({ entry }),
  setDraft: (draft) => set({ draft }),
  addEpisodes: (list) =>
    set((s) => ({ episodes: { ...s.episodes, ...Object.fromEntries(list.map((e) => [e.id, e])) } })),
  setSaving: (saving) => set({ saving }),
  clear: () => set({ entry: undefined, draft: undefined, episodes: {}, saving: false }),
}))
