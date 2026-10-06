import { type Copy } from "./en"

export const it = {
  levels: { bg: "Facile", in: "Medio", ad: "Difficile" },
  messages: {
    generic: [
      {
        title: "È l'ora della tua pausa d'inglese ☕",
        body: "Pochi minuti di ascolto oggi e il tuo inglese continua a crescere.",
      },
      {
        title: "Il tuo inglese di oggi ti aspetta",
        body: "Scegli un episodio e ascolta per qualche minuto. I piccoli passi contano.",
      },
      {
        title: "Pronto per l'ascolto di oggi?",
        body: "Fai partire una storia in inglese e lascia lavorare le tue orecchie.",
      },
      {
        title: "Solo qualche minuto oggi 🎧",
        body: "Apri GlotCast e ascolta qualcosa di nuovo. Il te del futuro ti ringrazierà.",
      },
    ],
    streak: [
      {
        title: "Tieni viva la tua serie 🔥",
        body_one: "Ascolti da {{count}} giorno di fila. Aggiungine un altro oggi!",
        body_other: "Ascolti da {{count}} giorni di fila. Aggiungine un altro oggi!",
      },
      {
        title: "Non spezzare la catena",
        body_one: "{{count}} giorno di fila finora. Qualche minuto oggi e si continua.",
        body_other: "{{count}} giorni di fila finora. Qualche minuto oggi e si continua.",
      },
      {
        title: "Stai andando alla grande 🎧",
        body_one: "La tua serie di {{count}} giorno va forte. Continua oggi con un episodio breve.",
        body_other: "La tua serie di {{count}} giorni va forte. Continua oggi con un episodio breve.",
      },
    ],
    continue: [
      {
        title: "Riprendi da dove avevi lasciato",
        body: "Mancano solo {{count}} min alla fine di “{{title}}”. Lo finisci oggi?",
      },
      { title: "Sei quasi alla fine", body: "A “{{title}}” mancano solo {{count}} min. Riprendi l'ascolto." },
      {
        title: "Il tuo episodio ti aspetta 🎧",
        body: "Ancora {{count}} min di “{{title}}”. Finiamolo insieme.",
      },
    ],
    finish: [
      {
        title: "Finisci quello che hai iniziato",
        body: "Ti stava piacendo “{{title}}”. Mancano solo {{count}} min.",
      },
      { title: "Curioso di sapere come finisce?", body: "Torna a “{{title}}”. Ti restano {{count}} min." },
      {
        title: "Ci sei quasi 🎧",
        body: "Ancora {{count}} min di “{{title}}”. Perfetto per una breve pausa.",
      },
    ],
    wordsDue: [
      {
        title: "Le tue parole sono pronte per il ripasso",
        body_one: "Ti aspetta {{count}} parola. Un ripasso veloce ti aiuta a ricordarla.",
        body_other: "Ti aspettano {{count}} parole. Un ripasso veloce ti aiuta a ricordarle.",
      },
      {
        title: "Un ripasso veloce? 🧠",
        body_one: "{{count}} parola da ripassare. Ci vuole meno di un minuto.",
        body_other: "{{count}} parole da ripassare. Ci vuole circa un minuto.",
      },
      {
        title: "Non lasciarti sfuggire le parole",
        body_one: "Ripassa {{count}} parola adesso e tienila per sempre.",
        body_other: "Ripassa {{count}} parole adesso e tienile per sempre.",
      },
    ],
    newEpisode: [
      { title: "Novità al tuo livello 🎧", body: "“{{title}}” è appena uscito ({{level}}). Ascoltalo oggi." },
      {
        title: "Qualcosa di nuovo da ascoltare",
        body: "Prova “{{title}}” nella versione {{level}}. È appena uscito.",
      },
      {
        title: "Un nuovo episodio per te",
        body: "È arrivato “{{title}}”. La tua versione {{level}} è pronta.",
      },
    ],
    recap: [
      {
        title: "La tua settimana in inglese 📊",
        body: "Questa settimana hai ascoltato {{count}} min. Inizia alla grande la nuova settimana!",
      },
      { title: "Bella settimana!", body: "{{count}} min di inglese questa settimana. Mantieni il ritmo." },
      {
        title: "Il tuo riepilogo settimanale",
        body: "Questa settimana: {{count}} min di ascolto. Cosa ascolterai adesso?",
      },
    ],
    streakSaver: [
      {
        title: "La tua serie finisce stanotte 🔥",
        body_one: "{{count}} giorno di fila. Salvala con un solo minuto di ascolto.",
        body_other: "{{count}} giorni di fila. Salvala con un solo minuto di ascolto.",
      },
      {
        title: "Non perdere la tua serie!",
        body_one: "Un breve ascolto tiene viva la tua serie di {{count}} giorno.",
        body_other: "Un breve ascolto tiene viva la tua serie di {{count}} giorni.",
      },
      {
        title: "Sei ancora in tempo",
        body_one: "Ascolta un minuto prima di mezzanotte e salva la tua serie di {{count}} giorno.",
        body_other: "Ascolta un minuto prima di mezzanotte e salva la tua serie di {{count}} giorni.",
      },
    ],
    newEpisodeFollowed: [
      { title: "Novità da {{podcast}}", body: "“{{title}}” è disponibile. Ascoltalo al tuo livello." },
      {
        title: "Nuovo episodio di {{podcast}} 🎧",
        body: "“{{title}}” è appena uscito. Sii tra i primi ad ascoltarlo.",
      },
      { title: "Appena uscito da {{podcast}}", body: "“{{title}}” ti aspetta, in tre livelli." },
    ],
    newEpisodesPodcast: [
      {
        title: "Novità da {{podcast}}",
        body_one: "Ti aspetta {{count}} nuovo episodio.",
        body_other: "Ti aspettano {{count}} nuovi episodi.",
      },
      {
        title: "Nuovi episodi di {{podcast}} 🎧",
        body_one: "È appena arrivato {{count}} nuovo episodio. Ascoltalo!",
        body_other: "Sono appena arrivati {{count}} nuovi episodi. Da quale inizi?",
      },
      {
        title: "Mettiti in pari con {{podcast}}",
        body_one: "È uscito {{count}} nuovo episodio. Buon ascolto!",
        body_other: "Sono usciti {{count}} nuovi episodi. Buon ascolto!",
      },
    ],
    newEpisodesMixed: [
      {
        title: "Nuovi episodi per te 🎧",
        body_one: "{{count}} nuovo episodio da un podcast che segui.",
        body_other: "{{count}} nuovi episodi dai podcast che segui.",
      },
      {
        title: "Novità dai tuoi podcast",
        body_one: "È appena arrivato {{count}} nuovo episodio dai tuoi podcast.",
        body_other: "Sono appena arrivati {{count}} nuovi episodi dai tuoi podcast.",
      },
      {
        title: "C'è qualcosa di nuovo da ascoltare",
        body_one: "Recupera {{count}} nuovo episodio dei tuoi podcast.",
        body_other: "Recupera {{count}} nuovi episodi dei tuoi podcast.",
      },
    ],
  },
} satisfies Copy
