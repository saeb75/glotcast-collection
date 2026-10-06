import { type Copy } from "./en"

export const es = {
  levels: { bg: "Fácil", in: "Medio", ad: "Difícil" },
  messages: {
    generic: [
      {
        title: "Hora de tu pausa de inglés ☕",
        body: "Unos minutos de escucha hoy y tu inglés sigue creciendo.",
      },
      {
        title: "Tu inglés de hoy te espera",
        body: "Elige un episodio y escucha unos minutos. Los pasos pequeños suman.",
      },
      {
        title: "¿Listo para escuchar hoy?",
        body: "Pon una historia en inglés y deja que tus oídos hagan el trabajo.",
      },
      {
        title: "Solo unos minutos hoy 🎧",
        body: "Abre GlotCast y escucha algo nuevo. Tu yo del futuro te lo agradecerá.",
      },
    ],
    streak: [
      {
        title: "Mantén viva tu racha 🔥",
        body_one: "Llevas {{count}} día seguido escuchando. ¡Suma uno más hoy!",
        body_other: "Llevas {{count}} días seguidos escuchando. ¡Suma uno más hoy!",
      },
      {
        title: "No rompas la cadena",
        body_one: "{{count}} día seguido hasta ahora. Unos minutos hoy y sigues sumando.",
        body_other: "{{count}} días seguidos hasta ahora. Unos minutos hoy y sigues sumando.",
      },
      {
        title: "¡Vas muy bien! 🎧",
        body_one: "Tu racha de {{count}} día va genial. Mantenla hoy con un episodio corto.",
        body_other: "Tu racha de {{count}} días va genial. Mantenla hoy con un episodio corto.",
      },
    ],
    continue: [
      {
        title: "Sigue donde lo dejaste",
        body: "Solo te quedan {{count}} min de “{{title}}”. ¿Lo terminas hoy?",
      },
      {
        title: "Ya casi llegas al final",
        body: "A “{{title}}” le quedan solo {{count}} min. Vuelve a escucharlo.",
      },
      {
        title: "Tu episodio te espera 🎧",
        body: "Quedan {{count}} min de “{{title}}”. Terminémoslo juntos.",
      },
    ],
    finish: [
      {
        title: "Termina lo que empezaste",
        body: "Estabas disfrutando de “{{title}}”. Solo quedan {{count}} min.",
      },
      { title: "¿Quieres saber cómo termina?", body: "Vuelve a “{{title}}”. Te quedan {{count}} min." },
      {
        title: "Casi lo tienes 🎧",
        body: "Quedan {{count}} min de “{{title}}”. Perfecto para una pausa corta.",
      },
    ],
    wordsDue: [
      {
        title: "Tus palabras están listas para repasar",
        body_one: "Te espera {{count}} palabra. Un repaso rápido te ayuda a recordarla.",
        body_other: "Te esperan {{count}} palabras. Un repaso rápido te ayuda a recordarlas.",
      },
      {
        title: "¿Un repaso rápido? 🧠",
        body_one: "{{count}} palabra para repasar. Te lleva menos de un minuto.",
        body_other: "{{count}} palabras para repasar. Te lleva más o menos un minuto.",
      },
      {
        title: "Que no se te escapen tus palabras",
        body_one: "Repasa {{count}} palabra ahora y quédatela para siempre.",
        body_other: "Repasa {{count}} palabras ahora y quédatelas para siempre.",
      },
    ],
    newEpisode: [
      { title: "Nuevo en tu nivel 🎧", body: "“{{title}}” acaba de salir ({{level}}). Escúchalo hoy." },
      {
        title: "Algo nuevo para escuchar",
        body: "Prueba “{{title}}” en la versión {{level}}. Acaba de salir.",
      },
      { title: "Episodio nuevo para ti", body: "Ya está aquí “{{title}}”. Tu versión {{level}} te espera." },
    ],
    recap: [
      {
        title: "Tu semana en inglés 📊",
        body: "Esta semana escuchaste {{count}} min. ¡Empieza la nueva semana con fuerza!",
      },
      { title: "¡Buena semana!", body: "{{count}} min de inglés esta semana. Mantén el ritmo." },
      { title: "Tu resumen semanal", body: "Esta semana: {{count}} min de escucha. ¿Qué escucharás ahora?" },
    ],
    streakSaver: [
      {
        title: "Tu racha termina esta noche 🔥",
        body_one: "{{count}} día seguido. Sálvala con solo un minuto de escucha.",
        body_other: "{{count}} días seguidos. Sálvala con solo un minuto de escucha.",
      },
      {
        title: "¡No pierdas tu racha!",
        body_one: "Una escucha corta mantiene viva tu racha de {{count}} día.",
        body_other: "Una escucha corta mantiene viva tu racha de {{count}} días.",
      },
      {
        title: "Aún estás a tiempo",
        body_one: "Escucha un minuto antes de medianoche y salva tu racha de {{count}} día.",
        body_other: "Escucha un minuto antes de medianoche y salva tu racha de {{count}} días.",
      },
    ],
    newEpisodeFollowed: [
      { title: "Nuevo de {{podcast}}", body: "Ya salió “{{title}}”. Escúchalo en tu nivel." },
      {
        title: "{{podcast}} tiene episodio nuevo 🎧",
        body: "Acaba de salir “{{title}}”. Sé de los primeros en escucharlo.",
      },
      { title: "Recién salido de {{podcast}}", body: "“{{title}}” te espera, en tres niveles." },
    ],
    newEpisodesPodcast: [
      {
        title: "Nuevo de {{podcast}}",
        body_one: "Te espera {{count}} episodio nuevo.",
        body_other: "Te esperan {{count}} episodios nuevos.",
      },
      {
        title: "{{podcast}} tiene novedades 🎧",
        body_one: "Acaba de llegar {{count}} episodio nuevo. ¡Escúchalo!",
        body_other: "Acaban de llegar {{count}} episodios nuevos. ¿Por cuál empiezas?",
      },
      {
        title: "Ponte al día con {{podcast}}",
        body_one: "Ya salió {{count}} episodio nuevo. ¡Dale al play!",
        body_other: "Ya salieron {{count}} episodios nuevos. ¡Dale al play!",
      },
    ],
    newEpisodesMixed: [
      {
        title: "Episodios nuevos para ti 🎧",
        body_one: "{{count}} episodio nuevo de un podcast que sigues.",
        body_other: "{{count}} episodios nuevos de podcasts que sigues.",
      },
      {
        title: "Tus podcasts tienen novedades",
        body_one: "Acaba de llegar {{count}} episodio nuevo de tus podcasts.",
        body_other: "Acaban de llegar {{count}} episodios nuevos de tus podcasts.",
      },
      {
        title: "Hay nuevos episodios",
        body_one: "Ponte al día con {{count}} episodio nuevo de tus podcasts.",
        body_other: "Ponte al día con {{count}} episodios nuevos de tus podcasts.",
      },
    ],
  },
} satisfies Copy
