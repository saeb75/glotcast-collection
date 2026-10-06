/** Object keys as whisper-transcriber built them: `{folder}/{timestamp}-{slug}.{ext}`. */
export function objectKey(filename: string, folder: string, now = Date.now()): string {
  const dot = filename.lastIndexOf(".")
  const base = dot > 0 ? filename.slice(0, dot) : filename
  const ext = (dot > 0 ? filename.slice(dot + 1) : "bin").toLowerCase().replace(/[^a-z0-9]/g, "") || "bin"
  const slug =
    base
      .toLowerCase()
      .replace(/[^a-z0-9-]+/g, "-")
      .replace(/^-+|-+$/g, "")
      .slice(0, 60) || "file"
  return `${folder}/${now}-${slug}.${ext}`
}

/** The public URL of a key under the bucket's public base (custom domain or r2.dev). */
export const publicUrl = (base: string, key: string): string => `${base.replace(/\/+$/, "")}/${key}`
