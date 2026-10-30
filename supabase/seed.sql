-- ==============================================================================
-- ECO CHIBI — SEED DATA (PRODUCTION READY)
-- Khởi tạo ban đầu: Tài khoản Ban Quản Trị / Tổng Phụ Trách & Giáo viên
-- Chạy tệp này trong Supabase SQL Editor sau khi đã chạy Schema, Policies & Functions.
-- ==============================================================================

-- 1. KHO QUÀ TẶNG:
-- Để trống để Thầy/Cô nhà trường tự thêm quà thực tế từ Cổng Giáo viên (/giao-vien/kho-qua)
-- (Không nạp sẵn quà mẫu)

-- ==============================================================================
-- 2. HƯỚNG DẪN TẠO TÀI KHOẢN TRÊN SUPABASE AUTH
--
-- Mỗi tài khoản tương ứng email: <ma_dang_nhap>@ecochibi.local
-- Mật khẩu bảo mật Admin: EcoChibi@2026
-- Mật khẩu Giáo viên mẫu: 1234
-- ==============================================================================

-- Helper function tạo tài khoản khởi đầu (Auth + Profile)
CREATE OR REPLACE FUNCTION public.tao_tai_khoan_demo(
  p_ma VARCHAR,
  p_pin VARCHAR,
  p_ho_ten VARCHAR,
  p_lop VARCHAR,
  p_vai_tro VARCHAR,
  p_xu INT DEFAULT 0,
  p_xp INT DEFAULT 0
)
RETURNS UUID AS $$
DECLARE
  v_uid UUID;
  v_email VARCHAR := LOWER(p_ma) || '@ecochibi.local';
  v_pwd VARCHAR := CASE WHEN LENGTH(p_pin) >= 6 THEN p_pin ELSE 'eco-' || p_pin END;
  v_parts TEXT[];
  v_ten_rut_gon VARCHAR;
BEGIN
  -- Kiểm tra đã tồn tại trong public.users chưa
  SELECT id INTO v_uid FROM public.users WHERE ma_dang_nhap = UPPER(p_ma);
  IF v_uid IS NOT NULL THEN
    RETURN v_uid;
  END IF;

  -- Sinh UUID mới cho user
  v_uid := gen_random_uuid();

  -- Thêm vào auth.users (Supabase Auth)
  INSERT INTO auth.users (
    instance_id,
    id,
    aud,
    role,
    email,
    encrypted_password,
    email_confirmed_at,
    raw_app_meta_data,
    raw_user_meta_data,
    created_at,
    updated_at
  ) VALUES (
    '00000000-0000-0000-0000-000000000000',
    v_uid,
    'authenticated',
    'authenticated',
    v_email,
    crypt(v_pwd, gen_salt('bf')),
    NOW(),
    '{"provider":"email","providers":["email"]}',
    jsonb_build_object('ho_ten', p_ho_ten, 'ma', UPPER(p_ma)),
    NOW(),
    NOW()
  );

  -- Tính tên hiển thị rút gọn
  v_parts := regexp_split_to_array(TRIM(p_ho_ten), '\s+');
  IF array_length(v_parts, 1) >= 2 THEN
    v_ten_rut_gon := array_to_string(v_parts[2:array_length(v_parts, 1)], ' ') || ' ' || SUBSTRING(v_parts[1] FROM 1 FOR 1) || '.';
  ELSE
    v_ten_rut_gon := p_ho_ten;
  END IF;

  -- Thêm vào public.users
  INSERT INTO public.users (
    id,
    ma_dang_nhap,
    ho_ten,
    ten_hien_thi,
    lop,
    vai_tro,
    diem_hien_co,
    tong_diem_tich_luy,
    diem_kiem_hom_nay,
    ngay_cap_nhat_cuoi,
    thoi_diem_dat_diem
  ) VALUES (
    v_uid,
    UPPER(p_ma),
    TRIM(p_ho_ten),
    v_ten_rut_gon,
    p_lop,
    p_vai_tro,
    p_xu,
    p_xp,
    0,
    CURRENT_DATE,
    NOW()
  );

  RETURN v_uid;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

-- Kích hoạt tài khoản khởi tạo:
-- Tài khoản Admin (Mật khẩu: admin)
SELECT public.tao_tai_khoan_demo('ADMIN', 'admin', 'Admin', 'Toàn trường', 'admin', 0, 0);

-- Kho quà mẫu khởi tạo:
INSERT INTO public.rewards (ten_qua, hinh_anh, gia_xu, so_luong_ton, dang_hoat_dong, mo_ta)
SELECT * FROM (VALUES
  ('Bút chì mầm cây', '/assets/rewards/pencil.jpg', 40, 25, true, 'Viết hết bút có thể cắm xuống đất để trồng thành cây xanh.'),
  ('Sổ tay giấy tái chế', '/assets/rewards/notebook.jpg', 80, 15, true, 'Sổ tay bìa kraft thân thiện với môi trường.'),
  ('Túi vải Canvas Sống Xanh', '/assets/rewards/bag.jpg', 150, 10, true, 'Túi vải bền đẹp thay thế túi nilon khi đi học, đi chợ.'),
  ('Bình nước cá nhân Eco', '/assets/rewards/bottle.jpg', 220, 8, true, 'Bình nước gọn nhẹ giúp hạn chế rác thải chai nhựa dùng một lần.')
) AS v(ten_qua, hinh_anh, gia_xu, so_luong_ton, dang_hoat_dong, mo_ta)
WHERE NOT EXISTS (SELECT 1 FROM public.rewards LIMIT 1);
