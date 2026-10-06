import { presignUpload } from "@/api/media"
import { contentTypeOf, safeFileName } from "@/domain/media"
import { type MediaFolder } from "@/schemas/admin"
import { type ImageCompression, ImageCompressionService } from "@/services/ImageCompressionService"
import { UploadService } from "@/services/UploadService"

/** Files to R2: compress in the browser (optional), presign with the API, PUT straight to the bucket. */
export class MediaController {
  /** Uploads the file as is; answers its public URL. */
  static async upload(
    file: File,
    folder: MediaFolder,
    onProgress: (fraction: number) => void,
    signal?: AbortSignal,
  ): Promise<string> {
    const contentType = contentTypeOf(file)
    const presigned = await presignUpload({ folder, filename: safeFileName(file.name), contentType })
    await UploadService.put(presigned.uploadUrl, file, contentType, onProgress, signal)
    return presigned.publicUrl
  }

  /** A cover or banner: compressed to JPEG unless "none", then uploaded to `images/`. */
  static async uploadImage(
    file: File,
    compression: ImageCompression,
    onProgress: (fraction: number) => void,
  ): Promise<string> {
    const ready = compression === "none" ? file : await ImageCompressionService.compress(file, compression)
    return this.upload(ready, "images", onProgress)
  }
}
