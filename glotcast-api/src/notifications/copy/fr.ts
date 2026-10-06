import { type Copy } from "./en"

// Vouvoiement, like the app. French "one" also covers 0.
export const fr = {
  levels: { bg: "Facile", in: "Moyen", ad: "Difficile" },
  messages: {
    generic: [
      {
        title: "C'est l'heure de votre pause anglais ☕",
        body: "Quelques minutes d'écoute aujourd'hui, et votre anglais continue de progresser.",
      },
      {
        title: "Votre anglais du jour vous attend",
        body: "Choisissez un épisode et écoutez quelques minutes. Chaque petit pas compte.",
      },
      {
        title: "Prêt pour l'écoute du jour ?",
        body: "Lancez une histoire en anglais et laissez vos oreilles faire le travail.",
      },
      {
        title: "Juste quelques minutes aujourd'hui 🎧",
        body: "Ouvrez GlotCast et écoutez quelque chose de nouveau. Vous vous direz merci plus tard.",
      },
    ],
    streak: [
      {
        title: "Gardez votre série en vie 🔥",
        body_one: "Vous écoutez depuis {{count}} jour d'affilée. Ajoutez-en un aujourd'hui !",
        body_other: "Vous écoutez depuis {{count}} jours d'affilée. Ajoutez-en un aujourd'hui !",
      },
      {
        title: "Ne brisez pas la chaîne",
        body_one: "{{count}} jour d'affilée jusqu'ici. Quelques minutes aujourd'hui pour continuer.",
        body_other: "{{count}} jours d'affilée jusqu'ici. Quelques minutes aujourd'hui pour continuer.",
      },
      {
        title: "Vous êtes lancé ! 🎧",
        body_one: "Votre série de {{count}} jour tient bon. Continuez avec un épisode court aujourd'hui.",
        body_other: "Votre série de {{count}} jours tient bon. Continuez avec un épisode court aujourd'hui.",
      },
    ],
    continue: [
      {
        title: "Reprenez là où vous en étiez",
        body: "Plus que {{count}} min dans « {{title}} ». Vous le terminez aujourd'hui ?",
      },
      { title: "Tout près de la fin", body: "Il ne reste que {{count}} min à « {{title}} ». Replongez-y." },
      {
        title: "Votre épisode vous attend 🎧",
        body: "Encore {{count}} min dans « {{title}} ». Allez jusqu'au bout !",
      },
    ],
    finish: [
      {
        title: "Terminez ce que vous avez commencé",
        body: "Vous aimiez « {{title}} ». Plus que {{count}} min.",
      },
      {
        title: "Curieux de connaître la fin ?",
        body: "Revenez à « {{title}} ». Il vous reste {{count}} min.",
      },
      {
        title: "Presque fini 🎧",
        body: "Encore {{count}} min dans « {{title}} ». Parfait pour une petite pause.",
      },
    ],
    wordsDue: [
      {
        title: "Vos mots sont prêts à être révisés",
        body_one: "{{count}} mot vous attend. Une révision rapide pour bien le retenir.",
        body_other: "{{count}} mots vous attendent. Une révision rapide pour bien les retenir.",
      },
      {
        title: "Petite révision de mots ? 🧠",
        body_one: "{{count}} mot à réviser. Ça prend moins d'une minute.",
        body_other: "{{count}} mots à réviser. Ça prend environ une minute.",
      },
      {
        title: "Ne laissez pas vos mots s'envoler",
        body_one: "Révisez {{count}} mot maintenant et gardez-le pour de bon.",
        body_other: "Révisez {{count}} mots maintenant et gardez-les pour de bon.",
      },
    ],
    newEpisode: [
      {
        title: "Nouveau à votre niveau 🎧",
        body: "« {{title}} » vient de sortir ({{level}}). Écoutez-le aujourd'hui.",
      },
      {
        title: "Du nouveau à écouter",
        body: "Essayez « {{title}} » en version {{level}}. Il vient de sortir.",
      },
      {
        title: "Un nouvel épisode pour vous",
        body: "« {{title}} » est arrivé. Votre version {{level}} est prête.",
      },
    ],
    recap: [
      {
        title: "Votre semaine en anglais 📊",
        body: "Vous avez écouté {{count}} min cette semaine. Attaquez la nouvelle semaine en force !",
      },
      { title: "Belle semaine !", body: "{{count}} min d'anglais cette semaine. Gardez le rythme." },
      {
        title: "Votre bilan de la semaine",
        body: "Cette semaine : {{count}} min d'écoute. Qu'allez-vous écouter ensuite ?",
      },
    ],
    streakSaver: [
      {
        title: "Votre série se termine ce soir 🔥",
        body_one: "{{count}} jour d'affilée. Sauvez votre série avec une seule minute d'écoute.",
        body_other: "{{count}} jours d'affilée. Sauvez votre série avec une seule minute d'écoute.",
      },
      {
        title: "Ne perdez pas votre série !",
        body_one: "Une petite écoute suffit pour garder votre série de {{count}} jour.",
        body_other: "Une petite écoute suffit pour garder votre série de {{count}} jours.",
      },
      {
        title: "Il est encore temps",
        body_one: "Écoutez une minute avant minuit pour sauver votre série de {{count}} jour.",
        body_other: "Écoutez une minute avant minuit pour sauver votre série de {{count}} jours.",
      },
    ],
    newEpisodeFollowed: [
      { title: "Nouveau chez {{podcast}}", body: "« {{title}} » est disponible. Écoutez-le à votre niveau." },
      {
        title: "Nouvel épisode de {{podcast}} 🎧",
        body: "« {{title}} » vient de sortir. Soyez parmi les premiers à l'écouter.",
      },
      { title: "Tout frais de {{podcast}}", body: "« {{title}} » vous attend, en trois niveaux." },
    ],
    newEpisodesPodcast: [
      {
        title: "Nouveau chez {{podcast}}",
        body_one: "{{count}} nouvel épisode vous attend.",
        body_other: "{{count}} nouveaux épisodes vous attendent.",
      },
      {
        title: "Du nouveau chez {{podcast}} 🎧",
        body_one: "{{count}} nouvel épisode vient d'arriver. Écoutez-le !",
        body_other: "{{count}} nouveaux épisodes viennent d'arriver. Par lequel commencer ?",
      },
      {
        title: "{{podcast}} vous attend",
        body_one: "{{count}} nouvel épisode est sorti. Lancez-vous !",
        body_other: "{{count}} nouveaux épisodes sont sortis. Lancez-vous !",
      },
    ],
    newEpisodesMixed: [
      {
        title: "De nouveaux épisodes pour vous 🎧",
        body_one: "{{count}} nouvel épisode d'un podcast que vous suivez.",
        body_other: "{{count}} nouveaux épisodes des podcasts que vous suivez.",
      },
      {
        title: "Du nouveau dans vos podcasts",
        body_one: "{{count}} nouvel épisode vient d'arriver dans vos podcasts.",
        body_other: "{{count}} nouveaux épisodes viennent d'arriver dans vos podcasts.",
      },
      {
        title: "De quoi écouter",
        body_one: "Rattrapez {{count}} nouvel épisode de vos podcasts.",
        body_other: "Rattrapez {{count}} nouveaux épisodes de vos podcasts.",
      },
    ],
  },
} satisfies Copy
