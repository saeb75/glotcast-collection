import { type Copy } from "./en"

// Turkish nouns stay singular after a number, so no plural forms are needed. No suffix is ever attached to a
// placeholder (vowel harmony depends on the inserted name): "“{{title}}” bölümü…", never "“{{title}}”'ı".
export const tr = {
  levels: { bg: "Kolay", in: "Orta", ad: "Zor" },
  messages: {
    generic: [
      {
        title: "İngilizce molası zamanı ☕",
        body: "Bugün birkaç dakika dinle, İngilizcen gelişmeye devam etsin.",
      },
      {
        title: "Günlük İngilizcen seni bekliyor",
        body: "Bir bölüm seç ve birkaç dakika dinle. Küçük adımlar birikir.",
      },
      {
        title: "Bugünkü dinlemeye hazır mısın?",
        body: "İngilizce bir hikâye aç, gerisini kulakların halletsin.",
      },
      {
        title: "Bugün sadece birkaç dakika 🎧",
        body: "GlotCast'i aç ve yeni bir şey dinle. Gelecekteki sen sana teşekkür edecek.",
      },
    ],
    streak: [
      {
        title: "Serini canlı tut 🔥",
        body: "{{count}} gündür aralıksız dinliyorsun. Bugün bir gün daha ekle!",
      },
      {
        title: "Zinciri kırma",
        body: "Şu ana kadar art arda {{count}} gün. Bugün birkaç dakika dinle, serin devam etsin.",
      },
      {
        title: "Harika gidiyorsun 🎧",
        body: "{{count}} günlük serin sağlam ilerliyor. Bugün kısa bir bölümle devam et.",
      },
    ],
    continue: [
      {
        title: "Kaldığın yerden devam et",
        body: "“{{title}}” bölümünün bitmesine sadece {{count}} dk kaldı. Bugün bitirelim mi?",
      },
      {
        title: "Sona çok yaklaştın",
        body: "“{{title}}” bölümünde sadece {{count}} dk kaldı. Hemen geri dön.",
      },
      {
        title: "Bölümün seni bekliyor 🎧",
        body: "“{{title}}” bölümünden {{count}} dk kaldı. Hadi birlikte bitirelim.",
      },
    ],
    finish: [
      {
        title: "Başladığın bölümü bitir",
        body: "“{{title}}” bölümünü keyifle dinliyordun. Sadece {{count}} dk kaldı.",
      },
      { title: "Sonunu merak etmiyor musun?", body: "“{{title}}” bölümüne geri dön. {{count}} dk kaldı." },
      { title: "Az kaldı 🎧", body: "“{{title}}” bölümünden {{count}} dk kaldı. Kısa bir mola için ideal." },
    ],
    wordsDue: [
      {
        title: "Kelimelerin tekrara hazır",
        body: "{{count}} kelime seni bekliyor. Kısa bir tekrar, akılda kalmalarını sağlar.",
      },
      {
        title: "Hızlı bir kelime tekrarı? 🧠",
        body: "Tekrar edilecek {{count}} kelime var. Yaklaşık bir dakika sürer.",
      },
      { title: "Kelimelerin uçup gitmesin", body: "Şimdi {{count}} kelimeyi tekrar et, kalıcı olsunlar." },
    ],
    newEpisode: [
      {
        title: "Seviyene uygun yeni bölüm 🎧",
        body: "“{{title}}” yeni yayında ({{level}}). Bugün bir dinle.",
      },
      {
        title: "Dinleyecek yeni bir şey var",
        body: "“{{title}}” bölümünü {{level}} sürümüyle dene. Yeni çıktı.",
      },
      { title: "Sana özel yeni bölüm", body: "“{{title}}” geldi. {{level}} sürümün hazır." },
    ],
    recap: [
      { title: "İngilizce haftan 📊", body: "Bu hafta {{count}} dk dinledin. Yeni haftaya güçlü başla!" },
      { title: "Harika bir hafta!", body: "Bu hafta {{count}} dk İngilizce dinledin. Ritmini koru." },
      { title: "Haftalık özetin", body: "Bu hafta: {{count}} dk dinleme. Sırada ne var?" },
    ],
    streakSaver: [
      {
        title: "Serin bu gece bitiyor 🔥",
        body: "Art arda {{count}} gün. Sadece bir dakika dinleyerek serini kurtar.",
      },
      { title: "Serini kaybetme!", body: "Kısa bir dinleme, {{count}} günlük serini canlı tutar." },
      {
        title: "Devam etmek için hâlâ vakit var",
        body: "Gece yarısından önce bir dakika dinle, {{count}} günlük serini kurtar.",
      },
    ],
    newEpisodeFollowed: [
      {
        title: "{{podcast}} yeni bölüm yayınladı",
        body: "“{{title}}” şimdi yayında. Kendi seviyende dinle.",
      },
      { title: "{{podcast}}: yeni bölüm 🎧", body: "“{{title}}” az önce çıktı. İlk dinleyenlerden ol." },
      { title: "{{podcast}} podcast'inde yeni bölüm", body: "“{{title}}” üç seviyede seni bekliyor." },
    ],
    newEpisodesPodcast: [
      { title: "{{podcast}} yeni bölümler yayınladı", body: "{{count}} yeni bölüm seni bekliyor." },
      {
        title: "{{podcast}}: yeni bölümler 🎧",
        body: "{{count}} yeni bölüm az önce geldi. Hangisiyle başlayacaksın?",
      },
      { title: "{{podcast}} seni bekliyor", body: "{{count}} yeni bölüm yayında. Hemen dinlemeye başla!" },
    ],
    newEpisodesMixed: [
      { title: "Sana yeni bölümler var 🎧", body: "Takip ettiğin podcast'lerden {{count}} yeni bölüm." },
      {
        title: "Podcast'lerinde yenilik var",
        body: "Takip ettiğin podcast'lere {{count}} yeni bölüm geldi.",
      },
      { title: "Dinleyecek yeni şeyler var", body: "Podcast'lerinden {{count}} yeni bölümü yakala." },
    ],
  },
} satisfies Copy
