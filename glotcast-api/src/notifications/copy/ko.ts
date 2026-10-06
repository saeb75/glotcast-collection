import { type Copy } from "./en"

// Polite (해요체), like the app. No plural forms. Particles depend on the last syllable, so none is attached to
// a placeholder: "‘{{title}}’ 에피소드가…", "{{podcast}}의…" (의 / 에서 never change).
export const ko = {
  levels: { bg: "쉬움", in: "보통", ad: "어려움" },
  messages: {
    generic: [
      { title: "영어 휴식 시간이에요 ☕", body: "오늘 몇 분만 들어도 영어 실력이 꾸준히 늘어요." },
      {
        title: "오늘의 영어가 기다리고 있어요",
        body: "에피소드 하나를 골라 몇 분만 들어 보세요. 작은 걸음이 모여 큰 변화가 돼요.",
      },
      { title: "오늘도 들어 볼까요?", body: "영어 이야기를 틀어 두고 귀에게 맡겨 보세요." },
      {
        title: "오늘은 딱 몇 분만 🎧",
        body: "GlotCast를 열고 새로운 걸 들어 보세요. 미래의 내가 고마워할 거예요.",
      },
    ],
    streak: [
      {
        title: "연속 기록을 이어 가세요 🔥",
        body: "{{count}}일 연속으로 듣고 있어요. 오늘도 하루를 더해 보세요!",
      },
      {
        title: "기록을 끊지 마세요",
        body: "지금까지 {{count}}일 연속이에요. 오늘 몇 분만 들으면 기록이 이어져요.",
      },
      {
        title: "아주 잘하고 있어요 🎧",
        body: "{{count}}일 연속 기록이 순항 중이에요. 오늘은 짧은 에피소드로 이어 가세요.",
      },
    ],
    continue: [
      {
        title: "듣던 곳부터 이어서 들어요",
        body: "‘{{title}}’ 에피소드가 {{count}}분 남았어요. 오늘 마저 들어 볼까요?",
      },
      {
        title: "끝이 얼마 남지 않았어요",
        body: "‘{{title}}’ 에피소드는 이제 {{count}}분만 남았어요. 다시 들어 보세요.",
      },
      {
        title: "에피소드가 기다리고 있어요 🎧",
        body: "‘{{title}}’ 에피소드가 {{count}}분 남았어요. 함께 끝까지 들어요.",
      },
    ],
    finish: [
      {
        title: "시작한 에피소드를 끝내 보세요",
        body: "‘{{title}}’ 에피소드를 재미있게 듣고 있었죠. {{count}}분만 더 들으면 돼요.",
      },
      {
        title: "결말이 궁금하지 않나요?",
        body: "‘{{title}}’ 에피소드로 돌아가 보세요. {{count}}분 남았어요.",
      },
      {
        title: "거의 다 왔어요 🎧",
        body: "‘{{title}}’ 에피소드가 {{count}}분 남았어요. 잠깐 쉬는 시간에 딱이에요.",
      },
    ],
    wordsDue: [
      {
        title: "복습할 단어가 준비됐어요",
        body: "단어 {{count}}개가 기다리고 있어요. 빠르게 복습하면 오래 기억할 수 있어요.",
      },
      { title: "단어 빠르게 복습할까요? 🧠", body: "복습할 단어가 {{count}}개 있어요. 1분이면 충분해요." },
      {
        title: "외운 단어를 놓치지 마세요",
        body: "지금 단어 {{count}}개를 복습하고 확실히 내 것으로 만드세요.",
      },
    ],
    newEpisode: [
      {
        title: "내 레벨에 새 에피소드 🎧",
        body: "‘{{title}}’ 에피소드가 나왔어요({{level}}). 오늘 들어 보세요.",
      },
      {
        title: "새로 들을 거리가 생겼어요",
        body: "‘{{title}}’ 에피소드를 {{level}} 버전으로 들어 보세요. 방금 나왔어요.",
      },
      {
        title: "나를 위한 새 에피소드",
        body: "‘{{title}}’ 에피소드가 도착했어요. {{level}} 버전이 준비돼 있어요.",
      },
    ],
    recap: [
      {
        title: "이번 주 영어 리포트 📊",
        body: "이번 주에 {{count}}분 동안 들었어요. 새로운 한 주도 힘차게 시작해요!",
      },
      { title: "멋진 한 주였어요!", body: "이번 주 영어 듣기 {{count}}분. 이 리듬을 이어 가세요." },
      { title: "주간 요약", body: "이번 주 듣기: {{count}}분. 다음엔 무엇을 들을까요?" },
    ],
    streakSaver: [
      {
        title: "오늘 밤 연속 기록이 끊겨요 🔥",
        body: "{{count}}일 연속 기록이에요. 1분만 들어도 지킬 수 있어요.",
      },
      { title: "연속 기록을 잃지 마세요!", body: "잠깐만 들어도 {{count}}일 연속 기록이 이어져요." },
      { title: "아직 시간이 있어요", body: "자정 전에 1분만 들어서 {{count}}일 연속 기록을 지키세요." },
    ],
    newEpisodeFollowed: [
      { title: "{{podcast}}의 새 에피소드", body: "‘{{title}}’ 에피소드가 나왔어요. 내 레벨로 들어 보세요." },
      {
        title: "{{podcast}}에서 새 에피소드 🎧",
        body: "‘{{title}}’ 에피소드가 방금 공개됐어요. 가장 먼저 들어 보세요.",
      },
      { title: "{{podcast}}의 따끈한 소식", body: "‘{{title}}’ 에피소드가 세 가지 레벨로 기다리고 있어요." },
    ],
    newEpisodesPodcast: [
      { title: "{{podcast}}의 새 에피소드", body: "새 에피소드 {{count}}개가 기다리고 있어요." },
      {
        title: "{{podcast}}에서 새 에피소드 🎧",
        body: "새 에피소드 {{count}}개가 방금 나왔어요. 어떤 것부터 들을까요?",
      },
      {
        title: "{{podcast}} 소식을 놓치지 마세요",
        body: "새 에피소드 {{count}}개가 공개됐어요. 지금 들어 보세요!",
      },
    ],
    newEpisodesMixed: [
      {
        title: "새 에피소드가 도착했어요 🎧",
        body: "팔로우한 팟캐스트에서 새 에피소드 {{count}}개가 나왔어요.",
      },
      {
        title: "팔로우한 팟캐스트 새 소식",
        body: "팔로우한 팟캐스트에 새 에피소드 {{count}}개가 올라왔어요.",
      },
      {
        title: "새로 들을 에피소드가 있어요",
        body: "내 팟캐스트의 새 에피소드 {{count}}개를 확인해 보세요.",
      },
    ],
  },
} satisfies Copy
