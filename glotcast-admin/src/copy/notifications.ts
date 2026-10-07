import { type AudienceWords, type DeliveryWords, joinNames } from "@/domain/campaign"
import {
  type AudienceSegment,
  type CampaignStatus,
  type NotificationKind,
  type PushLinkType,
  type SendStatus,
} from "@/schemas/admin"
import { LEVEL_LABELS } from "./status"

/** Words shared by Campaigns, Automations and the Send log. */
export const NOTIFY = {
  banner: {
    notConfiguredTitle: "Push notifications aren't set up",
    notConfigured:
      "OneSignal's keys are missing from the API: set ONESIGNAL_APP_ID and ONESIGNAL_API_KEY in its environment and restart it. Until then nothing can be sent, test pushes included.",
    disabledTitle: "Push notifications are switched off",
    disabled:
      "The API runs with NOTIFICATIONS_ENABLED off: no automation runs and no campaign can be sent (test pushes still work). Set NOTIFICATIONS_ENABLED=true in its environment to start.",
    staleTitle: "The scheduler seems to have stopped",
    stale: (when: string) =>
      `Its last run was ${when}; it normally runs every 5 minutes. Check the API's logs (and that one instance holds the lease).`,
  },
  kinds: {
    reminder: "Daily reminder",
    streak_saver: "Streak saver",
    learning: "Learning nudge",
    new_episodes: "New episodes",
    campaign: "Campaign",
    test: "Test push",
  } satisfies Record<NotificationKind, string>,
  sendStatuses: {
    queued: "Queued",
    sending: "Sending",
    sent: "Sent",
    failed: "Failed",
    unreachable: "Unreachable",
    expired: "Expired",
    canceled: "Canceled",
    skipped: "Skipped",
  } satisfies Record<SendStatus, string>,
  sendStatusHints: {
    queued: "Waiting for its time",
    sending: "Being handed to OneSignal",
    sent: "Handed to OneSignal",
    failed: "OneSignal refused it",
    unreachable: "No push subscription on any device",
    expired: "Couldn't go out in time",
    canceled: "The campaign was canceled",
    skipped: "Not sent",
  } satisfies Record<SendStatus, string>,
  campaignStatuses: {
    draft: "Draft",
    scheduled: "Scheduled",
    sending: "Sending",
    sent: "Sent",
    canceled: "Canceled",
    failed: "Failed",
  } satisfies Record<CampaignStatus, string>,
  skipReasons: {
    daily_cap: "Already had today's daily push",
    cap: "Hit the two-a-day limit",
    quiet_hours: "In quiet hours",
    goal_met: "Today's goal already met",
    active_now: "Listening right now",
    nothing_to_send: "Nothing relevant to say",
    no_streak: "No streak to save",
    listened_today: "Already listened today",
    reminder_later: "Their own reminder comes later",
    time_passed: "Their local time had passed",
  } as Record<string, string>,
  variants: {
    generic: "Generic nudge",
    streak: "Streak",
    continue: "Continue an episode",
    finish: "Finish an episode",
    wordsDue: "Words due",
    newEpisode: "New episode at their level",
    recap: "Weekly recap",
    streakSaver: "Streak saver",
    newEpisodeFollowed: "New episode (followed podcast)",
    newEpisodesPodcast: "New episodes (followed podcast)",
    newEpisodesMixed: "New episodes (several podcasts)",
  } as Record<string, string>,
  linkTypes: {
    home: "Home",
    episode: "An episode",
    player: "The player",
    podcast: "A podcast",
    paywall: "The paywall",
    review: "Word review",
    words: "Words tab",
  } satisfies Record<PushLinkType, string>,
  linkHints: {
    home: "The app's home screen.",
    episode: "An episode's page.",
    player: "Plays an episode right away, at a level you choose or the user's own.",
    podcast: "A podcast's page.",
    paywall: "The Pro offer.",
    review: "A Leitner review session of the words due.",
    words: "The user's saved words.",
  } satisfies Record<PushLinkType, string>,
  segments: {
    all: "Everyone",
    pro: "Pro users",
    free: "Free users",
    guests: "Guests",
    signedIn: "Signed-in users",
  } satisfies Record<AudienceSegment, string>,
  segmentHints: {
    all: "Every user, guests included.",
    pro: "Pro by purchase or granted here.",
    free: "Everyone without Pro.",
    guests: "Anonymous sessions only.",
    signedIn: "Apple, Google or email accounts.",
  } satisfies Record<AudienceSegment, string>,
  guest: "Guest",
}

/** "streak.2" → "Streak · #3". */
export function variantLabel(variant: string | null): string | null {
  if (!variant) return null
  const [key = "", index] = variant.split(".")
  const name = NOTIFY.variants[key] ?? key
  return index !== undefined && /^\d+$/.test(index) ? `${name} · #${Number(index) + 1}` : name
}

export const skipReasonLabel = (reason: string | null) =>
  reason ? (NOTIFY.skipReasons[reason] ?? reason.replace(/_/g, " ")) : null

export const AUDIENCE_WORDS: AudienceWords = {
  segments: NOTIFY.segments,
  levelNames: LEVEL_LABELS,
  levels: (names) => joinNames(names, "or"),
  languages: (names) => `App in ${joinNames(names, "or")}`,
  inactive: (days) => `Not seen for ${days}+ ${days === 1 ? "day" : "days"}`,
  active: (days) => `Seen in the last ${days} ${days === 1 ? "day" : "days"}`,
  podcasts: (names) => `Following ${joinNames(names, "or", 2)}`,
  unknownPodcast: "a podcast",
  separator: " · ",
}

export const DELIVERY_WORDS: DeliveryWords = {
  none: "Not sent yet",
  now: "Right away",
  at: (when) => `At ${when}`,
  local: (day, time) => `${day} at ${time}, each user's local time`,
}
