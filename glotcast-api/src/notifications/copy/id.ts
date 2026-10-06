import { type Copy } from "./en"

// Informal "kamu / -mu", like the app. No plural forms.
export const id = {
  levels: { bg: "Mudah", in: "Sedang", ad: "Sulit" },
  messages: {
    generic: [
      {
        title: "Waktunya rehat bahasa Inggris ☕",
        body: "Dengarkan beberapa menit hari ini, dan bahasa Inggrismu terus berkembang.",
      },
      {
        title: "Bahasa Inggris harianmu menunggu",
        body: "Pilih satu episode dan dengarkan beberapa menit. Langkah kecil itu berarti.",
      },
      {
        title: "Siap mendengarkan hari ini?",
        body: "Putar cerita berbahasa Inggris dan biarkan telingamu bekerja.",
      },
      {
        title: "Cukup beberapa menit hari ini 🎧",
        body: "Buka GlotCast dan dengarkan sesuatu yang baru. Dirimu di masa depan akan berterima kasih.",
      },
    ],
    streak: [
      {
        title: "Jaga streak-mu tetap menyala 🔥",
        body: "Kamu sudah mendengarkan {{count}} hari berturut-turut. Tambah satu hari lagi hari ini!",
      },
      {
        title: "Jangan putuskan rantainya",
        body: "Sudah {{count}} hari berturut-turut. Beberapa menit hari ini, dan streak-mu berlanjut.",
      },
      {
        title: "Kerja bagus! 🎧",
        body: "Streak-mu sudah {{count}} hari. Lanjutkan hari ini dengan episode singkat.",
      },
    ],
    continue: [
      {
        title: "Lanjutkan dari terakhir kali",
        body: "Tinggal {{count}} menit lagi di “{{title}}”. Selesaikan hari ini?",
      },
      {
        title: "Sudah hampir selesai",
        body: "“{{title}}” tinggal {{count}} menit lagi. Yuk, lanjut dengarkan.",
      },
      {
        title: "Episodemu menunggu 🎧",
        body: "Sisa {{count}} menit di “{{title}}”. Ayo selesaikan bersama.",
      },
    ],
    finish: [
      {
        title: "Selesaikan yang sudah kamu mulai",
        body: "Kamu sedang menikmati “{{title}}”. Tinggal {{count}} menit lagi.",
      },
      { title: "Penasaran bagaimana akhirnya?", body: "Kembali ke “{{title}}”. Sisa {{count}} menit lagi." },
      { title: "Sedikit lagi 🎧", body: "Sisa {{count}} menit di “{{title}}”. Pas untuk rehat sejenak." },
    ],
    wordsDue: [
      {
        title: "Kata-katamu siap diulang",
        body: "{{count}} kata menunggumu. Ulasan singkat membantu kata-kata itu melekat.",
      },
      {
        title: "Ulang kata sebentar? 🧠",
        body: "Ada {{count}} kata untuk diulang. Hanya sekitar satu menit.",
      },
      { title: "Jangan biarkan katamu terlupa", body: "Ulang {{count}} kata sekarang dan ingat selamanya." },
    ],
    newEpisode: [
      { title: "Baru di levelmu 🎧", body: "“{{title}}” baru saja rilis ({{level}}). Dengarkan hari ini." },
      { title: "Ada yang baru untuk didengar", body: "Coba “{{title}}” versi {{level}}. Baru saja rilis." },
      { title: "Episode baru untukmu", body: "“{{title}}” sudah hadir. Versi {{level}} untukmu sudah siap." },
    ],
    recap: [
      {
        title: "Minggumu bersama bahasa Inggris 📊",
        body: "Minggu ini kamu mendengarkan {{count}} menit. Mulai minggu baru dengan semangat!",
      },
      {
        title: "Minggu yang hebat!",
        body: "{{count}} menit bahasa Inggris minggu ini. Pertahankan ritmenya.",
      },
      {
        title: "Ringkasan mingguanmu",
        body: "Minggu ini: {{count}} menit mendengarkan. Mau dengar apa selanjutnya?",
      },
    ],
    streakSaver: [
      {
        title: "Streak-mu berakhir malam ini 🔥",
        body: "{{count}} hari berturut-turut. Selamatkan dengan mendengarkan satu menit saja.",
      },
      {
        title: "Jangan sampai streak-mu hilang!",
        body: "Dengarkan sebentar saja agar streak-mu yang sudah {{count}} hari tetap hidup.",
      },
      {
        title: "Masih ada waktu",
        body: "Dengarkan satu menit sebelum tengah malam untuk menyelamatkan streak {{count}} hari.",
      },
    ],
    newEpisodeFollowed: [
      { title: "Baru dari {{podcast}}", body: "“{{title}}” sudah tersedia. Dengarkan sesuai levelmu." },
      {
        title: "Episode baru {{podcast}} 🎧",
        body: "“{{title}}” baru saja rilis. Jadilah salah satu pendengar pertama.",
      },
      { title: "Segar dari {{podcast}}", body: "“{{title}}” menunggumu, dalam tiga level." },
    ],
    newEpisodesPodcast: [
      { title: "Baru dari {{podcast}}", body: "{{count}} episode baru menunggumu." },
      {
        title: "{{podcast}} punya episode baru 🎧",
        body: "{{count}} episode baru sudah hadir. Mau mulai dari mana?",
      },
      { title: "Ikuti terus {{podcast}}", body: "{{count}} episode baru sudah rilis. Yuk, dengarkan!" },
    ],
    newEpisodesMixed: [
      { title: "Episode baru untukmu 🎧", body: "{{count}} episode baru dari podcast yang kamu ikuti." },
      {
        title: "Ada kabar baru dari podcastmu",
        body: "{{count}} episode baru sudah hadir dari podcast yang kamu ikuti.",
      },
      { title: "Ada yang baru untuk didengar", body: "Kejar {{count}} episode baru dari podcastmu." },
    ],
  },
} satisfies Copy
