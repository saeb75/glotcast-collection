import { type ImageCompression } from "@/services/ImageCompressionService"

export const MEDIA = {
  upload: "Upload",
  generate: "Generate",
  paste: "Paste URL",
  urlPlaceholder: "https://…",
  apply: "Apply",
  remove: "Remove",
  none: "No image",
  compression: "Compression",
  presets: {
    none: "Original",
    low: "Light (1920 px)",
    medium: "Medium (1280 px)",
    high: "Strong (800 px)",
  } satisfies Record<ImageCompression, string>,
  uploading: (pct: number) => `Uploading… ${pct}%`,
  compressing: "Compressing…",
  uploaded: "Image uploaded",
  notImage: "That isn't an image file.",
  failed: "Upload failed",
  corsHint:
    "If uploads fail with a network error, the R2 bucket's CORS must allow PUT from this panel's origin.",
  previewFailed: "The image couldn't be loaded",
}
