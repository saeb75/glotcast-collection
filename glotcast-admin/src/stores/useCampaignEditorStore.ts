import { create } from "zustand"
import { type Entry } from "@/domain/cache"
import { type CampaignDraft, type DeliveryDraft, type MessageDraft } from "@/domain/campaign"
import { type AdminEpisode, type CampaignSource, type Locale, type Reach } from "@/schemas/admin"

/** One campaign being edited ("new" before its first save): survives leaving the page. */
export interface CampaignEditor {
  /** What the API has; null for a campaign not created yet. */
  base: CampaignDraft | null
  /** What is on screen. */
  draft: CampaignDraft
  /** Chosen when sending; never saved with the draft. */
  delivery: DeliveryDraft
  /** The last machine translation per language ("reset" goes back to it). */
  machine: Partial<Record<Locale, MessageDraft>>
  /** The source text that translation was made from. */
  translatedFrom: { source: CampaignSource; title: string; body: string } | null
  /** Inline errors by field path ("messages.de.title", "link.id"). */
  errors: Record<string, string>
  previewLanguage: Locale
}

export type EditorDialog = { key: string; kind: "send" | "test" }

interface CampaignEditorState {
  editors: Record<string, CampaignEditor>
  saving: Record<string, boolean>
  translating: Record<string, boolean>
  /** Reach per audience, keyed by `audienceKey`. */
  reach: Record<string, Entry<Reach>>
  reachShownKey?: string
  /** Linked episodes by id (null: looked up, not found). */
  episodes: Record<string, AdminEpisode | null>
  /** The send dialog or the test popover to open (it outlives the first save's navigation). */
  dialog: EditorDialog | null
  setEditor: (key: string, editor: CampaignEditor | undefined) => void
  setSaving: (key: string, saving: boolean) => void
  setTranslating: (key: string, translating: boolean) => void
  setReach: (key: string, entry: Entry<Reach>) => void
  setReachShownKey: (key: string) => void
  addEpisodes: (found: AdminEpisode[], missing?: string[]) => void
  setDialog: (dialog: EditorDialog | null) => void
  clear: () => void
}

export const useCampaignEditorStore = create<CampaignEditorState>()((set) => ({
  editors: {},
  saving: {},
  translating: {},
  reach: {},
  episodes: {},
  dialog: null,
  setEditor: (key, editor) =>
    set((s) => {
      const { [key]: _old, ...rest } = s.editors
      return { editors: editor ? { ...rest, [key]: editor } : rest }
    }),
  setSaving: (key, saving) => set((s) => ({ saving: { ...s.saving, [key]: saving } })),
  setTranslating: (key, translating) =>
    set((s) => ({ translating: { ...s.translating, [key]: translating } })),
  setReach: (key, entry) => set((s) => ({ reach: { ...s.reach, [key]: entry } })),
  setReachShownKey: (reachShownKey) => set({ reachShownKey }),
  addEpisodes: (found, missing = []) =>
    set((s) => ({
      episodes: {
        ...s.episodes,
        ...Object.fromEntries(missing.map((id) => [id, null])),
        ...Object.fromEntries(found.map((e) => [e.id, e])),
      },
    })),
  setDialog: (dialog) => set({ dialog }),
  clear: () =>
    set({
      editors: {},
      saving: {},
      translating: {},
      reach: {},
      reachShownKey: undefined,
      episodes: {},
      dialog: null,
    }),
}))
