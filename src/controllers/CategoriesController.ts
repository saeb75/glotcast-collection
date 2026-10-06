import { createCategory, deleteCategory, listCategories, updateCategory } from "@/api/categories"
import { CATEGORIES } from "@/copy/categories"
import { type AdminCategory, type CategoryInput } from "@/schemas/admin"
import { useCategoriesStore } from "@/stores/useCategoriesStore"
import { loadEntry, runAction } from "./load"

const store = useCategoriesStore.getState
const MAX_AGE = 60_000

export class CategoriesController {
  static async load(force = false): Promise<void> {
    await loadEntry(
      () => store().entry,
      (e) => store().setEntry(e),
      listCategories,
      MAX_AGE,
      force,
    )
  }

  static async save(id: string | null, input: CategoryInput & { name: string }): Promise<AdminCategory | undefined> {
    const saved = await runAction(
      () => (id ? updateCategory(id, input) : createCategory(input)),
      id ? CATEGORIES.saved : CATEGORIES.created,
    )
    if (saved) await this.load(true)
    return saved
  }

  static async remove(id: string): Promise<boolean> {
    const done = await runAction(async () => {
      await deleteCategory(id)
      return true
    }, CATEGORIES.deleted)
    if (done) await this.load(true)
    return done === true
  }

  static reset(): void {
    store().clear()
  }
}
