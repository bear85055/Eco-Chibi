-- ==============================================================================
-- ECO CHIBI — LÀM SẠCH DỮ LIỆU HỌC SINH CŨ & CẬP NHẬT TRIGGER/QUYỀN MỚI NHẤT
-- Hướng dẫn: Copy toàn bộ nội dung file này dán vào Supabase -> SQL Editor -> Run
-- ==============================================================================

-- 1. Xóa toàn bộ dữ liệu giao dịch & lịch sử chơi của học sinh cũ
DELETE FROM public.redemptions;
DELETE FROM public.point_logs;
DELETE FROM public.game_sessions;

-- 2. Xóa toàn bộ hồ sơ học sinh trong public.users (Giữ lại tài khoản Admin)
DELETE FROM public.users
WHERE vai_tro <> 'admin'
  AND ma_dang_nhap NOT IN ('ADMIN', 'ADMIN.PORTAL');

-- 3. Xóa toàn bộ tài khoản đăng nhập học sinh cũ trong auth.users & auth.identities
--    (Giữ lại tài khoản Admin để Admin không bị đăng xuất)
DELETE FROM auth.identities
WHERE user_id IN (
  SELECT id FROM auth.users
  WHERE email NOT IN ('admin@ecochibi.local', 'admin.portal@ecochibi.local')
);

DELETE FROM auth.users
WHERE email NOT IN ('admin@ecochibi.local', 'admin.portal@ecochibi.local');

-- 4. Đảm bảo bảng users có cột pin (mật khẩu học sinh) và quyền UPDATE cho Admin/Giáo viên
ALTER TABLE public.users ADD COLUMN IF NOT EXISTS pin VARCHAR(32) NOT NULL DEFAULT '1234';
GRANT SELECT, INSERT, UPDATE, DELETE ON public.users TO authenticated;

DROP POLICY IF EXISTS "Staff update students" ON public.users;
CREATE POLICY "Staff update students" ON public.users
  FOR UPDATE TO authenticated
  USING ((SELECT public.current_user_role()) IN ('teacher', 'admin'))
  WITH CHECK ((SELECT public.current_user_role()) IN ('teacher', 'admin'));

DROP POLICY IF EXISTS "Staff delete students" ON public.users;
CREATE POLICY "Staff delete students" ON public.users
  FOR DELETE TO authenticated
  USING ((SELECT public.current_user_role()) IN ('teacher', 'admin'));

-- 5. Cập nhật Trigger tự động tạo hồ sơ khi học sinh đăng ký theo Form mới (Họ tên, Lớp, Trường, Tên ĐN, MK)
CREATE OR REPLACE FUNCTION public.handle_new_auth_user()
RETURNS TRIGGER AS $$
DECLARE
  v_ma VARCHAR;
  v_ho_ten TEXT;
  v_ten_hien_thi TEXT;
  v_lop VARCHAR;
BEGIN
  IF NEW.email IN ('admin@ecochibi.local', 'admin.portal@ecochibi.local') THEN
    DELETE FROM public.users WHERE ma_dang_nhap = 'ADMIN' AND id <> NEW.id;
    INSERT INTO public.users (
      id, ma_dang_nhap, ho_ten, ten_hien_thi, lop, vai_tro,
      diem_hien_co, tong_diem_tich_luy, diem_kiem_hom_nay, ngay_cap_nhat_cuoi, thoi_diem_dat_diem
    ) VALUES (
      NEW.id, 'ADMIN', 'Admin', 'Admin', 'Toàn trường', 'admin',
      0, 0, 0, CURRENT_DATE, NOW()
    )
    ON CONFLICT (id) DO UPDATE SET
      ma_dang_nhap = 'ADMIN',
      ho_ten = 'Admin',
      ten_hien_thi = 'Admin',
      vai_tro = 'admin';
    RETURN NEW;
  END IF;

  v_ma := NEW.raw_user_meta_data->>'ma_dang_nhap';
  v_ho_ten := NEW.raw_user_meta_data->>'ho_ten';
  v_ten_hien_thi := COALESCE(NEW.raw_user_meta_data->>'ten_hien_thi', v_ho_ten);
  v_lop := NEW.raw_user_meta_data->>'lop';

  IF v_ma IS NOT NULL AND v_ho_ten IS NOT NULL AND v_lop IS NOT NULL THEN
    INSERT INTO public.users (
      id, ma_dang_nhap, pin, ho_ten, ten_hien_thi, lop, vai_tro,
      diem_hien_co, tong_diem_tich_luy, diem_kiem_hom_nay, ngay_cap_nhat_cuoi, thoi_diem_dat_diem
    ) VALUES (
      NEW.id,
      v_ma,
      COALESCE(NEW.raw_user_meta_data->>'pin', '1234'),
      v_ho_ten,
      v_ten_hien_thi,
      v_lop,
      'student',
      50, 0, 0, CURRENT_DATE, NOW()
    )
    ON CONFLICT (id) DO UPDATE SET
      ma_dang_nhap = EXCLUDED.ma_dang_nhap,
      pin = EXCLUDED.pin,
      ho_ten = EXCLUDED.ho_ten,
      ten_hien_thi = EXCLUDED.ten_hien_thi,
      lop = EXCLUDED.lop;

    INSERT INTO public.point_logs (user_id, loai, xp, xu, ly_do)
    VALUES (NEW.id, 'thuong_nong', 0, 50, 'Quà chào mừng thành viên mới 🌱');
  END IF;

  RETURN NEW;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER SET search_path = public;

-- 6. Hàm RPC để Admin có thể dọn sạch dữ liệu học sinh thử nghiệm trực tiếp từ trang Quản trị (nếu cần)
CREATE OR REPLACE FUNCTION public.xoa_toan_bo_hoc_sinh()
RETURNS JSONB AS $$
DECLARE
  v_role VARCHAR;
BEGIN
  v_role := public.current_user_role();
  IF v_role IS NULL OR v_role <> 'admin' THEN
    RAISE EXCEPTION 'Chỉ Quản trị viên (Admin) mới có quyền làm sạch dữ liệu học sinh.';
  END IF;

  DELETE FROM public.redemptions;
  DELETE FROM public.point_logs;
  DELETE FROM public.game_sessions;
  DELETE FROM public.users WHERE vai_tro <> 'admin' AND ma_dang_nhap NOT IN ('ADMIN', 'ADMIN.PORTAL');

  DELETE FROM auth.identities
  WHERE user_id IN (
    SELECT id FROM auth.users
    WHERE email NOT IN ('admin@ecochibi.local', 'admin.portal@ecochibi.local')
  );

  DELETE FROM auth.users
  WHERE email NOT IN ('admin@ecochibi.local', 'admin.portal@ecochibi.local');

  RETURN jsonb_build_object('success', true);
END;
$$ LANGUAGE plpgsql SECURITY DEFINER SET search_path = public, auth;

REVOKE EXECUTE ON FUNCTION public.xoa_toan_bo_hoc_sinh() FROM PUBLIC, anon;
GRANT EXECUTE ON FUNCTION public.xoa_toan_bo_hoc_sinh() TO authenticated;

