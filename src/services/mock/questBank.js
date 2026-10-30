/**
 * NGÂN HÀNG NHIỆM VỤ "BƯỚC CHÂN XANH" (phía server).
 * Giai đoạn 3: chuyển thành bảng `daily_questions` trên Supabase; đáp án KHÔNG được gửi xuống client
 * trước khi học sinh trả lời.
 */

/** Câu tự khai báo thói quen (dựa trên sự trung thực) */
export const HABITS = [
  { id: 'h-walk', icon: '🚶', cau_hoi: 'Hôm nay em có đi bộ hoặc đi xe đạp đến trường không?', khen: 'Đi bộ vừa khỏe người, vừa không khói bụi!' },
  { id: 'h-bottle', icon: '🧴', cau_hoi: 'Hôm nay em có mang bình nước cá nhân không?', khen: 'Mỗi bình nước riêng giúp bớt rất nhiều chai nhựa!' },
  { id: 'h-light', icon: '💡', cau_hoi: 'Hôm nay em có tắt đèn, quạt khi ra khỏi phòng không?', khen: 'Tắt đèn khi không dùng là siêu anh hùng tiết kiệm!' },
  { id: 'h-tap', icon: '🚰', cau_hoi: 'Hôm nay em có khóa vòi nước khi đánh răng không?', khen: 'Mỗi lần khóa vòi tiết kiệm được cả chục lít nước đó!' },
  { id: 'h-sort', icon: '♻️', cau_hoi: 'Hôm nay em có bỏ rác đúng thùng phân loại không?', khen: 'Phân loại rác giúp rác được tái chế nhiều hơn!' },
  { id: 'h-bag', icon: '👜', cau_hoi: 'Hôm nay em có dùng túi vải thay cho túi ni lông không?', khen: 'Túi ni lông cần hàng trăm năm mới phân hủy đó!' },
  { id: 'h-plant', icon: '🪴', cau_hoi: 'Hôm nay em có tưới cây hoặc chăm sóc cây xanh không?', khen: 'Cây xanh cho chúng ta không khí trong lành!' },
]

/** Câu đố vui có đáp án đúng/sai */
export const QUIZZES = [
  {
    id: 'q-banana',
    cau_hoi: 'Vỏ chuối nên bỏ vào thùng rác nào?',
    lua_chon: ['🟢 Rác hữu cơ', '🔵 Rác tái chế', '⚪ Rác còn lại'],
    dap_an: 0,
    giai_thich: 'Vỏ chuối là rác hữu cơ, có thể ủ thành phân bón cho cây.',
  },
  {
    id: 'q-battery',
    cau_hoi: 'Pin cũ đã hết thì em nên làm gì?',
    lua_chon: ['Vứt vào thùng rác ở nhà', 'Mang đến điểm thu gom pin', 'Chôn xuống đất'],
    dap_an: 1,
    giai_thich: 'Pin chứa chất độc hại, phải mang đến điểm thu gom riêng để xử lý an toàn.',
  },
  {
    id: 'q-bag',
    cau_hoi: 'Túi ni lông cần khoảng bao lâu để phân hủy?',
    lua_chon: ['1 tuần', '1 năm', 'Hàng trăm năm'],
    dap_an: 2,
    giai_thich: 'Túi ni lông cần từ 100 đến 500 năm mới phân hủy, nên hãy dùng túi vải nhé!',
  },
  {
    id: 'q-tap',
    cau_hoi: 'Khi đánh răng, cách nào giúp tiết kiệm nước?',
    lua_chon: ['Mở vòi nước suốt lúc đánh răng', 'Hứng nước vào cốc rồi khóa vòi', 'Mở vòi thật to cho nhanh'],
    dap_an: 1,
    giai_thich: 'Dùng cốc và khóa vòi giúp tiết kiệm nhiều lít nước mỗi lần đánh răng.',
  },
  {
    id: 'q-paper',
    cau_hoi: 'Giấy vụn, vở cũ thuộc loại rác nào?',
    lua_chon: ['🔵 Rác tái chế', '🟢 Rác hữu cơ', '🔴 Rác nguy hại'],
    dap_an: 0,
    giai_thich: 'Giấy có thể tái chế thành giấy mới, giúp bớt chặt cây.',
  },
  {
    id: 'q-tree',
    cau_hoi: 'Cây xanh giúp không khí trong lành hơn bằng cách nào?',
    lua_chon: ['Tạo ra khói', 'Hút khí CO₂ và nhả khí O₂', 'Làm trời mưa nhiều hơn'],
    dap_an: 1,
    giai_thich: 'Cây hấp thụ khí CO₂ và thải ra khí O₂ mà chúng ta cần để thở.',
  },
  {
    id: 'q-light',
    cau_hoi: 'Loại bóng đèn nào tiết kiệm điện nhất?',
    lua_chon: ['Bóng đèn sợi đốt', 'Bóng đèn LED', 'Cả hai như nhau'],
    dap_an: 1,
    giai_thich: 'Đèn LED dùng ít điện hơn nhiều và bền hơn bóng sợi đốt.',
  },
  {
    id: 'q-foam',
    cau_hoi: 'Hộp xốp đựng đồ ăn có tốt cho môi trường không?',
    lua_chon: ['Rất tốt, vì nhẹ', 'Không tốt, vì rất khó phân hủy', 'Tốt, vì tự tan trong nước'],
    dap_an: 1,
    giai_thich: 'Hộp xốp gần như không phân hủy, hãy dùng hộp cơm cá nhân nhé!',
  },
  {
    id: 'q-ac',
    cau_hoi: 'Khi cả lớp ra sân chơi, em nên làm gì với đèn và quạt?',
    lua_chon: ['Để nguyên cho mát khi quay lại', 'Tắt hết đèn và quạt', 'Bật thêm cho sáng'],
    dap_an: 1,
    giai_thich: 'Không có người thì tắt đèn, quạt để tiết kiệm điện.',
  },
  {
    id: 'q-earth',
    cau_hoi: 'Ngày Trái Đất được tổ chức vào ngày nào?',
    lua_chon: ['22 tháng 4', '1 tháng 6', '20 tháng 11'],
    dap_an: 0,
    giai_thich: 'Ngày Trái Đất là 22/4 hằng năm — cùng nhau bảo vệ hành tinh xanh!',
  },
]

/** Số thứ tự ngày (theo giờ VN) — dùng để mọi học sinh có cùng nhiệm vụ trong một ngày */
export function dayIndex(isoDate) {
  return Math.floor(Date.parse(`${isoDate}T00:00:00Z`) / 86_400_000)
}
