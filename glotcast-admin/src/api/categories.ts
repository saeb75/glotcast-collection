import { type CategoryInput, categoriesSchema, categorySchema } from "@/schemas/admin"
import { api } from "./client"

/** Every category, by position. */
export async function listCategories() {
  return categoriesSchema.parse((await api.get("/v1/admin/categories")).data)
}

export async function createCategory(body: CategoryInput & { name: string }) {
  return categorySchema.parse((await api.post("/v1/admin/categories", body)).data)
}

export async function updateCategory(id: string, body: CategoryInput) {
  return categorySchema.parse((await api.patch(`/v1/admin/categories/${id}`, body)).data)
}

export async function deleteCategory(id: string) {
  await api.delete(`/v1/admin/categories/${id}`)
}
