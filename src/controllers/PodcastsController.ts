import { createPodcast, deletePodcast, getPodcast, listPodcasts, updatePodcast } from "@/api/podcasts"
import { PODCASTS } from "@/copy/podcasts"
import { withData } from "@/domain/cache"
import { type PodcastsQuery, podcastsKey, podcastsRequest } from "@/domain/lists"
import { type AdminPodcast, type PodcastInput } from "@/schemas/admin"
import { usePodcastsStore } from "@/stores/usePodcastsStore"
import { loadEntry, loadShown, runAction } from "./load"

const store = usePodcastsStore.getState
const MAX_AGE = 30_000

/** Every podcast, page by page (pickers need them all; there are dozens, not thousands). */
async function allPodcasts(): Promise<AdminPodcast[]> {
  const out: AdminPodcast[] = []
  for (let page = 1; page <= 40; page++) {
    const result = await listPodcasts({ page, pageSize: 50 })
    out.push(...result.items)
    if (!result.hasMore) break
  }
  return out.sort((a, b) => a.name.localeCompare(b.name))
}

export class PodcastsController {
  /** One page of the list for this query (cached per query for 30 s). */
  static async load(query: PodcastsQuery, force = false): Promise<void> {
    const key = podcastsKey(query)
    await loadShown(
      () => store().pages[key],
      (e) => store().setPage(key, e),
      () => store().setShownKey(key),
      () => listPodcasts(podcastsRequest(query)),
      MAX_AGE,
      force,
    )
  }

  /** Every podcast, for the episode filter and form. */
  static async loadOptions(force = false): Promise<void> {
    await loadEntry(
      () => store().options,
      (e) => store().setOptions(e),
      allPodcasts,
      5 * 60_000,
      force,
    )
  }

  static async loadPodcast(id: string, force = false): Promise<void> {
    await loadEntry(
      () => store().details[id],
      (e) => store().setDetail(id, e),
      () => getPodcast(id),
      MAX_AGE,
      force,
    )
  }

  /** Creates (no id) or updates the podcast; the saved podcast, or undefined when it failed. */
  static async save(
    id: string | null,
    input: PodcastInput & { name: string },
  ): Promise<AdminPodcast | undefined> {
    const saved = await runAction(
      () => (id ? updatePodcast(id, input) : createPodcast(input)),
      id ? PODCASTS.editor.saved : PODCASTS.editor.created,
    )
    if (saved) {
      store().setDetail(saved.id, withData(saved))
      store().dropPages()
    }
    return saved
  }

  /** Publishes or unpublishes right away (the switch on the form). */
  static async setPublished(id: string, published: boolean): Promise<AdminPodcast | undefined> {
    const saved = await runAction(() => updatePodcast(id, { published }), PODCASTS.editor.saved)
    if (saved) {
      store().setDetail(saved.id, withData(saved))
      store().dropPages()
    }
    return saved
  }

  static async remove(id: string): Promise<boolean> {
    const done = await runAction(async () => {
      await deletePodcast(id)
      return true
    }, PODCASTS.editor.deleted)
    if (done) store().dropPages()
    return done === true
  }

  static reset(): void {
    store().clear()
  }
}
