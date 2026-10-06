import { type Copy } from "./en"

// "Bạn", like the app. No plural forms.
export const vi = {
  levels: { bg: "Dễ", in: "Trung bình", ad: "Khó" },
  messages: {
    generic: [
      {
        title: "Đến giờ nghỉ học tiếng Anh rồi ☕",
        body: "Nghe vài phút hôm nay để tiếng Anh của bạn tiếp tục tiến bộ.",
      },
      {
        title: "Bài tiếng Anh hôm nay đang chờ bạn",
        body: "Chọn một tập và nghe vài phút. Những bước nhỏ sẽ tạo nên khác biệt.",
      },
      {
        title: "Sẵn sàng nghe hôm nay chưa?",
        body: "Mở một câu chuyện tiếng Anh và để đôi tai làm phần việc còn lại.",
      },
      {
        title: "Chỉ vài phút hôm nay thôi 🎧",
        body: "Mở GlotCast và nghe điều gì đó mới. Bạn của tương lai sẽ cảm ơn bạn.",
      },
    ],
    streak: [
      {
        title: "Giữ chuỗi ngày của bạn 🔥",
        body: "Bạn đã nghe {{count}} ngày liên tiếp. Hôm nay thêm một ngày nữa nhé!",
      },
      {
        title: "Đừng để chuỗi bị đứt",
        body: "Đã {{count}} ngày liên tiếp. Nghe vài phút hôm nay để tiếp tục chuỗi.",
      },
      {
        title: "Bạn đang làm rất tốt 🎧",
        body: "Chuỗi {{count}} ngày của bạn vẫn đang tiếp diễn. Hôm nay hãy tiếp tục với một tập ngắn.",
      },
    ],
    continue: [
      {
        title: "Nghe tiếp từ chỗ bạn dừng",
        body: "Chỉ còn {{count}} phút nữa là hết “{{title}}”. Nghe nốt hôm nay nhé?",
      },
      { title: "Sắp đến đoạn kết rồi", body: "“{{title}}” chỉ còn {{count}} phút. Quay lại nghe tiếp nào." },
      { title: "Tập của bạn đang chờ 🎧", body: "Còn {{count}} phút trong “{{title}}”. Cùng nghe hết nhé." },
    ],
    finish: [
      {
        title: "Hoàn thành điều bạn đã bắt đầu",
        body: "Bạn đang nghe dở “{{title}}”. Chỉ còn {{count}} phút thôi.",
      },
      { title: "Tò mò cái kết không?", body: "Quay lại “{{title}}” nhé. Còn {{count}} phút nữa." },
      {
        title: "Sắp xong rồi 🎧",
        body: "Còn {{count}} phút trong “{{title}}”. Hoàn hảo cho một lúc nghỉ ngắn.",
      },
    ],
    wordsDue: [
      {
        title: "Từ vựng của bạn đã sẵn sàng để ôn",
        body: "{{count}} từ đang chờ bạn. Ôn nhanh một chút để nhớ lâu hơn.",
      },
      { title: "Ôn từ vựng nhanh nhé? 🧠", body: "Có {{count}} từ cần ôn. Chỉ mất khoảng một phút." },
      { title: "Đừng để từ vựng trôi đi", body: "Ôn {{count}} từ ngay bây giờ và ghi nhớ chúng thật lâu." },
    ],
    newEpisode: [
      {
        title: "Tập mới đúng trình độ của bạn 🎧",
        body: "“{{title}}” vừa ra mắt ({{level}}). Nghe ngay hôm nay nhé.",
      },
      { title: "Có tập mới để nghe", body: "Thử nghe “{{title}}” ở bản {{level}}. Tập này vừa ra mắt." },
      { title: "Tập mới dành cho bạn", body: "“{{title}}” đã có. Bản {{level}} của bạn đã sẵn sàng." },
    ],
    recap: [
      {
        title: "Tuần tiếng Anh của bạn 📊",
        body: "Tuần này bạn đã nghe {{count}} phút. Bắt đầu tuần mới thật sung sức nhé!",
      },
      { title: "Một tuần tuyệt vời!", body: "{{count}} phút tiếng Anh trong tuần này. Hãy giữ nhịp nhé." },
      { title: "Tổng kết tuần của bạn", body: "Tuần này: {{count}} phút nghe. Tiếp theo bạn sẽ nghe gì?" },
    ],
    streakSaver: [
      {
        title: "Chuỗi của bạn sẽ đứt tối nay 🔥",
        body: "{{count}} ngày liên tiếp rồi. Chỉ cần nghe một phút để giữ chuỗi.",
      },
      {
        title: "Đừng để mất chuỗi ngày!",
        body: "Nghe một chút thôi là chuỗi {{count}} ngày của bạn vẫn tiếp tục.",
      },
      { title: "Vẫn còn kịp", body: "Nghe một phút trước nửa đêm để giữ chuỗi {{count}} ngày của bạn." },
    ],
    newEpisodeFollowed: [
      { title: "Tập mới từ {{podcast}}", body: "“{{title}}” đã có. Nghe ở trình độ của bạn nhé." },
      {
        title: "{{podcast}} có tập mới 🎧",
        body: "“{{title}}” vừa ra mắt. Hãy là một trong những người nghe đầu tiên.",
      },
      { title: "Mới toanh từ {{podcast}}", body: "“{{title}}” đang chờ bạn, với ba trình độ." },
    ],
    newEpisodesPodcast: [
      { title: "Mới từ {{podcast}}", body: "{{count}} tập mới đang chờ bạn." },
      {
        title: "{{podcast}} có tập mới 🎧",
        body: "{{count}} tập mới vừa ra mắt. Bạn sẽ nghe tập nào trước?",
      },
      { title: "Cập nhật cùng {{podcast}}", body: "{{count}} tập mới đã có. Nghe ngay nào!" },
    ],
    newEpisodesMixed: [
      { title: "Tập mới dành cho bạn 🎧", body: "{{count}} tập mới từ các podcast bạn theo dõi." },
      { title: "Podcast của bạn có tin mới", body: "{{count}} tập mới vừa đến từ các podcast bạn theo dõi." },
      { title: "Có nội dung mới để nghe", body: "Nghe ngay {{count}} tập mới từ các podcast của bạn." },
    ],
  },
} satisfies Copy
