import { create } from "zustand"
import { type Entry, staleAll } from "@/domain/cache"
import { type AdminCampaign, type CampaignPage, type CampaignStats } from "@/schemas/admin"

interface CampaignsState {
  /** One entry per list query, keyed by `campaignsKey`. */
  pages: Record<string, Entry<CampaignPage>>
  /** The last query that loaded: shown while the next one loads. */
  shownKey?: string
  details: Record<string, Entry<AdminCampaign>>
  stats: Record<string, Entry<CampaignStats>>
  /** The latest campaigns (the send log's filter). */
  options?: Entry<AdminCampaign[]>
  /** An action in flight on a campaign (cancel, delete, duplicate). */
  busy: Record<string, string | undefined>
  setPage: (key: string, entry: Entry<CampaignPage>) => void
  setShownKey: (key: string) => void
  setDetail: (id: string, entry: Entry<AdminCampaign>) => void
  setStats: (id: string, entry: Entry<CampaignStats>) => void
  setOptions: (entry: Entry<AdminCampaign[]>) => void
  setBusy: (id: string, action: string | undefined) => void
  /** After a write: every cached list is stale (still shown until reloaded). */
  dropPages: () => void
  dropDetail: (id: string) => void
  clear: () => void
}

export const useCampaignsStore = create<CampaignsState>()((set) => ({
  pages: {},
  details: {},
  stats: {},
  busy: {},
  setPage: (key, entry) => set((s) => ({ pages: { ...s.pages, [key]: entry } })),
  setShownKey: (shownKey) => set({ shownKey }),
  setDetail: (id, entry) => set((s) => ({ details: { ...s.details, [id]: entry } })),
  setStats: (id, entry) => set((s) => ({ stats: { ...s.stats, [id]: entry } })),
  setOptions: (options) => set({ options }),
  setBusy: (id, action) => set((s) => ({ busy: { ...s.busy, [id]: action } })),
  dropPages: () => set((s) => ({ pages: staleAll(s.pages), options: s.options && { ...s.options, at: 0 } })),
  dropDetail: (id) =>
    set((s) => {
      const { [id]: _gone, ...details } = s.details
      const { [id]: _stats, ...stats } = s.stats
      return { details, stats }
    }),
  clear: () => set({ pages: {}, shownKey: undefined, details: {}, stats: {}, options: undefined, busy: {} }),
}))
