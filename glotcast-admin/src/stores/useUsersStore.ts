import { create } from "zustand"
import { type Entry, staleAll } from "@/domain/cache"
import { type AdminUser, type UserPage } from "@/schemas/admin"

interface UsersState {
  pages: Record<string, Entry<UserPage>>
  shownKey?: string
  details: Record<string, Entry<AdminUser>>
  /** A featureAccess change in flight, per user. */
  saving: Record<string, boolean>
  setPage: (key: string, entry: Entry<UserPage>) => void
  setShownKey: (key: string) => void
  setDetail: (id: string, entry: Entry<AdminUser>) => void
  setSaving: (id: string, saving: boolean) => void
  dropPages: () => void
  clear: () => void
}

export const useUsersStore = create<UsersState>()((set) => ({
  pages: {},
  details: {},
  saving: {},
  setPage: (key, entry) => set((s) => ({ pages: { ...s.pages, [key]: entry } })),
  setShownKey: (shownKey) => set({ shownKey }),
  setDetail: (id, entry) => set((s) => ({ details: { ...s.details, [id]: entry } })),
  setSaving: (id, saving) => set((s) => ({ saving: { ...s.saving, [id]: saving } })),
  dropPages: () => set((s) => ({ pages: staleAll(s.pages) })),
  clear: () => set({ pages: {}, shownKey: undefined, details: {}, saving: {} }),
}))
