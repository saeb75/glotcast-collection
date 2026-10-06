import { type Copy } from "./en"

// "Ty", like the app; gender-neutral phrasing. Plural forms: one (1), few (2–4, 22–24…), many (0, 5–21, 25…),
// other (fractions). Minutes are "min" (no plural needed).
export const pl = {
  levels: { bg: "Łatwy", in: "Średni", ad: "Trudny" },
  messages: {
    generic: [
      {
        title: "Czas na przerwę z angielskim ☕",
        body: "Kilka minut słuchania dziś, a twój angielski dalej rośnie.",
      },
      {
        title: "Twój codzienny angielski czeka",
        body: "Wybierz odcinek i posłuchaj przez kilka minut. Małe kroki się sumują.",
      },
      {
        title: "Pora na dzisiejsze słuchanie",
        body: "Włącz historię po angielsku i pozwól uszom zrobić swoje.",
      },
      {
        title: "Tylko kilka minut dziś 🎧",
        body: "Otwórz GlotCast i posłuchaj czegoś nowego. Twoje przyszłe ja ci podziękuje.",
      },
    ],
    streak: [
      {
        title: "Podtrzymaj swoją serię 🔥",
        body_one: "Słuchasz już {{count}} dzień z rzędu. Dodaj dziś kolejny!",
        body_few: "Słuchasz już {{count}} dni z rzędu. Dodaj dziś kolejny!",
        body_many: "Słuchasz już {{count}} dni z rzędu. Dodaj dziś kolejny!",
        body_other: "Słuchasz już {{count}} dnia z rzędu. Dodaj dziś kolejny!",
      },
      {
        title: "Nie przerywaj łańcucha",
        body_one: "Już {{count}} dzień z rzędu. Kilka minut dziś i seria trwa dalej.",
        body_few: "Już {{count}} dni z rzędu. Kilka minut dziś i seria trwa dalej.",
        body_many: "Już {{count}} dni z rzędu. Kilka minut dziś i seria trwa dalej.",
        body_other: "Już {{count}} dnia z rzędu. Kilka minut dziś i seria trwa dalej.",
      },
      {
        title: "Świetnie ci idzie 🎧",
        body_one: "Twoja seria: {{count}} dzień z rzędu. Podtrzymaj ją dziś krótkim odcinkiem.",
        body_few: "Twoja seria: {{count}} dni z rzędu. Podtrzymaj ją dziś krótkim odcinkiem.",
        body_many: "Twoja seria: {{count}} dni z rzędu. Podtrzymaj ją dziś krótkim odcinkiem.",
        body_other: "Twoja seria: {{count}} dnia z rzędu. Podtrzymaj ją dziś krótkim odcinkiem.",
      },
    ],
    continue: [
      {
        title: "Wróć do swojego odcinka",
        body: "Do końca „{{title}}” zostało tylko {{count}} min. Dokończysz dziś?",
      },
      { title: "Już prawie koniec", body: "W „{{title}}” zostało tylko {{count}} min. Wracaj!" },
      {
        title: "Twój odcinek czeka 🎧",
        body: "Zostało {{count}} min odcinka „{{title}}”. Dokończmy go razem.",
      },
    ],
    finish: [
      {
        title: "Dokończ rozpoczęty odcinek",
        body: "Słuchanie „{{title}}” szło ci świetnie. Zostało tylko {{count}} min.",
      },
      { title: "Ciekawi cię zakończenie?", body: "Wróć do „{{title}}”. Zostało {{count}} min." },
      {
        title: "Prawie u celu 🎧",
        body: "Zostało {{count}} min odcinka „{{title}}”. Idealne na krótką przerwę.",
      },
    ],
    wordsDue: [
      {
        title: "Twoje słowa czekają na powtórkę",
        body: "Słowa do powtórki: {{count}}. Szybka powtórka pomoże je zapamiętać.",
      },
      {
        title: "Szybka powtórka słówek? 🧠",
        body_one: "{{count}} słowo do powtórki. To zajmie mniej niż minutę.",
        body_few: "{{count}} słowa do powtórki. To zajmie około minuty.",
        body_many: "{{count}} słów do powtórki. To zajmie około minuty.",
        body_other: "{{count}} słowa do powtórki. To zajmie około minuty.",
      },
      {
        title: "Nie pozwól słowom uciec",
        body_one: "Powtórz teraz {{count}} słowo i zapamiętaj je na dobre.",
        body_few: "Powtórz teraz {{count}} słowa i zapamiętaj je na dobre.",
        body_many: "Powtórz teraz {{count}} słów i zapamiętaj je na dobre.",
        body_other: "Powtórz teraz {{count}} słowa i zapamiętaj je na dobre.",
      },
    ],
    newEpisode: [
      {
        title: "Nowość na twoim poziomie 🎧",
        body: "Właśnie wyszedł odcinek „{{title}}” (poziom: {{level}}). Posłuchaj dziś.",
      },
      {
        title: "Coś nowego do posłuchania",
        body: "Spróbuj „{{title}}” (poziom: {{level}}). Właśnie się ukazał.",
      },
      { title: "Świeży odcinek dla ciebie", body: "„{{title}}” już jest. Twoja wersja ({{level}}) czeka." },
    ],
    recap: [
      {
        title: "Twój tydzień z angielskim 📊",
        body: "W tym tygodniu: {{count}} min słuchania. Zacznij nowy tydzień z przytupem!",
      },
      { title: "Świetny tydzień!", body: "{{count}} min angielskiego w tym tygodniu. Trzymaj tempo." },
      {
        title: "Twoje podsumowanie tygodnia",
        body: "Ten tydzień to {{count}} min słuchania. Czego posłuchasz teraz?",
      },
    ],
    streakSaver: [
      {
        title: "Twoja seria kończy się dziś 🔥",
        body_one: "{{count}} dzień z rzędu. Uratuj serię minutą słuchania.",
        body_few: "{{count}} dni z rzędu. Uratuj serię minutą słuchania.",
        body_many: "{{count}} dni z rzędu. Uratuj serię minutą słuchania.",
        body_other: "{{count}} dnia z rzędu. Uratuj serię minutą słuchania.",
      },
      {
        title: "Nie strać swojej serii!",
        body_one: "Krótkie słuchanie wystarczy. Masz już {{count}} dzień z rzędu.",
        body_few: "Krótkie słuchanie wystarczy. Masz już {{count}} dni z rzędu.",
        body_many: "Krótkie słuchanie wystarczy. Masz już {{count}} dni z rzędu.",
        body_other: "Krótkie słuchanie wystarczy. Masz już {{count}} dnia z rzędu.",
      },
      {
        title: "Jeszcze zdążysz",
        body_one: "Posłuchaj minutę przed północą i uratuj serię: {{count}} dzień z rzędu.",
        body_few: "Posłuchaj minutę przed północą i uratuj serię: {{count}} dni z rzędu.",
        body_many: "Posłuchaj minutę przed północą i uratuj serię: {{count}} dni z rzędu.",
        body_other: "Posłuchaj minutę przed północą i uratuj serię: {{count}} dnia z rzędu.",
      },
    ],
    newEpisodeFollowed: [
      { title: "Nowość: {{podcast}}", body: "„{{title}}” już jest. Posłuchaj na swoim poziomie." },
      {
        title: "Nowy odcinek: {{podcast}} 🎧",
        body: "„{{title}}” właśnie się ukazał. Posłuchaj jako jedna z pierwszych osób.",
      },
      { title: "Prosto z {{podcast}}", body: "„{{title}}” czeka na ciebie w trzech poziomach." },
    ],
    newEpisodesPodcast: [
      {
        title: "Nowości: {{podcast}}",
        body_one: "Czeka na ciebie {{count}} nowy odcinek.",
        body_few: "Czekają na ciebie {{count}} nowe odcinki.",
        body_many: "Czeka na ciebie {{count}} nowych odcinków.",
        body_other: "Czeka na ciebie {{count}} nowego odcinka.",
      },
      {
        title: "{{podcast}}: nowe odcinki 🎧",
        body_one: "Właśnie wyszedł {{count}} nowy odcinek. Posłuchaj!",
        body_few: "Właśnie wyszły {{count}} nowe odcinki. Od którego zaczniesz?",
        body_many: "Właśnie wyszło {{count}} nowych odcinków. Od którego zaczniesz?",
        body_other: "Właśnie wyszło {{count}} nowego odcinka. Od którego zaczniesz?",
      },
      {
        title: "Nadrób {{podcast}}",
        body_one: "Jest {{count}} nowy odcinek. Włączaj!",
        body_few: "Są {{count}} nowe odcinki. Włączaj!",
        body_many: "Jest {{count}} nowych odcinków. Włączaj!",
        body_other: "Jest {{count}} nowego odcinka. Włączaj!",
      },
    ],
    newEpisodesMixed: [
      {
        title: "Nowe odcinki dla ciebie 🎧",
        body_one: "{{count}} nowy odcinek z obserwowanych podcastów.",
        body_few: "{{count}} nowe odcinki z obserwowanych podcastów.",
        body_many: "{{count}} nowych odcinków z obserwowanych podcastów.",
        body_other: "{{count}} nowego odcinka z obserwowanych podcastów.",
      },
      {
        title: "Nowości w twoich podcastach",
        body_one: "Właśnie wyszedł {{count}} nowy odcinek w twoich podcastach.",
        body_few: "Właśnie wyszły {{count}} nowe odcinki w twoich podcastach.",
        body_many: "Właśnie wyszło {{count}} nowych odcinków w twoich podcastach.",
        body_other: "Właśnie wyszło {{count}} nowego odcinka w twoich podcastach.",
      },
      {
        title: "Jest czego posłuchać",
        body_one: "Nadrób {{count}} nowy odcinek swoich podcastów.",
        body_few: "Nadrób {{count}} nowe odcinki swoich podcastów.",
        body_many: "Nadrób {{count}} nowych odcinków swoich podcastów.",
        body_other: "Nadrób {{count}} nowego odcinka swoich podcastów.",
      },
    ],
  },
} satisfies Copy
