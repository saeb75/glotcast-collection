import { listEpisodes } from "@/api/episodes"
import { listPodcasts } from "@/api/podcasts"
import { useCommandStore } from "@/stores/useCommandStore"
import { loadEntry } from "./load"

const store = useCommandStore.getState

/** The ⌘K menu: pages to jump to, podcasts and episodes found by name. */
export class CommandController {
  static setOpen(open: boolean): void {
    store().setOpen(open)
    if (!open) {
      store().setQuery("")
      store().setResults(undefined)
    }
  }

  static toggle(): void {
    this.setOpen(!store().open)
  }

  /** Podcasts and episodes matching what was typed (2+ characters); a newer search wins over a slower one. */
  static async search(query: string): Promise<void> {
    const q = query.trim()
    store().setQuery(q)
    if (q.length < 2) return store().setResults(undefined)
    await loadEntry(
      () => undefined,
      (entry) => {
        if (store().query === q) store().setResults(entry)
      },
      async () => {
        const [podcasts, episodes] = await Promise.all([
          listPodcasts({ q, page: 1, pageSize: 5 }),
          listEpisodes({ q, page: 1, pageSize: 8 }),
        ])
        return { podcasts: podcasts.items, episodes: episodes.items }
      },
      0,
      true,
    )
  }
}
