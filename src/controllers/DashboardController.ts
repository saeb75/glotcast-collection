import { getDashboard } from "@/api/dashboard"
import { useDashboardStore } from "@/stores/useDashboardStore"
import { loadEntry } from "./load"

const store = useDashboardStore.getState
const MAX_AGE = 60_000

export class DashboardController {
  static async load(force = false): Promise<void> {
    await loadEntry(
      () => store().entry,
      (e) => store().setEntry(e),
      getDashboard,
      MAX_AGE,
      force,
    )
  }

  static reset(): void {
    store().clear()
  }
}
