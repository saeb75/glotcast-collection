/**
 * In-browser MP3 compression (ported from whisper-transcriber/lib/compressAudio.ts): decode with Web Audio,
 * downmix to mono, resample, encode with lamejs. Spoken word stays clear at 64 kbps / 22 kHz.
 */

export type AudioCompression = "none" | "low" | "medium" | "high"

export const AUDIO_PRESETS: Record<
  Exclude<AudioCompression, "none">,
  { bitrate: number; sampleRate: number }
> = {
  low: { bitrate: 128, sampleRate: 44100 },
  medium: { bitrate: 64, sampleRate: 22050 },
  high: { bitrate: 32, sampleRate: 16000 },
}

function downmixToMono(buffer: AudioBuffer): Float32Array {
  if (buffer.numberOfChannels === 1) return buffer.getChannelData(0)
  const left = buffer.getChannelData(0)
  const right = buffer.getChannelData(1)
  const out = new Float32Array(left.length)
  for (let i = 0; i < left.length; i++) out[i] = (left[i]! + right[i]!) * 0.5
  return out
}

function linearResample(input: Float32Array, fromRate: number, toRate: number): Float32Array {
  const ratio = fromRate / toRate
  const length = Math.floor(input.length / ratio)
  const out = new Float32Array(length)
  for (let i = 0; i < length; i++) {
    const idx = i * ratio
    const i0 = Math.floor(idx)
    const i1 = Math.min(i0 + 1, input.length - 1)
    const frac = idx - i0
    out[i] = input[i0]! * (1 - frac) + input[i1]! * frac
  }
  return out
}

function floatToInt16(input: Float32Array): Int16Array {
  const out = new Int16Array(input.length)
  for (let i = 0; i < input.length; i++) {
    const s = Math.max(-1, Math.min(1, input[i]!))
    out[i] = s < 0 ? s * 0x8000 : s * 0x7fff
  }
  return out
}

/** Lets the page breathe between encoder blocks so the progress bar moves. */
const yieldToBrowser = () => new Promise<void>((resolve) => setTimeout(resolve, 0))

export class AudioCompressionService {
  /** The file as a mono MP3 at the preset's bitrate; `onProgress` gets 0…1 while encoding. */
  static async compress(
    file: File,
    level: Exclude<AudioCompression, "none">,
    onProgress?: (fraction: number) => void,
  ): Promise<File> {
    const { bitrate, sampleRate } = AUDIO_PRESETS[level]
    const { Mp3Encoder } = await import("@breezystack/lamejs")

    const data = await file.arrayBuffer()
    const Ctx =
      window.AudioContext ||
      (window as unknown as { webkitAudioContext: typeof AudioContext }).webkitAudioContext
    const ctx = new Ctx()
    let decoded: AudioBuffer
    try {
      decoded = await ctx.decodeAudioData(data.slice(0))
    } finally {
      await ctx.close()
    }

    const mono = downmixToMono(decoded)
    const resampled =
      decoded.sampleRate === sampleRate ? mono : linearResample(mono, decoded.sampleRate, sampleRate)
    const pcm = floatToInt16(resampled)

    const encoder = new Mp3Encoder(1, sampleRate, bitrate)
    const parts: BlobPart[] = []
    const block = 1152
    const blocksPerTick = 400
    for (let i = 0, n = 0; i < pcm.length; i += block, n++) {
      const buf = encoder.encodeBuffer(pcm.subarray(i, i + block))
      if (buf.length > 0) parts.push(new Uint8Array(buf))
      if (n % blocksPerTick === 0) {
        onProgress?.(i / pcm.length)
        await yieldToBrowser()
      }
    }
    const tail = encoder.flush()
    if (tail.length > 0) parts.push(new Uint8Array(tail))
    onProgress?.(1)

    const stem = file.name.replace(/\.[^.]+$/, "")
    return new File(parts, `${stem}.mp3`, { type: "audio/mpeg" })
  }
}
