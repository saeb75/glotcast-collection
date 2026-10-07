import { findEpisodes } from "@/api/episodes"
import { getHomeConfig, putHomeConfig } from "@/api/homeConfig"
import { HOME } from "@/copy/home"
import { withData } from "@/domain/cache"
import { addUnique, sameOrder, without } from "@/domain/order"
import { type AdminEpisode, type HomeConfig } from "@/schemas/admin"
import { useHomeConfigStore } from "@/stores/useHomeConfigStore"
import { ListsController } from "./ListsController"
import { loadEntry, runAction } from "./load"

const store = useHomeConfigStore.getState
const MAX_AGE = 30_000

export type HomeSection = keyof HomeConfig

export const isHomeDirty = (draft: HomeConfig | undefined, saved: HomeConfig | undefined) =>
  Boolean(
    draft &&
    saved &&
    (!sameOrder(draft.sliderEpisodeIds, saved.sliderEpisodeIds) ||
      !sameOrder(draft.homeListIds, saved.homeListIds) ||
      !sameOrder(draft.exploreListIds, saved.exploreListIds)),
  )

export class HomeConfigController {
  static async load(force = false): Promise<void> {
    const before = store().entry?.data
    void ListsController.load(force)
    const config = await loadEntry(
      () => store().entry,
      (e) => store().setEntry(e),
      getHomeConfig,
      MAX_AGE,
      force,
    )
    if (!config) return
    // Unsaved edits survive a reload; otherwise the screen shows what was loaded.
    if (!store().draft || !isHomeDirty(store().draft, before)) store().setDraft(config)
    await this.resolve(config.sliderEpisodeIds)
  }

  /** Looks up episodes the screen can't name yet. */
  private static async resolve(ids: string[]): Promise<void> {
    const unknown = ids.filter((id) => !store().episodes[id])
    if (unknown.length === 0) return
    try {
      store().addEpisodes(await findEpisodes(unknown))
    } catch {
      // Shown as "Unknown episode"; the ids are still saved as they are.
    }
  }

  static setOrder(section: HomeSection, ids: string[]): void {
    const draft = store().draft
    if (draft) store().setDraft({ ...draft, [section]: ids })
  }

  static add(section: HomeSection, id: string): void {
    const draft = store().draft
    if (draft) store().setDraft({ ...draft, [section]: addUnique(draft[section], id) })
  }

  static remove(section: HomeSection, id: string): void {
    const draft = store().draft
    if (draft) store().setDraft({ ...draft, [section]: without(draft[section], id) })
  }

  /** The picker added an episode to the slider (it is known, no lookup needed). */
  static addEpisode(episode: AdminEpisode): void {
    store().addEpisodes([episode])
    this.add("sliderEpisodeIds", episode.id)
  }

  static async save(): Promise<void> {
    const draft = store().draft
    if (!draft || store().saving) return
    store().setSaving(true)
    try {
      const saved = await runAction(() => putHomeConfig(draft), HOME.saved)
      if (saved) {
        store().setEntry(withData(saved))
        store().setDraft(saved)
      }
    } finally {
      store().setSaving(false)
    }
  }

  static discard(): void {
    const saved = store().entry?.data
    if (saved) store().setDraft(saved)
  }

  static reset(): void {
    store().clear()
  }
}
