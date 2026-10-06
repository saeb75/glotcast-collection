import { listEpisodes } from "@/api/episodes"
import { keyOf } from "@/domain/query"
import { usePickerStore } from "@/stores/usePickerStore"
import { loadShown } from "./load"

const store = usePickerStore.getState
export const PICKER_PAGE = 20

export const pickerKey = (q: string, podcast: string, pageSize: number) => keyOf(q, podcast, pageSize)

/** The episode picker: episodes matching what was typed (drafts included), newest first. */
export class PickerController {
  static async search(q: string, podcast: string, pageSize = PICKER_PAGE): Promise<void> {
    const key = pickerKey(q, podcast, pageSize)
    await loadShown(
      () => store().results[key],
      (e) => store().setResult(key, e),
      () => store().setShownKey(key),
      () =>
        listEpisodes({
          q: q || undefined,
          podcastId: podcast === "all" ? undefined : podcast,
          page: 1,
          pageSize,
        }),
      30_000,
    )
  }

  static reset(): void {
    store().clear()
  }
}
