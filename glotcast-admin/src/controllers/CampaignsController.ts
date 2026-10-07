import {
  cancelCampaign,
  createCampaign,
  deleteCampaign,
  getCampaign,
  getCampaignStats,
  listCampaigns,
} from "@/api/notifications"
import { CAMPAIGNS } from "@/copy/campaigns"
import { withData } from "@/domain/cache"
import { type CampaignsQuery, campaignsKey, campaignsRequest } from "@/domain/lists"
import { type AdminCampaign } from "@/schemas/admin"
import { useCampaignEditorStore } from "@/stores/useCampaignEditorStore"
import { useCampaignsStore } from "@/stores/useCampaignsStore"
import { loadEntry, loadShown, runAction } from "./load"

const store = useCampaignsStore.getState
const LIST_AGE = 30_000
const DETAIL_AGE = 15_000
const STATS_AGE = 30_000

/** The campaign list, one campaign and its results; cancel, delete, duplicate. Editing: CampaignEditorController. */
export class CampaignsController {
  static async load(query: CampaignsQuery, force = false): Promise<void> {
    const key = campaignsKey(query)
    await loadShown(
      () => store().pages[key],
      (e) => store().setPage(key, e),
      () => store().setShownKey(key),
      () => listCampaigns(campaignsRequest(query)),
      LIST_AGE,
      force,
    )
  }

  static async loadCampaign(id: string, force = false): Promise<AdminCampaign | undefined> {
    await loadEntry(
      () => store().details[id],
      (e) => store().setDetail(id, e),
      () => getCampaign(id),
      DETAIL_AGE,
      force,
    )
    return store().details[id]?.data
  }

  /** `refresh` asks OneSignal now (its numbers are cached 5 minutes otherwise). */
  static async loadStats(id: string, { force = false, refresh = false } = {}): Promise<void> {
    await loadEntry(
      () => store().stats[id],
      (e) => store().setStats(id, e),
      () => getCampaignStats(id, refresh),
      STATS_AGE,
      force || refresh,
    )
  }

  /** The 50 latest campaigns (the send log's filter). */
  static async loadOptions(force = false): Promise<void> {
    await loadEntry(
      () => store().options,
      (e) => store().setOptions(e),
      async () => (await listCampaigns({ page: 1, pageSize: 50 })).items,
      60_000,
      force,
    )
  }

  static async cancel(id: string): Promise<boolean> {
    const campaign = await this.busy(id, "cancel", () =>
      runAction(() => cancelCampaign(id), CAMPAIGNS.detail.canceled),
    )
    if (campaign) {
      this.stored(campaign)
      void this.loadStats(id, { force: true })
    }
    return Boolean(campaign)
  }

  static async remove(id: string): Promise<boolean> {
    const done = await this.busy(id, "delete", () =>
      runAction(async () => {
        await deleteCampaign(id)
        return true
      }, CAMPAIGNS.detail.deleted),
    )
    if (done) {
      store().dropDetail(id)
      store().dropPages()
      useCampaignEditorStore.getState().setEditor(id, undefined)
    }
    return done === true
  }

  /** A new draft with the same messages, audience, link and image. */
  static async duplicate(c: AdminCampaign): Promise<AdminCampaign | undefined> {
    const copy = await this.busy(c.id, "duplicate", () =>
      runAction(
        () =>
          createCampaign({
            name: CAMPAIGNS.detail.copyName(c.name),
            sourceLanguage: c.sourceLanguage,
            messages: c.messages,
            audience: c.audience,
            link: c.link,
            imageUrl: c.imageUrl,
            respectQuietHours: c.respectQuietHours,
          }),
        CAMPAIGNS.detail.duplicated,
      ),
    )
    if (copy) this.stored(copy)
    return copy
  }

  /** A campaign came back from a write: cached as fresh, every list stale. */
  static stored(campaign: AdminCampaign): void {
    store().setDetail(campaign.id, withData(campaign))
    store().dropPages()
  }

  private static async busy<T>(id: string, action: string, run: () => Promise<T>): Promise<T | undefined> {
    if (store().busy[id]) return undefined
    store().setBusy(id, action)
    try {
      return await run()
    } finally {
      store().setBusy(id, undefined)
    }
  }

  static reset(): void {
    store().clear()
  }
}
