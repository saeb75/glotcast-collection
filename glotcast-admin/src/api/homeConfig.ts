import { type HomeConfig, homeConfigSchema } from "@/schemas/admin"
import { api } from "./client"

export async function getHomeConfig() {
  return homeConfigSchema.parse((await api.get("/v1/admin/home-config")).data)
}

/** Replaces the whole configuration; every id must exist (400 otherwise). */
export async function putHomeConfig(body: HomeConfig) {
  return homeConfigSchema.parse((await api.put("/v1/admin/home-config", body)).data)
}
