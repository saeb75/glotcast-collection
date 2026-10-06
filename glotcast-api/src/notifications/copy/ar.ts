import { type Copy, type Field, type Variant } from "./en"

// Arabic counts: zero, one, two, few (3–10), many (11–99), other (100+). A counted noun takes a different form in
// each, and "two" and "one" are said without the digit. Each list is [zero, one, two, few, many, other].
type Forms = readonly [string, string, string, string, string, string]
const CATEGORIES = ["zero", "one", "two", "few", "many", "other"] as const

/** A field in every plural form: `make` puts the counted noun phrase into the sentence. */
const counted = (field: Field, forms: Forms, make: (noun: string) => string): Variant =>
  Object.fromEntries(CATEGORIES.map((category, i) => [`${field}_${category}`, make(forms[i]!)]))

// Subject (nominative) and after a preposition or "منذ" (genitive).
const DAYS: Forms = [
  "{{count}} يوم",
  "يوم واحد",
  "يومان",
  "{{count}} أيام",
  "{{count}} يومًا",
  "{{count}} يوم",
]
const DAYS_GEN: Forms = [
  "{{count}} يوم",
  "يوم واحد",
  "يومين",
  "{{count}} أيام",
  "{{count}} يومًا",
  "{{count}} يوم",
]
const MINUTES: Forms = [
  "{{count}} دقيقة",
  "دقيقة واحدة",
  "دقيقتان",
  "{{count}} دقائق",
  "{{count}} دقيقة",
  "{{count}} دقيقة",
]
const MINUTES_GEN: Forms = [
  "{{count}} دقيقة",
  "دقيقة واحدة",
  "دقيقتين",
  "{{count}} دقائق",
  "{{count}} دقيقة",
  "{{count}} دقيقة",
]
const WORDS: Forms = [
  "{{count}} كلمة",
  "كلمة واحدة",
  "كلمتان",
  "{{count}} كلمات",
  "{{count}} كلمة",
  "{{count}} كلمة",
]
const WORDS_ACC: Forms = [
  "{{count}} كلمة",
  "كلمة واحدة",
  "كلمتين",
  "{{count}} كلمات",
  "{{count}} كلمة",
  "{{count}} كلمة",
]
const NEW_EPISODES: Forms = [
  "{{count}} حلقة جديدة",
  "حلقة جديدة واحدة",
  "حلقتان جديدتان",
  "{{count}} حلقات جديدة",
  "{{count}} حلقة جديدة",
  "{{count}} حلقة جديدة",
]
const NEW_EPISODES_GEN: Forms = [
  "{{count}} حلقة جديدة",
  "حلقة جديدة واحدة",
  "حلقتين جديدتين",
  "{{count}} حلقات جديدة",
  "{{count}} حلقة جديدة",
  "{{count}} حلقة جديدة",
]

export const ar = {
  levels: { bg: "سهل", in: "متوسط", ad: "صعب" },
  messages: {
    generic: [
      {
        title: "حان وقت استراحة الإنجليزية ☕",
        body: "دقائق قليلة من الاستماع اليوم تجعل إنجليزيتك تتحسن باستمرار.",
      },
      {
        title: "إنجليزيتك اليومية بانتظارك",
        body: "اختر حلقة واستمع لبضع دقائق. الخطوات الصغيرة تصنع الفرق.",
      },
      { title: "مستعد لاستماع اليوم؟", body: "شغّل قصة بالإنجليزية ودع أذنيك تقومان بالعمل." },
      { title: "بضع دقائق فقط اليوم 🎧", body: "افتح GlotCast واستمع إلى شيء جديد. ستشكر نفسك لاحقًا." },
    ],
    streak: [
      {
        title: "حافظ على سلسلتك 🔥",
        ...counted("body", DAYS, (n) => `سلسلتك: ${n} من الاستماع على التوالي. أضف يومًا جديدًا اليوم!`),
      },
      {
        title: "لا تقطع السلسلة",
        ...counted("body", DAYS, (n) => `${n} على التوالي حتى الآن. بضع دقائق اليوم وتستمر السلسلة.`),
      },
      {
        title: "أداء رائع 🎧",
        ...counted("body", DAYS_GEN, (n) => `سلسلتك مستمرة منذ ${n}. واصلها اليوم بحلقة قصيرة.`),
      },
    ],
    continue: [
      {
        title: "تابع من حيث توقفت",
        ...counted("body", MINUTES, (n) => `تبقّى ${n} فقط من «{{title}}». هل تكملها اليوم؟`),
      },
      {
        title: "اقتربت من النهاية",
        ...counted("body", MINUTES_GEN, (n) => `لم يتبقَّ من «{{title}}» سوى ${n}. عُد إليها الآن.`),
      },
      {
        title: "حلقتك بانتظارك 🎧",
        ...counted("body", MINUTES, (n) => `تبقّى ${n} من «{{title}}». لننهِها معًا.`),
      },
    ],
    finish: [
      {
        title: "أكمل ما بدأته",
        ...counted("body", MINUTES, (n) => `كنت تستمتع بـ«{{title}}». تبقّى ${n} فقط.`),
      },
      {
        title: "ألا تريد معرفة النهاية؟",
        ...counted("body", MINUTES, (n) => `عُد إلى «{{title}}». تبقّى لك ${n}.`),
      },
      {
        title: "اقتربت 🎧",
        ...counted("body", MINUTES, (n) => `تبقّى ${n} من «{{title}}». مثالية لاستراحة قصيرة.`),
      },
    ],
    wordsDue: [
      {
        title: "كلماتك جاهزة للمراجعة",
        ...counted("body", WORDS, (n) => `بانتظارك ${n}. مراجعة سريعة تساعدك على تذكّرها.`),
      },
      {
        title: "مراجعة سريعة للكلمات؟ 🧠",
        ...counted("body", WORDS, (n) => `لديك ${n} للمراجعة. لن يستغرق ذلك سوى دقيقة.`),
      },
      {
        title: "لا تدع كلماتك تضيع",
        ...counted("body", WORDS_ACC, (n) => `راجع ${n} الآن واحفظها للأبد.`),
      },
    ],
    newEpisode: [
      { title: "جديد في مستواك 🎧", body: "صدرت حلقة «{{title}}» (المستوى: {{level}}). استمع إليها اليوم." },
      { title: "شيء جديد للاستماع", body: "جرّب «{{title}}» بمستوى {{level}}. صدرت للتو." },
      { title: "حلقة جديدة لك", body: "وصلت «{{title}}». نسختك بمستوى {{level}} جاهزة." },
    ],
    recap: [
      {
        title: "أسبوعك مع الإنجليزية 📊",
        ...counted("body", MINUTES_GEN, (n) => `استمعت هذا الأسبوع لمدة ${n}. ابدأ الأسبوع الجديد بقوة!`),
      },
      {
        title: "أسبوع رائع!",
        ...counted("body", MINUTES, (n) => `${n} من الإنجليزية هذا الأسبوع. حافظ على هذا الإيقاع.`),
      },
      {
        title: "ملخص أسبوعك",
        ...counted("body", MINUTES, (n) => `هذا الأسبوع: ${n} من الاستماع. ماذا ستسمع بعد ذلك؟`),
      },
    ],
    streakSaver: [
      {
        title: "سلسلتك تنتهي الليلة 🔥",
        ...counted("body", DAYS, (n) => `${n} على التوالي. أنقذ سلسلتك بدقيقة استماع واحدة فقط.`),
      },
      {
        title: "لا تخسر سلسلتك!",
        ...counted("body", DAYS_GEN, (n) => `استماع قصير يحافظ على سلسلتك المستمرة منذ ${n}.`),
      },
      {
        title: "ما زال هناك وقت",
        ...counted("body", DAYS_GEN, (n) => `استمع لدقيقة قبل منتصف الليل وأنقذ سلسلة ${n}.`),
      },
    ],
    newEpisodeFollowed: [
      { title: "جديد من {{podcast}}", body: "صدرت «{{title}}» الآن. استمع إليها بمستواك." },
      { title: "حلقة جديدة من {{podcast}} 🎧", body: "صدرت «{{title}}» للتو. كن من أوائل المستمعين." },
      { title: "طازج من {{podcast}}", body: "«{{title}}» بانتظارك، بثلاثة مستويات." },
    ],
    newEpisodesPodcast: [
      { title: "جديد من {{podcast}}", ...counted("body", NEW_EPISODES, (n) => `بانتظارك ${n}.`) },
      {
        title: "حلقات جديدة من {{podcast}} 🎧",
        ...counted("body", NEW_EPISODES, (n) => `وصلت للتو ${n}. بأيها ستبدأ؟`),
      },
      { title: "تابع {{podcast}}", ...counted("body", NEW_EPISODES, (n) => `صدرت ${n}. ابدأ الاستماع!`) },
    ],
    newEpisodesMixed: [
      {
        title: "حلقات جديدة لك 🎧",
        ...counted("body", NEW_EPISODES, (n) => `${n} من البودكاست التي تتابعها.`),
      },
      {
        title: "جديد في البودكاست التي تتابعها",
        ...counted("body", NEW_EPISODES, (n) => `وصلت للتو ${n}.`),
      },
      {
        title: "محتوى جديد للاستماع",
        ...counted("body", NEW_EPISODES_GEN, (n) => `استمع إلى ${n} من البودكاست التي تتابعها.`),
      },
    ],
  },
} satisfies Copy
