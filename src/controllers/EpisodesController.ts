import {
  createEpisode,
  deleteEpisode,
  getEpisode,
  listEpisodes,
  publishEpisode,
  unpublishEpisode,
  updateEpisode,
} from "@/api/episodes"
import { EPISODES } from "@/copy/episodes"
import { withData } from "@/domain/cache"
import { formatDateTime } from "@/domain/format"
import { type EpisodesQuery, episodesKey, episodesRequest } from "@/domain/lists"
import { type AdminEpisode, type AdminEpisodeDetail, type EpisodeCreateInput, type EpisodeInput } from "@/schemas/admin"
import { useEpisodesStore } from "@/stores/useEpisodesStore"
import { LevelEditorController } from "./LevelEditorController"
import { loadEntry, loadShown, runAction } from "./load"

const store = useEpisodesStore.getState
const LIST_AGE = 30_000
const DETAIL_AGE = 60_000

export class EpisodesController {
  static async load(query: EpisodesQuery, force = false): Promise<void> {
    const key = episodesKey(query)
    await loadShown(
      () => store().pages[key],
      (e) => store().setPage(key, e),
      () => store().setShownKey(key),
      () => listEpisodes(episodesRequest(query)),
      LIST_AGE,
      force,
    )
  }

  /** The episode with its transcripts; the level drafts follow it (unsaved edits are kept). */
  static async loadEpisode(id: string, force = false): Promise<void> {
    const episode = await loadEntry(
      () => store().details[id],
      (e) => store().setDetail(id, e),
      () => getEpisode(id),
      DETAIL_AGE,
      force,
    )
    if (episode) LevelEditorController.sync(episode)
    else {
      const cached = store().details[id]?.data
      if (cached) LevelEditorController.sync(cached)
    }
  }

  static async create(input: EpisodeCreateInput): Promise<AdminEpisodeDetail | undefined> {
    const episode = await runAction(() => createEpisode(input), EPISODES.create.created)
    if (episode) this.stored(episode)
    return episode
  }

  /** The details form (and the cover generator's "use as"). */
  static async update(id: string, input: EpisodeInput, success = EPISODES.form.saved) {
    return this.busy(id, "save", async () => {
      const episode = await runAction(() => updateEpisode(id, input), success)
      if (episode) this.stored(episode)
      return episode
    })
  }

  static async publish(id: string) {
    return this.busy(id, "publish", async () => {
      const episode = await runAction(() => publishEpisode(id), EPISODES.editor.published)
      if (episode) this.merged(episode)
      return episode
    })
  }

  static async unpublish(id: string) {
    return this.busy(id, "unpublish", async () => {
      const episode = await runAction(() => unpublishEpisode(id), EPISODES.editor.unpublished)
      if (episode) this.merged(episode)
      return episode
    })
  }

  /** Goes live at `publishedAt` (ISO, in the future). */
  static async schedule(id: string, publishedAt: string) {
    return this.update(id, { publishedAt }, EPISODES.editor.scheduled(formatDateTime(publishedAt)))
  }

  static async remove(id: string): Promise<boolean> {
    const done = await this.busy(id, "delete", () =>
      runAction(async () => {
        await deleteEpisode(id)
        return true
      }, EPISODES.editor.deleted),
    )
    if (done) {
      store().dropDetail(id)
      store().dropPages()
      LevelEditorController.forget(id)
    }
    return done === true
  }

  /** A whole episode came back (create, update, a level saved). */
  static stored(episode: AdminEpisodeDetail, forceLevels: AdminEpisodeDetail["levels"][number]["level"][] = []): void {
    store().setDetail(episode.id, withData(episode))
    store().dropPages()
    LevelEditorController.sync(episode, forceLevels)
  }

  /** Publish / unpublish answer the episode without transcripts: keep the ones we have. */
  private static merged(episode: AdminEpisode): void {
    const current = store().details[episode.id]?.data
    if (current) store().setDetail(episode.id, withData({ ...current, ...episode, levels: current.levels }))
    else void this.loadEpisode(episode.id, true)
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
