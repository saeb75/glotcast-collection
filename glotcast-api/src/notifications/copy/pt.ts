import { type Copy } from "./en"

// Brazilian Portuguese ("você"), like the app. Portuguese "one" also covers 0.
export const pt = {
  levels: { bg: "Fácil", in: "Médio", ad: "Difícil" },
  messages: {
    generic: [
      {
        title: "Hora da sua pausa de inglês ☕",
        body: "Alguns minutos ouvindo hoje e o seu inglês continua crescendo.",
      },
      {
        title: "Seu inglês do dia está esperando",
        body: "Escolha um episódio e ouça por alguns minutos. Pequenos passos fazem diferença.",
      },
      {
        title: "Pronto para ouvir hoje?",
        body: "Coloque uma história em inglês e deixe seus ouvidos trabalharem.",
      },
      {
        title: "Só alguns minutinhos hoje 🎧",
        body: "Abra o GlotCast e ouça algo novo. Seu eu do futuro vai agradecer.",
      },
    ],
    streak: [
      {
        title: "Mantenha sua sequência viva 🔥",
        body_one: "Você está ouvindo há {{count}} dia seguido. Some mais um hoje!",
        body_other: "Você está ouvindo há {{count}} dias seguidos. Some mais um hoje!",
      },
      {
        title: "Não quebre a corrente",
        body_one: "{{count}} dia seguido até agora. Alguns minutos hoje e você continua.",
        body_other: "{{count}} dias seguidos até agora. Alguns minutos hoje e você continua.",
      },
      {
        title: "Você está mandando bem 🎧",
        body_one: "Sua sequência de {{count}} dia está firme. Continue hoje com um episódio curto.",
        body_other: "Sua sequência de {{count}} dias está firme. Continue hoje com um episódio curto.",
      },
    ],
    continue: [
      {
        title: "Continue de onde parou",
        body: "Faltam só {{count}} min de “{{title}}”. Que tal terminar hoje?",
      },
      {
        title: "Quase no fim",
        body: "Faltam apenas {{count}} min para terminar “{{title}}”. Volte a ouvir.",
      },
      {
        title: "Seu episódio está esperando 🎧",
        body: "Restam {{count}} min de “{{title}}”. Vamos terminar juntos.",
      },
    ],
    finish: [
      {
        title: "Termine o que você começou",
        body: "Você estava curtindo “{{title}}”. Faltam só {{count}} min.",
      },
      { title: "Curioso para saber o final?", body: "Volte para “{{title}}”. Restam {{count}} min." },
      { title: "Quase lá 🎧", body: "Restam {{count}} min de “{{title}}”. Perfeito para uma pausa rápida." },
    ],
    wordsDue: [
      {
        title: "Suas palavras estão prontas para revisão",
        body_one: "{{count}} palavra está esperando. Uma revisão rápida ajuda a fixar.",
        body_other: "{{count}} palavras estão esperando. Uma revisão rápida ajuda a fixar.",
      },
      {
        title: "Uma revisão rápida? 🧠",
        body_one: "{{count}} palavra para revisar. Leva menos de um minuto.",
        body_other: "{{count}} palavras para revisar. Leva mais ou menos um minuto.",
      },
      {
        title: "Não deixe suas palavras escaparem",
        body_one: "Revise {{count}} palavra agora e guarde para sempre.",
        body_other: "Revise {{count}} palavras agora e guarde para sempre.",
      },
    ],
    newEpisode: [
      { title: "Novidade no seu nível 🎧", body: "“{{title}}” acabou de sair ({{level}}). Ouça hoje." },
      { title: "Algo novo para ouvir", body: "Experimente “{{title}}” na versão {{level}}. Acabou de sair." },
      { title: "Episódio novo para você", body: "“{{title}}” chegou. Sua versão {{level}} está pronta." },
    ],
    recap: [
      {
        title: "Sua semana em inglês 📊",
        body: "Você ouviu {{count}} min nesta semana. Comece a nova semana com tudo!",
      },
      { title: "Que semana boa!", body: "{{count}} min de inglês nesta semana. Mantenha o ritmo." },
      {
        title: "Seu resumo da semana",
        body: "Nesta semana: {{count}} min ouvindo. O que você vai ouvir agora?",
      },
    ],
    streakSaver: [
      {
        title: "Sua sequência acaba hoje à noite 🔥",
        body_one: "{{count}} dia seguido. Salve sua sequência com só um minuto ouvindo.",
        body_other: "{{count}} dias seguidos. Salve sua sequência com só um minuto ouvindo.",
      },
      {
        title: "Não perca sua sequência!",
        body_one: "Ouvir um pouquinho mantém viva sua sequência de {{count}} dia.",
        body_other: "Ouvir um pouquinho mantém viva sua sequência de {{count}} dias.",
      },
      {
        title: "Ainda dá tempo",
        body_one: "Ouça por um minuto antes da meia-noite e salve sua sequência de {{count}} dia.",
        body_other: "Ouça por um minuto antes da meia-noite e salve sua sequência de {{count}} dias.",
      },
    ],
    newEpisodeFollowed: [
      { title: "Novo de {{podcast}}", body: "“{{title}}” já está disponível. Ouça no seu nível." },
      {
        title: "{{podcast}} tem episódio novo 🎧",
        body: "“{{title}}” acabou de sair. Seja um dos primeiros a ouvir.",
      },
      { title: "Fresquinho de {{podcast}}", body: "“{{title}}” está esperando por você, em três níveis." },
    ],
    newEpisodesPodcast: [
      {
        title: "Novo de {{podcast}}",
        body_one: "{{count}} episódio novo está esperando por você.",
        body_other: "{{count}} episódios novos estão esperando por você.",
      },
      {
        title: "{{podcast}} tem novidades 🎧",
        body_one: "{{count}} episódio novo acabou de chegar. Ouça já!",
        body_other: "{{count}} episódios novos acabaram de chegar. Qual primeiro?",
      },
      {
        title: "Fique em dia com {{podcast}}",
        body_one: "{{count}} episódio novo saiu. Aperte o play!",
        body_other: "{{count}} episódios novos saíram. Aperte o play!",
      },
    ],
    newEpisodesMixed: [
      {
        title: "Episódios novos para você 🎧",
        body_one: "{{count}} episódio novo de um podcast que você segue.",
        body_other: "{{count}} episódios novos de podcasts que você segue.",
      },
      {
        title: "Seus podcasts têm novidades",
        body_one: "{{count}} episódio novo acabou de chegar dos seus podcasts.",
        body_other: "{{count}} episódios novos acabaram de chegar dos seus podcasts.",
      },
      {
        title: "Tem coisa nova para ouvir",
        body_one: "Fique em dia com {{count}} episódio novo dos seus podcasts.",
        body_other: "Fique em dia com {{count}} episódios novos dos seus podcasts.",
      },
    ],
  },
} satisfies Copy
