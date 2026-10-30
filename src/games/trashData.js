// Dữ liệu game Thùng Rác Thông Thái (design.md – mục 2.3)
export const BINS = [
  { id: 'organic', ten: 'Hữu cơ', icon: '🍂', mo_ta: 'Đồ ăn thừa, vỏ trái cây, lá cây' },
  { id: 'recycle', ten: 'Tái chế', icon: '♻️', mo_ta: 'Chai nhựa, giấy, lon kim loại' },
  { id: 'other', ten: 'Còn lại', icon: '🗑️', mo_ta: 'Rác bẩn, khó tái chế' },
  { id: 'hazard', ten: 'Nguy hại', icon: '⚠️', mo_ta: 'Pin, bóng đèn, thuốc', advanced: true },
]

export const TRASH_ITEMS = [
  // Hữu cơ
  { icon: '🍌', ten: 'Vỏ chuối', loai: 'organic', goiY: 'Vỏ trái cây sẽ hóa thành phân bón cho cây.' },
  { icon: '🍎', ten: 'Lõi táo', loai: 'organic', goiY: 'Thức ăn thừa là rác hữu cơ.' },
  { icon: '🥬', ten: 'Rau úa', loai: 'organic', goiY: 'Rau củ hỏng có thể ủ thành phân.' },
  { icon: '🍂', ten: 'Lá khô', loai: 'organic', goiY: 'Lá cây là rác hữu cơ.' },
  { icon: '🥚', ten: 'Vỏ trứng', loai: 'organic', goiY: 'Vỏ trứng ủ phân rất tốt cho cây.' },
  { icon: '🦴', ten: 'Xương gà', loai: 'organic', goiY: 'Đồ ăn thừa là rác hữu cơ.' },
  // Tái chế
  { icon: '🧴', ten: 'Chai nhựa', loai: 'recycle', goiY: 'Chai nhựa sạch tái chế được thành đồ mới.' },
  { icon: '📰', ten: 'Giấy báo', loai: 'recycle', goiY: 'Giấy khô, sạch thì tái chế được.' },
  { icon: '🥫', ten: 'Lon sữa', loai: 'recycle', goiY: 'Lon kim loại tái chế được rất nhiều lần.' },
  { icon: '📦', ten: 'Hộp giấy', loai: 'recycle', goiY: 'Thùng, hộp giấy gấp gọn để tái chế.' },
  { icon: '📚', ten: 'Vở cũ', loai: 'recycle', goiY: 'Vở cũ là giấy, tái chế được.' },
  // Còn lại
  { icon: '🥡', ten: 'Hộp xốp', loai: 'other', goiY: 'Hộp xốp dính đồ ăn rất khó tái chế.' },
  { icon: '🧻', ten: 'Giấy ăn bẩn', loai: 'other', goiY: 'Giấy đã dính bẩn thì không tái chế được.' },
  { icon: '🩹', ten: 'Băng cá nhân', loai: 'other', goiY: 'Băng dán đã dùng là rác còn lại.' },
  { icon: '🛍️', ten: 'Túi ni lông bẩn', loai: 'other', goiY: 'Túi ni lông bẩn khó tái chế, hãy dùng túi vải nhé!' },
  // Nguy hại — chỉ xuất hiện ở màn nâng cao
  { icon: '🔋', ten: 'Pin cũ', loai: 'hazard', goiY: 'Pin chứa chất độc, phải mang đến điểm thu gom riêng.' },
  { icon: '💡', ten: 'Bóng đèn hỏng', loai: 'hazard', goiY: 'Bóng đèn có chất độc hại, cần thu gom riêng.' },
  { icon: '💊', ten: 'Thuốc hết hạn', loai: 'hazard', goiY: 'Thuốc hết hạn là rác nguy hại, không vứt bừa.' },
]
