import { create } from "zustand"

export interface SignedInUser {
  id: string
  email: string | null
}

/** unknown → checking → granted | forbidden (not an admin) | failed (the API could not answer). */
export type Access = "unknown" | "checking" | "granted" | "forbidden" | "failed"

interface AuthState {
  /** The stored session has been read (the splash hides). */
  ready: boolean
  user: SignedInUser | null
  access: Access
  accessError?: string
  setReady: (ready: boolean) => void
  setUser: (user: SignedInUser | null) => void
  setAccess: (access: Access, error?: string) => void
}

export const useAuthStore = create<AuthState>()((set) => ({
  ready: false,
  user: null,
  access: "unknown",
  setReady: (ready) => set({ ready }),
  setUser: (user) => set({ user }),
  setAccess: (access, accessError) => set({ access, accessError }),
}))
