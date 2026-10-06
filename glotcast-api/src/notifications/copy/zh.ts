import { type Copy } from "./en"

// Simplified Chinese, "你". No plural forms. Episode titles go in 《》.
export const zh = {
  levels: { bg: "简单", in: "中等", ad: "困难" },
  messages: {
    generic: [
      { title: "英语小憩时间到了 ☕", body: "今天听几分钟，让你的英语持续进步。" },
      { title: "今天的英语在等你", body: "挑一集，听上几分钟。积少成多。" },
      { title: "准备好今天的听力了吗？", body: "播放一个英语故事，剩下的交给耳朵吧。" },
      { title: "今天只需几分钟 🎧", body: "打开 GlotCast，听点新内容。未来的你会感谢现在的你。" },
    ],
    streak: [
      { title: "保持你的连续记录 🔥", body: "你已经连续收听 {{count}} 天了。今天再加一天吧！" },
      { title: "别让记录中断", body: "目前已连续 {{count}} 天。今天听几分钟，记录就能继续。" },
      { title: "状态很棒 🎧", body: "你的 {{count}} 天连续记录还在继续。今天用一集短节目延续它吧。" },
    ],
    continue: [
      { title: "从上次停下的地方继续", body: "《{{title}}》只剩 {{count}} 分钟了。今天听完吧？" },
      { title: "就快听完了", body: "《{{title}}》还剩 {{count}} 分钟。回来继续听吧。" },
      { title: "你的节目在等你 🎧", body: "《{{title}}》还剩 {{count}} 分钟。一起听完吧。" },
    ],
    finish: [
      { title: "把开始的听完吧", body: "你之前听《{{title}}》听得很投入，只剩 {{count}} 分钟了。" },
      { title: "想知道结局吗？", body: "回到《{{title}}》吧，还剩 {{count}} 分钟。" },
      { title: "就差一点 🎧", body: "《{{title}}》还剩 {{count}} 分钟，正适合短暂休息时听。" },
    ],
    wordsDue: [
      { title: "你的单词可以复习了", body: "有 {{count}} 个单词在等你。快速复习一下，记得更牢。" },
      { title: "快速复习单词？🧠", body: "有 {{count}} 个单词待复习，大约只需一分钟。" },
      { title: "别让单词溜走", body: "现在复习 {{count}} 个单词，把它们牢牢记住。" },
    ],
    newEpisode: [
      { title: "你的级别有新节目 🎧", body: "《{{title}}》刚刚上线（{{level}}）。今天就来听听吧。" },
      { title: "有新内容可以听了", body: "试试《{{title}}》的{{level}}版本，刚刚上线。" },
      { title: "为你推荐的新节目", body: "《{{title}}》来了，你的{{level}}版本已准备好。" },
    ],
    recap: [
      { title: "你这周的英语 📊", body: "这周你听了 {{count}} 分钟。新的一周也要元气满满！" },
      { title: "这周很棒！", body: "这周听了 {{count}} 分钟英语。保持这个节奏。" },
      { title: "你的每周回顾", body: "本周：收听 {{count}} 分钟。接下来想听什么？" },
    ],
    streakSaver: [
      { title: "今晚连续记录就要中断了 🔥", body: "已连续 {{count}} 天。只需听一分钟就能保住记录。" },
      { title: "别丢掉你的连续记录！", body: "稍微听一会儿，你的 {{count}} 天连续记录就能延续。" },
      { title: "现在还来得及", body: "午夜前听一分钟，保住你的 {{count}} 天连续记录。" },
    ],
    newEpisodeFollowed: [
      { title: "{{podcast}} 有新节目", body: "《{{title}}》已上线。按你的级别来听吧。" },
      { title: "{{podcast}} 更新了 🎧", body: "《{{title}}》刚刚上线。抢先来听吧。" },
      { title: "{{podcast}} 新鲜出炉", body: "《{{title}}》在等你，共有三个级别。" },
    ],
    newEpisodesPodcast: [
      { title: "{{podcast}} 有新节目", body: "有 {{count}} 集新节目在等你。" },
      { title: "{{podcast}} 更新了 🎧", body: "{{count}} 集新节目刚刚上线。先听哪一集？" },
      { title: "跟上 {{podcast}}", body: "{{count}} 集新节目已上线。快来听吧！" },
    ],
    newEpisodesMixed: [
      { title: "为你更新的新节目 🎧", body: "你关注的播客有 {{count}} 集新节目。" },
      { title: "你关注的播客有更新", body: "你关注的播客刚刚上线了 {{count}} 集新节目。" },
      { title: "有新内容可以听了", body: "来听听你关注的播客的 {{count}} 集新节目。" },
    ],
  },
} satisfies Copy
