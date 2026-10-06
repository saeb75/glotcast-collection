import { create } from "zustand"
import { type Entry } from "@/domain/cache"
import { type Dashboard } from "@/schemas/admin"

interface DashboardState {
  entry?: Entry<Dashboard>
  setEntry: (entry: Entry<Dashboard>) => void
  clear: () => void
}

export const useDashboardStore = create<DashboardState>()((set) => ({
  setEntry: (entry) => set({ entry }),
  clear: () => set({ entry: undefined }),
}))
