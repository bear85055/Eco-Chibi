-- ==============================================================================
-- ECO CHIBI — ROW LEVEL SECURITY (RLS) POLICIES
-- ==============================================================================

-- Bật RLS trên toàn bộ các bảng
ALTER TABLE public.users ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.rewards ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.redemptions ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.point_logs ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.game_sessions ENABLE ROW LEVEL SECURITY;

-- Helper function lấy vai trò người dùng hiện tại
CREATE OR REPLACE FUNCTION public.current_user_role()
RETURNS VARCHAR AS $$
  SELECT vai_tro FROM public.users WHERE id = auth.uid();
$$ LANGUAGE sql STABLE SECURITY DEFINER;

-- Helper function lấy lớp phụ trách của người dùng hiện tại
CREATE OR REPLACE FUNCTION public.current_user_lop()
RETURNS VARCHAR AS $$
  SELECT lop FROM public.users WHERE id = auth.uid();
$$ LANGUAGE sql STABLE SECURITY DEFINER;

-- ------------------------------------------------------------------------------
-- 1. POLICIES: USERS
-- ------------------------------------------------------------------------------
-- Học sinh xem thông tin của chính mình
CREATE POLICY "Users read self" ON public.users
  FOR SELECT USING (auth.uid() = id);

-- Giáo viên xem danh sách học sinh lớp mình phụ trách
CREATE POLICY "Teacher read class students" ON public.users
  FOR SELECT USING (
    public.current_user_role() = 'teacher' AND lop = public.current_user_lop()
  );

-- Admin xem toàn bộ người dùng
CREATE POLICY "Admin read all users" ON public.users
  FOR SELECT USING (public.current_user_role() = 'admin');

-- Cho phép tạo hồ sơ người dùng khi đăng ký mới hoặc do Admin thêm
CREATE POLICY "Insert user profile" ON public.users
  FOR INSERT WITH CHECK (
    auth.uid() = id OR public.current_user_role() IN ('teacher', 'admin')
  );

-- CẤM mọi UPDATE/DELETE trực tiếp điểm và tài khoản từ client. Chỉ cho phép qua RPC!

-- ------------------------------------------------------------------------------
-- 2. POLICIES: REWARDS
-- ------------------------------------------------------------------------------
-- Bất kỳ ai đã đăng nhập đều xem được các món quà đang hoạt động
CREATE POLICY "Read active rewards" ON public.rewards
  FOR SELECT USING (dang_hoat_dong = true);

-- Giáo viên & Admin xem toàn bộ kho quà (cả món đang ẩn)
CREATE POLICY "Staff read all rewards" ON public.rewards
  FOR SELECT USING (public.current_user_role() IN ('teacher', 'admin'));

-- Giáo viên & Admin được thêm/sửa món quà
CREATE POLICY "Staff manage rewards" ON public.rewards
  FOR ALL USING (public.current_user_role() IN ('teacher', 'admin'));

-- ------------------------------------------------------------------------------
-- 3. POLICIES: REDEMPTIONS
-- ------------------------------------------------------------------------------
-- Học sinh đọc đơn quà của chính mình
CREATE POLICY "Students read own redemptions" ON public.redemptions
  FOR SELECT USING (auth.uid() = user_id);

-- Giáo viên đọc đơn quà của học sinh lớp mình
CREATE POLICY "Teacher read class redemptions" ON public.redemptions
  FOR SELECT USING (
    public.current_user_role() = 'teacher' AND
    EXISTS (SELECT 1 FROM public.users u WHERE u.id = redemptions.user_id AND u.lop = public.current_user_lop())
  );

-- Admin đọc tất cả đơn quà
CREATE POLICY "Admin read all redemptions" ON public.redemptions
  FOR SELECT USING (public.current_user_role() = 'admin');

-- Đổi quà, duyệt quà, hủy quà CHỈ ĐƯỢC THỰC HIỆN QUA RPC FUNCTION (doi_qua, xac_nhan_phat_qua, huy_doi_qua)

-- ------------------------------------------------------------------------------
-- 4. POLICIES: POINT_LOGS
-- ------------------------------------------------------------------------------
-- Học sinh đọc nhật ký điểm của mình
CREATE POLICY "Students read own point logs" ON public.point_logs
  FOR SELECT USING (auth.uid() = user_id);

-- Giáo viên đọc nhật ký của lớp mình
CREATE POLICY "Teacher read class point logs" ON public.point_logs
  FOR SELECT USING (
    public.current_user_role() = 'teacher' AND
    EXISTS (SELECT 1 FROM public.users u WHERE u.id = point_logs.user_id AND u.lop = public.current_user_lop())
  );

-- Admin đọc tất cả nhật ký điểm
CREATE POLICY "Admin read all point logs" ON public.point_logs
  FOR SELECT USING (public.current_user_role() = 'admin');

-- Client KHÔNG ĐƯỢC INSERT/UPDATE trực tiếp vào point_logs!

-- ------------------------------------------------------------------------------
-- 5. POLICIES: GAME_SESSIONS
-- ------------------------------------------------------------------------------
-- Học sinh đọc phiên chơi của chính mình
CREATE POLICY "Students read own game sessions" ON public.game_sessions
  FOR SELECT USING (auth.uid() = user_id);
