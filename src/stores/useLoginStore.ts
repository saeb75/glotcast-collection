import { create } from "zustand"
import { type AuthFailure } from "@/services/SupabaseService"

interface LoginState {
  step: "email" | "code"
  email: string
  busy: boolean
  error?: AuthFailure
  setStep: (step: "email" | "code") => void
  setEmail: (email: string) => void
  setBusy: (busy: boolean) => void
  setError: (error?: AuthFailure) => void
  reset: () => void
}

export const useLoginStore = create<LoginState>()((set) => ({
  step: "email",
  email: "",
  busy: false,
  setStep: (step) => set({ step }),
  setEmail: (email) => set({ email }),
  setBusy: (busy) => set({ busy }),
  setError: (error) => set({ error }),
  reset: () => set({ step: "email", email: "", busy: false, error: undefined }),
}))
