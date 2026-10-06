/** An audio URL's length, read by the browser (metadata only); null when it can't be loaded. */
export class AudioProbeService {
  static duration(url: string, timeoutMs = 20_000): Promise<number | null> {
    return new Promise((resolve) => {
      const audio = new Audio()
      audio.preload = "metadata"
      const done = (value: number | null) => {
        window.clearTimeout(timer)
        audio.removeAttribute("src")
        audio.load()
        resolve(value)
      }
      const timer = window.setTimeout(() => done(null), timeoutMs)
      audio.onloadedmetadata = () => done(Number.isFinite(audio.duration) ? audio.duration : null)
      audio.onerror = () => done(null)
      audio.src = url
    })
  }
}
