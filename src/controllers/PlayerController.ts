import { AudioPlayerService } from "@/services/AudioPlayerService"
import { usePlayerStore } from "@/stores/usePlayerStore"

const store = usePlayerStore.getState

/** The level editor's preview player: what it shows, and what a click on a line does. */
export class PlayerController {
  static load(key: string | undefined): void {
    if (store().key !== key) store().setKey(key)
  }

  static time(seconds: number): void {
    if (Math.abs(store().time - seconds) >= 0.04) store().setTime(seconds)
  }

  static playing(playing: boolean): void {
    store().setPlaying(playing)
  }

  static setFollow(follow: boolean): void {
    store().setFollow(follow)
  }

  static setRate(rate: number): void {
    store().setRate(rate)
    AudioPlayerService.setRate(rate)
  }

  /** A click on a line's time: play from there. */
  static playFrom(seconds: number): void {
    AudioPlayerService.playFrom(seconds)
    store().setTime(seconds)
  }

  static toggle(): void {
    AudioPlayerService.toggle()
  }

  static seekBy(delta: number): void {
    AudioPlayerService.seekBy(delta)
    store().setTime(AudioPlayerService.currentTime())
  }

  /** Where the playhead is (set a line's start or end to it). */
  static now(): number {
    return AudioPlayerService.currentTime()
  }
}
