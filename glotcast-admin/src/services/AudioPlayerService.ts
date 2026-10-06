/**
 * The level editor's <audio> element, reachable from anywhere (a transcript line seeks it). The component
 * that renders the element attaches it; nothing here knows the store.
 */
let element: HTMLAudioElement | null = null

export class AudioPlayerService {
  static attach(el: HTMLAudioElement | null): void {
    element = el
  }

  static get attached(): boolean {
    return element !== null
  }

  static currentTime(): number {
    return element?.currentTime ?? 0
  }

  /** Jumps to `seconds` and plays (a click on a line). */
  static playFrom(seconds: number): void {
    if (!element) return
    element.currentTime = Math.max(0, seconds)
    void element.play().catch(() => undefined)
  }

  static seekBy(delta: number): void {
    if (!element) return
    element.currentTime = Math.max(0, element.currentTime + delta)
  }

  static toggle(): void {
    if (!element) return
    if (element.paused) void element.play().catch(() => undefined)
    else element.pause()
  }

  static setRate(rate: number): void {
    if (element) element.playbackRate = rate
  }
}
