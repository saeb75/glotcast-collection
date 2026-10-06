import { createList, deleteList, getList, listLists, setListEpisodes, updateList } from "@/api/lists"
import { LISTS } from "@/copy/lists"
import { withData } from "@/domain/cache"
import { type AdminListDetail, type ListInput } from "@/schemas/admin"
import { useListsStore } from "@/stores/useListsStore"
import { loadEntry, runAction } from "./load"

const store = useListsStore.getState
const MAX_AGE = 30_000

export class ListsController {
  static async load(force = false): Promise<void> {
    await loadEntry(
      () => store().entry,
      (e) => store().setEntry(e),
      listLists,
      MAX_AGE,
      force,
    )
  }

  static async loadList(id: string, force = false): Promise<void> {
    await loadEntry(
      () => store().details[id],
      (e) => store().setDetail(id, e),
      () => getList(id),
      MAX_AGE,
      force,
    )
  }

  static async create(input: ListInput & { name: string }): Promise<AdminListDetail | undefined> {
    const saved = await runAction(() => createList(input), LISTS.created)
    if (saved) this.stored(saved)
    return saved
  }

  static async update(id: string, input: ListInput): Promise<AdminListDetail | undefined> {
    const saved = await runAction(() => updateList(id, input), LISTS.saved)
    if (saved) this.stored(saved)
    return saved
  }

  /** The list's episodes, in this order. */
  static async setEpisodes(id: string, episodeIds: string[]): Promise<AdminListDetail | undefined> {
    const saved = await runAction(() => setListEpisodes(id, episodeIds), LISTS.orderSaved)
    if (saved) this.stored(saved)
    return saved
  }

  static async remove(id: string): Promise<boolean> {
    const done = await runAction(async () => {
      await deleteList(id)
      return true
    }, LISTS.deleted)
    if (done) void this.load(true)
    return done === true
  }

  private static stored(list: AdminListDetail): void {
    store().setDetail(list.id, withData(list))
    void this.load(true)
  }

  static reset(): void {
    store().clear()
  }
}
