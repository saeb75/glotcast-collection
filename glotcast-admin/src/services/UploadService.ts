import axios from "axios"

/**
 * PUTs a file to a presigned R2 URL with progress. A plain axios call: no API base URL and, above all, no
 * admin bearer (R2 would reject it, and the token must never leave for another origin).
 */
export class UploadService {
  static async put(
    url: string,
    file: Blob,
    contentType: string,
    onProgress: (fraction: number) => void,
    signal?: AbortSignal,
  ): Promise<void> {
    await axios.put(url, file, {
      headers: { "Content-Type": contentType },
      timeout: 0,
      signal,
      // R2 answers XML or nothing; nothing to parse.
      responseType: "text",
      onUploadProgress: (e) => {
        if (e.total) onProgress(Math.min(1, e.loaded / e.total))
      },
    })
    onProgress(1)
  }
}
