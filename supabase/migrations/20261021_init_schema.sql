-- ==============================================================================
-- ECO CHIBI — SCHEMA DEFINITION (GIAI ĐOẠN 3)
-- Cơ sở dữ liệu: PostgreSQL 15+ trên Supabase
-- ==============================================================================

-- 1. BẢNG USERS (Thông tin học sinh & giáo viên)
CREATE TABLE IF NOT EXISTS public.users (
  id UUID PRIMARY KEY REFERENCES auth.users(id) ON DELETE CASCADE,
  ma_dang_nhap VARCHAR(32) UNIQUE NOT NULL,
  ho_ten VARCHAR(128) NOT NULL,
  ten_hien_thi VARCHAR(64) NOT NULL,
  lop VARCHAR(16) NOT NULL,
  vai_tro VARCHAR(16) NOT NULL CHECK (vai_tro IN ('student', 'teacher', 'admin')),
  diem_hien_co INT NOT NULL DEFAULT 0 CHECK (diem_hien_co >= 0),
  tong_diem_tich_luy INT NOT NULL DEFAULT 0 CHECK (tong_diem_tich_luy >= 0),
  diem_kiem_hom_nay INT NOT NULL DEFAULT 0 CHECK (diem_kiem_hom_nay >= 0),
  ngay_cap_nhat_cuoi DATE NOT NULL DEFAULT CURRENT_DATE,
  thoi_diem_dat_diem TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  nv_ngay DATE,
  nv_tu_khai BOOLEAN,
  nv_do_vui JSONB,
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

-- Index xếp hạng điểm XP (thời điểm đạt điểm làm tiêu chí phụ phân thứ hạng)
CREATE INDEX IF NOT EXISTS idx_users_leaderboard ON public.users (tong_diem_tich_luy DESC, thoi_diem_dat_diem ASC)
  WHERE vai_tro = 'student';
CREATE INDEX IF NOT EXISTS idx_users_lop ON public.users (lop);

-- 2. BẢNG REWARDS (Kho quà tặng)
CREATE TABLE IF NOT EXISTS public.rewards (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  ten_qua VARCHAR(128) NOT NULL,
  hinh_anh TEXT NOT NULL,
  gia_xu INT NOT NULL CHECK (gia_xu > 0),
  so_luong_ton INT NOT NULL DEFAULT 0 CHECK (so_luong_ton >= 0),
  dang_hoat_dong BOOLEAN NOT NULL DEFAULT true,
  mo_ta TEXT,
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

-- 3. BẢNG REDEMPTIONS (Lịch sử đổi quà / Hộp quà của học sinh)
CREATE TABLE IF NOT EXISTS public.redemptions (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  ma_nhan_qua VARCHAR(16) UNIQUE NOT NULL,
  user_id UUID NOT NULL REFERENCES public.users(id) ON DELETE CASCADE,
  reward_id UUID NOT NULL REFERENCES public.rewards(id),
  gia_xu_luc_doi INT NOT NULL CHECK (gia_xu_luc_doi > 0),
  trang_thai VARCHAR(16) NOT NULL DEFAULT 'pending' CHECK (trang_thai IN ('pending', 'completed', 'cancelled')),
  ngay_doi TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  ngay_nhan TIMESTAMPTZ,
  nguoi_duyet UUID REFERENCES public.users(id)
);

CREATE INDEX IF NOT EXISTS idx_redemptions_user ON public.redemptions (user_id, ngay_doi DESC);
CREATE INDEX IF NOT EXISTS idx_redemptions_trang_thai ON public.redemptions (trang_thai, ngay_doi DESC);

-- 4. BẢNG POINT_LOGS (Nhật ký biến động điểm Xu & XP)
CREATE TABLE IF NOT EXISTS public.point_logs (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id UUID NOT NULL REFERENCES public.users(id) ON DELETE CASCADE,
  loai VARCHAR(32) NOT NULL CHECK (loai IN ('game', 'quiz', 'thuong_nong', 'doi_qua', 'hoan_xu')),
  xp INT NOT NULL DEFAULT 0 CHECK (xp >= 0),
  xu INT NOT NULL DEFAULT 0,
  tham_chieu_id UUID,
  ly_do TEXT,
  nguoi_tao UUID REFERENCES public.users(id),
  thoi_gian TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

CREATE INDEX IF NOT EXISTS idx_point_logs_user ON public.point_logs (user_id, thoi_gian DESC);

-- 5. BẢNG GAME_SESSIONS (Phiên chơi mini-game để chống gửi kết quả giả)
CREATE TABLE IF NOT EXISTS public.game_sessions (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id UUID NOT NULL REFERENCES public.users(id) ON DELETE CASCADE,
  game VARCHAR(32) NOT NULL,
  bat_dau TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  ket_thuc TIMESTAMPTZ,
  so_cau_dung INT
);

CREATE INDEX IF NOT EXISTS idx_game_sessions_user ON public.game_sessions (user_id, bat_dau DESC);

-- 6. VIEW BẢNG XẾP HẠNG AN TOÀN (Ẩn họ tên thật, chỉ lộ tên rút gọn & lớp)
CREATE OR REPLACE VIEW public.v_leaderboard AS
SELECT
  id,
  ten_hien_thi,
  lop,
  tong_diem_tich_luy AS xp,
  thoi_diem_dat_diem,
  ROW_NUMBER() OVER (ORDER BY tong_diem_tich_luy DESC, thoi_diem_dat_diem ASC) AS hang
FROM public.users
WHERE vai_tro = 'student';
