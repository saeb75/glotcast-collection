import { type MediaFolder, presignedSchema } from "@/schemas/admin"
import { api } from "./client"

/** A presigned R2 PUT (15 minutes) and where the file will be served. */
export async function presignUpload(body: { folder: MediaFolder; filename: string; contentType: string }) {
  return presignedSchema.parse((await api.post("/v1/admin/media/presign", body)).data)
}
