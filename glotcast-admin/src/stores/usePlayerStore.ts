import { create } from "zustand"

/** The level editor's player: where it is, whether it plays, and whether the transcript follows it. */
interface PlayerState {
  /** The draft whose audio is loaded. */
  key?: string
  time: number
  duration: number | null
  playing: boolean
  follow: boolean
  rate: number
  setKey: (key: string | undefined) => void
  setTime: (time: number) => void
  setDuration: (duration: number | null) => void
  setPlaying: (playing: boolean) => void
  setFollow: (follow: boolean) => void
  setRate: (rate: number) => void
}

export const usePlayerStore = create<PlayerState>()((set) => ({
  time: 0,
  duration: null,
  playing: false,
  follow: true,
  rate: 1,
  setKey: (key) => set({ key, time: 0, duration: null, playing: false }),
  setTime: (time) => set({ time }),
  setDuration: (duration) => set({ duration }),
  setPlaying: (playing) => set({ playing }),
  setFollow: (follow) => set({ follow }),
  setRate: (rate) => set({ rate }),
}))
