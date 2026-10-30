# 🌱 Eco Chibi — Sân Chơi Sống Xanh Tiểu Học

Ứng dụng web trò chơi hóa giáo dục bảo vệ môi trường dành cho học sinh tiểu học. Học sinh tham gia các trò chơi phân loại rác, tiết kiệm điện nước, thực hiện nhiệm vụ xanh hằng ngày để nuôi dưỡng nhân vật Chibi tiến hóa và tích lũy Xu Xanh đổi quà học tập.

## Tính năng chính

### Phân hệ Học sinh
- **Khu vườn Chibi**: Theo dõi cấp độ tiến hóa (Hạt Mầm -> Cây Non -> Cây Xanh -> Siêu Anh Hùng Xanh) và tiến độ điểm hằng ngày.
- **Sảnh trò chơi**:
  - **Thùng Rác Thông Thái**: Kéo thả phân loại rác Hữu cơ, Tái chế và Nguy hại/Khác.
  - **Biệt Đội Tiết Kiệm**: Phản xạ tắt các thiết bị điện, khóa vòi nước lãng phí trong 30 giây.
  - **Bước Chân Xanh**: Nhiệm vụ tự khai báo thói quen tốt và giải câu đố môi trường mỗi ngày.
- **Bảng xếp hạng**: Vinh danh Top 20 học sinh có điểm XP tích lũy cao nhất trường.
- **Cửa hàng & Hộp quà**: Đổi Xu Xanh lấy quà tặng thực tế và nhận mã đổi quà (`GX-XXXX`).

### Phân hệ Quản trị (Admin)
- **Duyệt quà**: Tra cứu mã đổi quà của học sinh, xác nhận phát quà hoặc hủy đơn (tự động hoàn Xu và tồn kho).
- **Học sinh & Thưởng nóng**: Quản lý danh sách học sinh theo lớp, cộng điểm thưởng nóng cho hành động đẹp ngoài đời thực, cấp lại mã PIN 4 số hoặc thêm học sinh mới.
- **Kho quà**: Thêm mới, chỉnh sửa giá Xu, cập nhật số lượng tồn kho và ẩn/hiện vật phẩm.
- **Nhật ký điểm**: Theo dõi lịch sử biến động XP và Xu Xanh toàn trường.

## Cài đặt & Chạy dự án

```bash
# Cài đặt thư viện
npm install

# Chạy máy chủ phát triển (http://localhost:5173)
npm run dev

# Kiểm tra mã nguồn (lint)
npm run lint

# Đóng gói bản dựng Production
npm run build
```

## Cấu hình Cơ sở dữ liệu (Tùy chọn)

Mặc định ứng dụng có thể hoạt động độc lập bằng bộ nhớ trình duyệt (`localStorage`). Khi triển khai tập trung với **Supabase**, sao chép file `.env.example` thành `.env` và điền thông tin kết nối:

```env
VITE_SUPABASE_URL=https://your-project-id.supabase.co
VITE_SUPABASE_ANON_KEY=your-anon-key-here
```

Xem chi tiết cách khởi tạo bảng, RLS và RPC functions trong [DEPLOYMENT.md](./DEPLOYMENT.md).
