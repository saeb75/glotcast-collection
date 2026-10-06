/**
 * In-browser image compression (ported from whisper-transcriber/lib/compressImage.ts): fit within a maximum
 * dimension on a canvas, re-encode as JPEG.
 */

export type ImageCompression = "none" | "low" | "medium" | "high"

export const IMAGE_PRESETS: Record<Exclude<ImageCompression, "none">, { maxDimension: number; quality: number }> = {
  low: { maxDimension: 1920, quality: 0.9 },
  medium: { maxDimension: 1280, quality: 0.75 },
  high: { maxDimension: 800, quality: 0.6 },
}

async function loadBitmap(file: File): Promise<ImageBitmap | HTMLImageElement> {
  if (typeof createImageBitmap === "function") return createImageBitmap(file)
  return new Promise<HTMLImageElement>((resolve, reject) => {
    const img = new Image()
    const url = URL.createObjectURL(file)
    img.onload = () => {
      URL.revokeObjectURL(url)
      resolve(img)
    }
    img.onerror = (e) => {
      URL.revokeObjectURL(url)
      reject(e)
    }
    img.src = url
  })
}

function fitWithin(w: number, h: number, max: number) {
  if (w <= max && h <= max) return { width: w, height: h }
  const ratio = w > h ? max / w : max / h
  return { width: Math.round(w * ratio), height: Math.round(h * ratio) }
}

export class ImageCompressionService {
  static async compress(file: File, level: Exclude<ImageCompression, "none">): Promise<File> {
    const { maxDimension, quality } = IMAGE_PRESETS[level]
    const bitmap = await loadBitmap(file)
    const { width, height } = fitWithin(bitmap.width, bitmap.height, maxDimension)

    const canvas = document.createElement("canvas")
    canvas.width = width
    canvas.height = height
    const ctx = canvas.getContext("2d")
    if (!ctx) throw new Error("Canvas 2D context not available")
    ctx.drawImage(bitmap, 0, 0, width, height)
    if ("close" in bitmap && typeof bitmap.close === "function") bitmap.close()

    const blob = await new Promise<Blob | null>((resolve) => canvas.toBlob(resolve, "image/jpeg", quality))
    if (!blob) throw new Error("Image encoding failed")
    const stem = file.name.replace(/\.[^.]+$/, "")
    return new File([blob], `${stem}.jpg`, { type: "image/jpeg" })
  }
}
