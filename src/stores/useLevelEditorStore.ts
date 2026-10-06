import { create } from "zustand"
import { type LevelDraft } from "@/domain/levelDraft"

/** The levels being edited, keyed `${episodeId}:${level}` (`draftKey`); kept while the panel is open. */
interface LevelEditorState {
  drafts: Record<string, LevelDraft>
  setDraft: (key: string, draft: LevelDraft) => void
  removeDrafts: (episodeId: string) => void
  clear: () => void
}

export const useLevelEditorStore = create<LevelEditorState>()((set) => ({
  drafts: {},
  setDraft: (key, draft) => set((s) => ({ drafts: { ...s.drafts, [key]: draft } })),
  removeDrafts: (episodeId) =>
    set((s) => ({
      drafts: Object.fromEntries(Object.entries(s.drafts).filter(([key]) => !key.startsWith(`${episodeId}:`))),
    })),
  clear: () => set({ drafts: {} }),
}))
