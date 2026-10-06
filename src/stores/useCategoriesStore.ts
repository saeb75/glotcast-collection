import { create } from "zustand"
import { type Entry } from "@/domain/cache"
import { type AdminCategory } from "@/schemas/admin"

interface CategoriesState {
  entry?: Entry<AdminCategory[]>
  setEntry: (entry: Entry<AdminCategory[]>) => void
  clear: () => void
}

export const useCategoriesStore = create<CategoriesState>()((set) => ({
  setEntry: (entry) => set({ entry }),
  clear: () => set({ entry: undefined }),
}))
