import { Injectable } from "@nestjs/common"
import { NotificationsScheduler } from "./scheduler"

/** What other features tell the notifications: something to send soon (a debounced tick). */
@Injectable()
export class NotificationEvents {
  constructor(private readonly scheduler: NotificationsScheduler) {}

  /** An episode was published now: mark it live (its followers' push follows after the debounce). */
  episodePublished(): void {
    this.scheduler.kick()
  }

  /** A campaign was queued to go out now. */
  campaignQueued(): void {
    this.scheduler.kick()
  }
}
