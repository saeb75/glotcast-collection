/** Files the admin uploads: what they are and what they are called in R2. */

export const isAudioFile = (file: { type: string; name: string }) =>
  file.type.startsWith("audio/") || /\.(mp3|m4a|wav|aac|ogg|oga|flac|webm|mp4)$/i.test(file.name)

export const isImageFile = (file: { type: string; name: string }) =>
  file.type.startsWith("image/") || /\.(png|jpe?g|webp|gif|avif)$/i.test(file.name)

const EXT_TYPES: Record<string, string> = {
  mp3: "audio/mpeg",
  m4a: "audio/mp4",
  mp4: "audio/mp4",
  aac: "audio/aac",
  wav: "audio/wav",
  ogg: "audio/ogg",
  oga: "audio/ogg",
  flac: "audio/flac",
  webm: "audio/webm",
  png: "image/png",
  jpg: "image/jpeg",
  jpeg: "image/jpeg",
  webp: "image/webp",
  gif: "image/gif",
  avif: "image/avif",
}

/** The file's type, or one guessed from its extension (some browsers leave `type` empty). */
export function contentTypeOf(file: { type: string; name: string }): string {
  if (file.type) return file.type
  const ext = file.name.split(".").pop()?.toLowerCase() ?? ""
  return EXT_TYPES[ext] ?? "application/octet-stream"
}

/** A short, URL-safe file name that keeps the extension ("Ep 12 – Final.MP3" → "ep-12-final.mp3"). */
export function safeFileName(name: string): string {
  const dot = name.lastIndexOf(".")
  const stem = dot > 0 ? name.slice(0, dot) : name
  const ext = dot > 0 ? name.slice(dot + 1).toLowerCase().replace(/[^a-z0-9]/g, "") : ""
  const clean =
    stem
      .normalize("NFKD")
      .replace(/[̀-ͯ]/g, "")
      .toLowerCase()
      .replace(/[^a-z0-9]+/g, "-")
      .replace(/^-+|-+$/g, "")
      .slice(0, 80) || "file"
  return ext ? `${clean}.${ext}` : clean
}

/** How long to wait before asking about a transcription again: 3 s, then 6 s after the first minute. */
export const pollDelay = (elapsedMs: number) => (elapsedMs < 60_000 ? 3_000 : 6_000)
