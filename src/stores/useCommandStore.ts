import { create } from "zustand"
import { type Entry } from "@/domain/cache"
import { type AdminEpisode, type AdminPodcast } from "@/schemas/admin"

export interface CommandResults {
  podcasts: AdminPodcast[]
  episodes: AdminEpisode[]
}

/** The ⌘K menu: open or not, what was typed, what it found. */
interface CommandState {
  open: boolean
  query: string
  results?: Entry<CommandResults>
  setOpen: (open: boolean) => void
  setQuery: (query: string) => void
  setResults: (entry: Entry<CommandResults> | undefined) => void
}

export const useCommandStore = create<CommandState>()((set) => ({
  open: false,
  query: "",
  setOpen: (open) => set({ open }),
  setQuery: (query) => set({ query }),
  setResults: (results) => set({ results }),
}))
