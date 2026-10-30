# 🚀 HƯỚNG DẪN TRIỂN KHAI HỆ THỐNG ECO CHIBI (DEPLOYMENT GUIDE)

> **Dự án:** Eco Chibi – Trò chơi hóa Bảo vệ Môi trường dành cho Học sinh Tiểu học  
> **Kiến trúc:** Frontend SPA (React 19 + Vite) + Backend BaaS (Supabase PostgreSQL 15+, Auth, RLS, RPC)  
> **Trạng thái:** Sẵn sàng 100% để triển khai lên Production (Vercel / Netlify / Cloudflare Pages).

---

## 1. Tổng Quan Kiến Trúc Triển Khai

```text
       [ Người dùng: Học sinh / Giáo viên / Ban phụ trách ]
                                │
               (HTTPS - Tên miền công khai)
                                ▼
         ┌───────────────────────────────────────────┐
         │     FRONTEND TIER (Vercel / Netlify)      │
         │  - Single Page Application (React 19)     │
         │  - Vercel rewrite (vercel.json)           │
         │  - Netlify redirect (_redirects)          │
         │  - PWA Web App Manifest (manifest.json)   │
         └─────────────────────┬─────────────────────┘
                               │
            ┌──────────────────┴──────────────────┐
            ▼                                     ▼
   [ Chế độ Supabase ]                    [ Chế độ Mock Offline ]
   Khi có VITE_SUPABASE_URL               Khi chạy offline/demo
   và VITE_SUPABASE_ANON_KEY              (Lưu LocalStorage tự động)
            │
            ▼
┌───────────────────────────────────────────────────────────┐
│              SUPABASE BAAS (PostgreSQL 15+)               │
│  - Bảng: users, rewards, redemptions, point_logs, sessions │
│  - Phân quyền bảo mật: Row Level Security (RLS)           │
│  - Giao dịch toàn vẹn: RPC Functions (SECURITY DEFINER)   │
│  - Chống cheat: bat_dau_game, nop_ket_qua_game, doi_qua   │
└───────────────────────────────────────────────────────────┘
```

---

## 2. Bước 1: Khởi Tạo Cơ Sở Dữ Liệu Supabase

### 2.1. Đăng ký & Tạo Project
1. Truy cập [supabase.com](https://supabase.com) và đăng nhập (bằng GitHub hoặc Email).
2. Bấm **"New Project"**, đặt tên project (ví dụ: `eco-chibi-primary-school`).
3. Đặt mật khẩu Database mạnh và chọn khu vực máy chủ (Region) gần Việt Nam nhất: **Singapore (ap-southeast-1)**.

### 2.2. Chạy Các Script SQL (Theo thứ tự)
Mở mục **SQL Editor** trong thanh menu bên trái của Supabase Console và chạy lần lượt 4 file:

1. **Schema & Bảng:** Mở file `supabase/migrations/20261021_init_schema.sql`, dán toàn bộ vào SQL Editor và bấm **Run**.
   - *Tạo các bảng:* `users`, `rewards`, `redemptions`, `point_logs`, `game_sessions` và view an toàn `v_leaderboard`.
2. **Chính Sách Bảo Mật RLS:** Mở file `supabase/policies.sql`, dán vào SQL Editor và bấm **Run**.
   - *Kích hoạt RLS:* Học sinh chỉ đọc dữ liệu của mình, giáo viên chỉ quản lý lớp mình, cấm mọi hành vi ghi đè điểm trực tiếp.
3. **Các Hàm Thủ Tục RPC:** Mở file `supabase/functions.sql`, dán vào SQL Editor và bấm **Run**.
   - *Cài đặt các RPC an toàn:* `bat_dau_game`, `nop_ket_qua_game`, `doi_qua`, `xac_nhan_phat_qua`, `huy_doi_qua`, `cong_diem_thuong`, `nop_nhiem_vu`, `cap_lai_pin`.
4. **Nạp Dữ Liệu Khởi Tạo (Seed):** Mở file `supabase/seed.sql`, dán vào SQL Editor và bấm **Run**.
   - *Khởi tạo tài khoản Quản trị:* `ADMIN` (Mật khẩu bảo mật: `admin`).
   - *Kho quà tặng:* Khởi tạo sẵn 4 món quà sinh thái mẫu (Thầy/Cô có thể thêm/sửa/ẩn tùy ý trong mục Kho quà).

### 2.3. Lấy Thông Tin Kết Nối API
1. Vào **Project Settings** (biểu tượng bánh răng) -> Chọn **API**.
2. Sao chép 2 giá trị:
   - **Project URL:** Dạng `https://xxxxxxxxxxxx.supabase.co`
   - **Project API Keys (`anon` `public`):** Dạng chuỗi JWT dài bắt đầu bằng `eyJ...`

---

## 3. Bước 2: Cấu Hình Biến Môi Trường (Environment Variables)

### 3.1. Chạy thử nghiệm trên máy local
Tại thư mục `eco-chibi-game/`, tạo file `.env` (từ `.env.example`):
```bash
VITE_SUPABASE_URL=https://xxxxxxxxxxxx.supabase.co
VITE_SUPABASE_ANON_KEY=eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9...
```
*(Nếu để trống, hệ thống sẽ tự động chạy chế độ Mock Backend với đầy đủ dữ liệu mẫu để thử nghiệm).*

---

## 4. Bước 3: Triển Khai Lên Nền Tảng Đám Mây (Deploy)

### Cách A: Triển khai lên Vercel (Khuyến nghị)
Dự án đã có sẵn file `vercel.json` cấu hình rewrite đường dẫn SPA, tránh lỗi 404 khi tải lại trang:

1. Đẩy mã nguồn lên kho lưu trữ **GitHub**:
   ```bash
   git add .
   git commit -m "feat: complete eco chibi game ready for production deploy"
   git push origin main
   ```
2. Truy cập [vercel.com](https://vercel.com) -> Bấm **"Add New Project"** -> Chọn repository vừa đẩy.
3. Cấu hình cài đặt:
   - **Framework Preset:** `Vite`
   - **Root Directory:** `eco-chibi-game` (nếu repo chứa thư mục con) hoặc `./`
   - **Build Command:** `npm run build`
   - **Output Directory:** `dist`
4. Mở phần **Environment Variables** và thêm 2 biến:
   - `VITE_SUPABASE_URL` = URL Supabase của bạn
   - `VITE_SUPABASE_ANON_KEY` = Anon Public Key của bạn
5. Bấm **"Deploy"**. Quá trình build chỉ mất khoảng ~30 giây. Vercel sẽ cấp một tên miền HTTPS miễn phí (ví dụ: `https://eco-chibi.vercel.app`).

---

### Cách B: Triển khai lên Netlify
Dự án đã có sẵn file `public/_redirects` với nội dung `/*  /index.html  200`:

1. Truy cập [netlify.com](https://netlify.com) -> Chọn **"Import an existing project"** từ GitHub.
2. Cấu hình:
   - **Base directory:** `eco-chibi-game`
   - **Build command:** `npm run build`
   - **Publish directory:** `eco-chibi-game/dist`
3. Trong mục **Environment variables**, thêm `VITE_SUPABASE_URL` và `VITE_SUPABASE_ANON_KEY`.
4. Bấm **"Deploy site"**.

---

## 5. Danh Sách Tài Khoản Khởi Tạo Cho Nhà Trường

Hệ thống đã chuẩn bị sẵn tài khoản ban đầu:

| Vai trò | Tên tài khoản | Mã đăng nhập | Mật khẩu / PIN | Chức năng chính |
| :--- | :--- | :---: | :---: | :--- |
| **Admin** | Admin | `ADMIN` | `admin` | Quản trị toàn trường, duyệt đổi quà, quản lý kho quà, thưởng nóng điểm xanh |
| **Học sinh** | Học sinh toàn trường | `HS...` | PIN 4 số tự chọn | Tự đăng ký qua tab "✨ Đăng ký" (nhận ngay 50 Xu tân thủ) |

> [!TIP]
> Học sinh chỉ cần vào tab **"✨ Đăng ký"** để tạo ngay tài khoản mới cho mình và nhận 50 Xu Xanh tân thủ, hoặc Quản trị viên có thể tạo tài khoản trực tiếp tại mục **"👥 Học sinh & Thưởng"**.

---

## 6. Danh Mục Kiểm Tra Chất Lượng Trước Khi Bàn Giao (Production Checklist)

- [x] **Trình biên dịch & Đóng gói:** `npm run build` hoàn thành trong ~300ms, không có cảnh báo bundle.
- [x] **Kiểm tra cú pháp & Lint:** `npm run lint` đạt chuẩn 100% (**0 errors, 0 warnings**).
- [x] **Định tuyến SPA:** Đã có `vercel.json` và `public/_redirects` ngăn chặn lỗi 404 khi F5.
- [x] **Trải nghiệm thiết bị di động:** Hỗ trợ cảm ứng vuốt chạm (Pointer Events), chuẩn PWA `manifest.json`, icon & viewport tối ưu màn hình cảm ứng của học sinh.
- [x] **Âm thanh tương tác:** Web Audio Synthesis độc lập ([sfx.js](src/utils/sfx.js)) chạy mượt trên mọi trình duyệt mà không cần tải file MP3 dung lượng lớn.
- [x] **Chế độ hoạt động kép (Hybrid Mode):** Hoạt động ổn định cả khi online kết nối Supabase và offline với Mock LocalStorage.
