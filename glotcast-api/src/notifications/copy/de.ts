import { type Copy } from "./en"

export const de = {
  levels: { bg: "Leicht", in: "Mittel", ad: "Schwer" },
  messages: {
    generic: [
      {
        title: "Zeit für deine Englischpause ☕",
        body: "Ein paar Minuten Zuhören heute, und dein Englisch wächst weiter.",
      },
      {
        title: "Dein tägliches Englisch wartet",
        body: "Such dir eine Folge aus und hör ein paar Minuten zu. Kleine Schritte zählen.",
      },
      {
        title: "Bereit fürs Zuhören heute?",
        body: "Leg eine Geschichte auf Englisch auf und lass deine Ohren die Arbeit machen.",
      },
      {
        title: "Nur ein paar Minuten heute 🎧",
        body: "Öffne GlotCast und hör etwas Neues. Dein zukünftiges Ich wird es dir danken.",
      },
    ],
    streak: [
      {
        title: "Halte deine Serie am Leben 🔥",
        body_one: "Du hörst seit {{count}} Tag am Stück zu. Heute kommt der nächste dazu!",
        body_other: "Du hörst seit {{count}} Tagen am Stück zu. Heute kommt der nächste dazu!",
      },
      {
        title: "Lass die Kette nicht reißen",
        body_one: "Schon {{count}} Tag in Folge. Ein paar Minuten heute, und es geht weiter.",
        body_other: "Schon {{count}} Tage in Folge. Ein paar Minuten heute, und es geht weiter.",
      },
      {
        title: "Du bist richtig gut dabei 🎧",
        body_one: "Deine Serie läuft seit {{count}} Tag. Halte sie heute mit einer kurzen Folge am Laufen.",
        body_other:
          "Deine Serie läuft seit {{count}} Tagen. Halte sie heute mit einer kurzen Folge am Laufen.",
      },
    ],
    continue: [
      {
        title: "Mach weiter, wo du aufgehört hast",
        body: "Nur noch {{count}} Min. bei „{{title}}“. Heute zu Ende hören?",
      },
      { title: "Fast geschafft", body: "Bei „{{title}}“ fehlen nur noch {{count}} Min. Steig wieder ein." },
      {
        title: "Deine Folge wartet 🎧",
        body: "Noch {{count}} Min. bei „{{title}}“. Hören wir sie zusammen zu Ende.",
      },
    ],
    finish: [
      {
        title: "Bring zu Ende, was du angefangen hast",
        body: "„{{title}}“ hat dir gefallen. Nur noch {{count}} Min. bis zum Schluss.",
      },
      {
        title: "Neugierig, wie es ausgeht?",
        body: "Komm zurück zu „{{title}}“. Es fehlen nur noch {{count}} Min.",
      },
      {
        title: "Fast am Ziel 🎧",
        body: "Noch {{count}} Min. bei „{{title}}“. Perfekt für eine kurze Pause.",
      },
    ],
    wordsDue: [
      {
        title: "Deine Wörter sind bereit zum Wiederholen",
        body_one: "{{count}} Wort wartet auf dich. Kurz wiederholen, dann bleibt es hängen.",
        body_other: "{{count}} Wörter warten auf dich. Kurz wiederholen, dann bleiben sie hängen.",
      },
      {
        title: "Kurze Wortwiederholung? 🧠",
        body_one: "{{count}} Wort zum Wiederholen. Dauert keine Minute.",
        body_other: "{{count}} Wörter zum Wiederholen. Dauert etwa eine Minute.",
      },
      {
        title: "Lass deine Wörter nicht entwischen",
        body_one: "Wiederhole jetzt {{count}} Wort und behalte es für immer.",
        body_other: "Wiederhole jetzt {{count}} Wörter und behalte sie für immer.",
      },
    ],
    newEpisode: [
      {
        title: "Neu auf deinem Level 🎧",
        body: "„{{title}}“ ist gerade erschienen ({{level}}). Hör heute mal rein.",
      },
      {
        title: "Etwas Neues zum Hören",
        body: "Probier „{{title}}“ in der Version {{level}}. Gerade erst erschienen.",
      },
      { title: "Frische Folge für dich", body: "„{{title}}“ ist da. Deine Version {{level}} ist bereit." },
    ],
    recap: [
      {
        title: "Deine Englisch-Woche 📊",
        body: "Du hast diese Woche {{count}} Min. zugehört. Starte stark in die neue Woche!",
      },
      { title: "Starke Woche!", body: "{{count}} Min. Englisch diese Woche. Bleib im Rhythmus." },
      {
        title: "Dein Wochenrückblick",
        body: "Diese Woche: {{count}} Min. Zuhören. Was hörst du als Nächstes?",
      },
    ],
    streakSaver: [
      {
        title: "Deine Serie endet heute Nacht 🔥",
        body_one: "{{count}} Tag in Folge. Rette deine Serie mit nur einer Minute Zuhören.",
        body_other: "{{count}} Tage in Folge. Rette deine Serie mit nur einer Minute Zuhören.",
      },
      {
        title: "Verlier deine Serie nicht!",
        body_one: "Einmal kurz zuhören, und deine Serie von {{count}} Tag bleibt bestehen.",
        body_other: "Einmal kurz zuhören, und deine Serie von {{count}} Tagen bleibt bestehen.",
      },
      {
        title: "Noch ist Zeit, dranzubleiben",
        body_one: "Hör vor Mitternacht eine Minute zu und rette deine Serie von {{count}} Tag.",
        body_other: "Hör vor Mitternacht eine Minute zu und rette deine Serie von {{count}} Tagen.",
      },
    ],
    newEpisodeFollowed: [
      { title: "Neu von {{podcast}}", body: "„{{title}}“ ist jetzt da. Hör auf deinem Level rein." },
      {
        title: "{{podcast}} hat eine neue Folge 🎧",
        body: "„{{title}}“ ist gerade erschienen. Sei unter den Ersten, die reinhören.",
      },
      { title: "Frisch von {{podcast}}", body: "„{{title}}“ ist bereit für dich, in drei Levels." },
    ],
    newEpisodesPodcast: [
      {
        title: "Neu von {{podcast}}",
        body_one: "{{count}} neue Folge wartet auf dich.",
        body_other: "{{count}} neue Folgen warten auf dich.",
      },
      {
        title: "Neue Folgen von {{podcast}} 🎧",
        body_one: "{{count}} neue Folge ist gerade erschienen. Hör rein!",
        body_other: "{{count}} neue Folgen sind gerade erschienen. Womit fängst du an?",
      },
      {
        title: "Bleib dran bei {{podcast}}",
        body_one: "{{count}} neue Folge ist da. Leg los!",
        body_other: "{{count}} neue Folgen sind da. Leg los!",
      },
    ],
    newEpisodesMixed: [
      {
        title: "Neue Folgen für dich 🎧",
        body_one: "{{count}} neue Folge von einem Podcast, dem du folgst.",
        body_other: "{{count}} neue Folgen von Podcasts, denen du folgst.",
      },
      {
        title: "Deine Podcasts haben Neues",
        body_one: "{{count}} neue Folge ist gerade bei deinen Podcasts erschienen.",
        body_other: "{{count}} neue Folgen sind gerade bei deinen Podcasts erschienen.",
      },
      {
        title: "Neuer Hörstoff ist da",
        body_one: "Hol {{count}} neue Folge deiner Podcasts nach.",
        body_other: "Hol {{count}} neue Folgen deiner Podcasts nach.",
      },
    ],
  },
} satisfies Copy
