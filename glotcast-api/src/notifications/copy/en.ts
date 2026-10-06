/**
 * Push copy, English — and the shape every language follows (`satisfies Copy`).
 *
 * A message has variants (the same number in every language: a user moves one variant a day). A variant has a
 * `title` and a `body`, each either one string or plural forms keyed by Intl.PluralRules categories
 * (`body_one`, `body_few`, `body_other`…), chosen by the `count` param. Placeholders: `{{count}}`, `{{title}}`
 * (an episode title), `{{podcast}}`, `{{level}}` (rendered as the language's level name). Titles ≤ 50 characters,
 * bodies ≤ 150 (copy.spec.ts checks every language). Warm, short, one emoji at most.
 */
import { type Level } from "../../database/schema/app"

export const MESSAGE_KEYS = [
  "generic",
  "streak",
  "continue",
  "finish",
  "wordsDue",
  "newEpisode",
  "recap",
  "streakSaver",
  "newEpisodeFollowed",
  "newEpisodesPodcast",
  "newEpisodesMixed",
] as const
export type MessageKey = (typeof MESSAGE_KEYS)[number]

export type PluralCategory = "zero" | "one" | "two" | "few" | "many" | "other"
export type Field = "title" | "body"
export type Variant = { [K in Field | `${Field}_${PluralCategory}`]?: string }
export type Params = { count?: number; title?: string; podcast?: string; level?: Level }

export type Copy = {
  /** The level names the app shows (its levels.json `short`). */
  levels: Record<Level, string>
  messages: Record<MessageKey, readonly Variant[]>
}

export const en = {
  levels: { bg: "Easy", in: "Medium", ad: "Hard" },
  messages: {
    generic: [
      {
        title: "Time for your English break ☕",
        body: "A few minutes of listening today keeps your English growing.",
      },
      {
        title: "Your daily English is waiting",
        body: "Pick an episode and listen for a few minutes. Small steps add up.",
      },
      {
        title: "Ready for today's listening?",
        body: "Put on a story in English and let your ears do the work.",
      },
      {
        title: "Just a few minutes today 🎧",
        body: "Open GlotCast and listen to something new. Your future self will thank you.",
      },
    ],
    streak: [
      {
        title: "Keep your streak alive 🔥",
        body_one: "You've listened {{count}} day in a row. Make it one more today!",
        body_other: "You've listened {{count}} days in a row. Make it one more today!",
      },
      {
        title: "Don't break the chain",
        body_one: "{{count}} day in a row so far. A few minutes today keeps it going.",
        body_other: "{{count}} days in a row so far. A few minutes today keeps it going.",
      },
      {
        title: "You're on a roll 🎧",
        body: "Your {{count}}-day streak is going strong. Keep it up with a short episode today.",
      },
    ],
    continue: [
      {
        title: "Pick up where you left off",
        body: "Just {{count}} min left in “{{title}}”. Finish it today?",
      },
      { title: "So close to the end", body: "“{{title}}” has only {{count}} min to go. Jump back in." },
      {
        title: "Your episode is waiting 🎧",
        body: "{{count}} min left in “{{title}}”. Let's finish it together.",
      },
    ],
    finish: [
      { title: "Finish what you started", body: "You were enjoying “{{title}}”. Only {{count}} min to go." },
      { title: "Still curious how it ends?", body: "Come back to “{{title}}”. You have {{count}} min left." },
      { title: "Almost there 🎧", body: "{{count}} min left in “{{title}}”. A perfect short break." },
    ],
    wordsDue: [
      {
        title: "Your words are ready for review",
        body_one: "{{count}} word is waiting. A quick review helps it stick.",
        body_other: "{{count}} words are waiting. A quick review helps them stick.",
      },
      {
        title: "Quick word review? 🧠",
        body_one: "{{count}} word to review. It takes less than a minute.",
        body_other: "{{count}} words to review. It takes about a minute.",
      },
      {
        title: "Don't let your words slip away",
        body_one: "Review {{count}} word now and keep it for good.",
        body_other: "Review {{count}} words now and keep them for good.",
      },
    ],
    newEpisode: [
      { title: "New at your level 🎧", body: "“{{title}}” is out now ({{level}}). Give it a listen today." },
      {
        title: "Something new to listen to",
        body: "Try “{{title}}” in the {{level}} version. It just came out.",
      },
      { title: "Fresh episode for you", body: "“{{title}}” just arrived. Your {{level}} version is ready." },
    ],
    recap: [
      {
        title: "Your week in English 📊",
        body: "You listened for {{count}} min this week. Start the new week strong!",
      },
      { title: "Nice week!", body: "{{count}} min of English this week. Keep the rhythm going." },
      { title: "Your weekly recap", body: "This week: {{count}} min of listening. What will you hear next?" },
    ],
    streakSaver: [
      {
        title: "Your streak ends tonight 🔥",
        body_one: "{{count}} day in a row. Save it with just one minute of listening.",
        body_other: "{{count}} days in a row. Save it with just one minute of listening.",
      },
      { title: "Don't lose your streak!", body: "One short listen keeps your {{count}}-day streak alive." },
      {
        title: "Still time to keep it going",
        body: "Listen for a minute before midnight to save your {{count}}-day streak.",
      },
    ],
    newEpisodeFollowed: [
      { title: "New from {{podcast}}", body: "“{{title}}” is out now. Listen at your level." },
      {
        title: "{{podcast}} has a new episode 🎧",
        body: "“{{title}}” just dropped. Be one of the first to listen.",
      },
      { title: "Fresh from {{podcast}}", body: "“{{title}}” is ready for you, in three levels." },
    ],
    newEpisodesPodcast: [
      {
        title: "New from {{podcast}}",
        body_one: "{{count}} new episode is waiting for you.",
        body_other: "{{count}} new episodes are waiting for you.",
      },
      {
        title: "{{podcast}} has new episodes 🎧",
        body_one: "{{count}} new episode just arrived. Have a listen!",
        body_other: "{{count}} new episodes just arrived. Which one first?",
      },
      {
        title: "Catch up with {{podcast}}",
        body_one: "{{count}} new episode is out. Dive in!",
        body_other: "{{count}} new episodes are out. Dive in!",
      },
    ],
    newEpisodesMixed: [
      {
        title: "New episodes for you 🎧",
        body_one: "{{count}} new episode from a show you follow.",
        body_other: "{{count}} new episodes from shows you follow.",
      },
      {
        title: "Your shows have something new",
        body_one: "{{count}} new episode just arrived from your podcasts.",
        body_other: "{{count}} new episodes just arrived from your podcasts.",
      },
      {
        title: "Fresh listening is here",
        body_one: "Catch up on {{count}} new episode from your shows.",
        body_other: "Catch up on {{count}} new episodes from your shows.",
      },
    ],
  },
} satisfies Copy
