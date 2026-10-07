import { create } from "zustand"
import { type AutomationsForm } from "@/domain/automations"
import { type Entry } from "@/domain/cache"
import { type AutomationsView, type NotificationsStatus } from "@/schemas/admin"

interface AutomationsState {
  /** What the API has: the settings, the status, the last 7 days. */
  entry?: Entry<AutomationsView>
  /** What is on screen (edited, not saved yet). */
  draft?: AutomationsForm
  /** Inline errors by field path ("streakSaver.time"). */
  errors: Record<string, string>
  saving: boolean
  /** Whether pushes can go out at all (the banner on the notification pages). */
  status?: Entry<NotificationsStatus>
  setEntry: (entry: Entry<AutomationsView>) => void
  setDraft: (draft: AutomationsForm | undefined) => void
  setErrors: (errors: Record<string, string>) => void
  setSaving: (saving: boolean) => void
  setStatus: (status: Entry<NotificationsStatus>) => void
  clear: () => void
}

export const useAutomationsStore = create<AutomationsState>()((set) => ({
  errors: {},
  saving: false,
  setEntry: (entry) => set({ entry }),
  setDraft: (draft) => set({ draft }),
  setErrors: (errors) => set({ errors }),
  setSaving: (saving) => set({ saving }),
  setStatus: (status) => set({ status }),
  clear: () => set({ entry: undefined, draft: undefined, errors: {}, saving: false, status: undefined }),
}))
