import { create } from "zustand"
import { type CoverAspect, type CoverModel, type CoverStyle } from "@/schemas/admin"

export interface CoverSession {
  style: CoverStyle
  prompt: string
  model: CoverModel
  aspect: CoverAspect
  writing: boolean
  drawing: boolean
  /** Images generated in this session, newest first. */
  images: string[]
  selected?: string
  error?: string
}

export const NEW_COVER_SESSION: CoverSession = {
  style: "vibrant-gradient",
  prompt: "",
  model: "gemini",
  aspect: "3:4",
  writing: false,
  drawing: false,
  images: [],
}

/** One cover generator per target (`episode:<id>`, `podcast:<id>`), kept while the panel is open. */
interface CoverState {
  sessions: Record<string, CoverSession>
  patch: (key: string, patch: Partial<CoverSession>) => void
  clear: () => void
}

export const useCoverStore = create<CoverState>()((set) => ({
  sessions: {},
  patch: (key, patch) =>
    set((s) => ({ sessions: { ...s.sessions, [key]: { ...(s.sessions[key] ?? NEW_COVER_SESSION), ...patch } } })),
  clear: () => set({ sessions: {} }),
}))
