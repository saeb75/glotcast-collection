export const AUTOMATIONS = {
  title: "Automations",
  subtitle:
    "The pushes GlotCast sends on its own, in each user's language and time zone. Every one starts off.",
  save: "Save automations",
  saved: "Automations saved",
  discard: "Discard",
  unsaved: "Unsaved changes to the automations.",
  fixErrors: "Some settings need attention.",
  on: "On",
  off: "Off",

  status: {
    title: "Scheduler",
    hint: "Plans and sends the pushes every 5 minutes.",
    onesignal: "OneSignal",
    configured: "Configured",
    notConfigured: "Keys missing",
    sending: "Sending",
    enabled: "Enabled",
    disabled: "Off (NOTIFICATIONS_ENABLED)",
    lastTick: "Last run",
    never: "Never",
    queued: "Waiting to go out",
    queuedHint: "Pushes due, campaigns included",
    keysHint: "ONESIGNAL_APP_ID · ONESIGNAL_API_KEY",
    campaignsWeek: (campaigns: string, tests: string) =>
      `7 days: ${campaigns} campaign pushes, ${tests} tests`,
  },

  week: {
    sent: "Sent · 7 days",
    opened: "Opened",
    rate: (rate: string) => `${rate} opened`,
  },

  caps: "Limits per user and local day: one daily push (reminder, learning nudge or streak saver) and two pushes in total. Campaigns aren't held back by them but count toward them; test pushes don't count.",

  quiet: {
    title: "Quiet hours",
    hint: "No automated push in this window, in each user's own time. Their own reminder time is always allowed; campaigns that respect quiet hours wait until it ends.",
    from: "From",
    to: "To",
    none: "Same start and end: no quiet hours.",
  },

  reminder: {
    title: "Daily reminder",
    who: "Users who turned reminders on, at the reminder time they chose.",
    what: "Skipped when today's goal is met (then a words-due push, if enough words are due) or they are listening right now. Otherwise the most relevant of: the weekly recap (Sundays), their streak (3+ days), continue an episode, words due, a new episode at their level, a general nudge.",
    weeklyRecap: "Weekly recap on Sundays",
    weeklyRecapHint: "A summary of their week instead of the usual reminder.",
    minDue: "Words due",
    minDueHint: "At least this many before a words-due push.",
  },

  streakSaver: {
    title: "Streak saver",
    who: "Users with reminders on and a streak, who haven't listened today.",
    what: "Sent at a fixed evening time — not when they already got a reminder or learning push today, nor when their own reminder is still to come that evening.",
    time: "Time",
    timeHint: "Each user's local time.",
    minStreak: "Minimum streak",
    minStreakHint: "Days in a row.",
  },

  learning: {
    title: "Learning nudge",
    who: "Users without a daily reminder (or with reminders off) who allow learning pushes.",
    what: "At a fixed time: the weekly recap on Sundays, words due, or finishing an episode they started. Nothing when none of these applies.",
    time: "Time",
    timeHint: "Each user's local time.",
  },

  newEpisodes: {
    title: "New episodes",
    who: "Followers of a podcast who allow new-episode pushes and haven't started the episode.",
    what: "Once an episode is live with “Notify followers” on: one push (several new episodes are bundled), at most one a day.",
    debounce: "Wait after going live",
    debounceHint: "Minutes — bundles episodes released together.",
    fresh: "Pushable for",
    freshHint: "Hours after going live.",
  },

  units: { minutes: "min", hours: "h", days: "days", words: "words" },

  errors: {
    time: "A time as HH:mm.",
    number: (min: number, max: number) => `A whole number from ${min} to ${max}.`,
    quiet: "This time is inside the quiet hours — move it or change the quiet hours.",
  },
}
