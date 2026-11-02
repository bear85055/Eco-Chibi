-- ==============================================================================
-- ECO CHIBI — SEED DATA (PRODUCTION READY)
-- Khởi tạo ban đầu: Tài khoản Admin & Kho quà sinh thái mẫu
-- ==============================================================================

CREATE EXTENSION IF NOT EXISTS pgcrypto WITH SCHEMA extensions;

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
  -- Kiểm tra đã tồn tại trong public.users hoặc auth.users chưa
  SELECT id INTO v_uid FROM public.users WHERE ma_dang_nhap = UPPER(p_ma);
  IF v_uid IS NOT NULL THEN
    UPDATE auth.users
    SET encrypted_password = crypt(v_pwd, gen_salt('bf')),
        email_confirmed_at = COALESCE(email_confirmed_at, NOW()),
        confirmation_token = COALESCE(confirmation_token, ''),
        recovery_token = COALESCE(recovery_token, ''),
        email_change_token_new = COALESCE(email_change_token_new, ''),
        email_change = COALESCE(email_change, '')
    WHERE id = v_uid;
    RETURN v_uid;
  END IF;

  SELECT id INTO v_uid FROM auth.users WHERE email = v_email;
  IF v_uid IS NULL THEN
    v_uid := gen_random_uuid();

    INSERT INTO auth.users (
      instance_id, id, aud, role, email, encrypted_password,
      email_confirmed_at, confirmation_token, recovery_token, email_change_token_new, email_change,
      raw_app_meta_data, raw_user_meta_data, created_at, updated_at
    ) VALUES (
      '00000000-0000-0000-0000-000000000000',
      v_uid,
      'authenticated',
      'authenticated',
      v_email,
      crypt(v_pwd, gen_salt('bf')),
      NOW(), '', '', '', '',
      '{"provider":"email","providers":["email"]}'::jsonb,
      jsonb_build_object('ho_ten', p_ho_ten, 'ma', UPPER(p_ma)),
      NOW(),
      NOW()
    );

    INSERT INTO auth.identities (
      id, user_id, identity_data, provider, provider_id, last_sign_in_at, created_at, updated_at
    ) VALUES (
      gen_random_uuid(),
      v_uid,
      jsonb_build_object('sub', v_uid::text, 'email', v_email, 'email_verified', true, 'phone_verified', false),
      'email',
      v_uid::text,
      NOW(),
      NOW(),
      NOW()
    );
  END IF;

  v_parts := regexp_split_to_array(TRIM(p_ho_ten), '\s+');
  IF array_length(v_parts, 1) >= 2 THEN
    v_ten_rut_gon := array_to_string(v_parts[2:array_length(v_parts, 1)], ' ') || ' ' || SUBSTRING(v_parts[1] FROM 1 FOR 1) || '.';
  ELSE
    v_ten_rut_gon := p_ho_ten;
  END IF;

  INSERT INTO public.users (
    id, ma_dang_nhap, ho_ten, ten_hien_thi, lop, vai_tro,
    diem_hien_co, tong_diem_tich_luy, diem_kiem_hom_nay, ngay_cap_nhat_cuoi, thoi_diem_dat_diem
  ) VALUES (
    v_uid, UPPER(p_ma), TRIM(p_ho_ten), v_ten_rut_gon, p_lop, p_vai_tro,
    p_xu, p_xp, 0, CURRENT_DATE, NOW()
  )
  ON CONFLICT (id) DO UPDATE SET
    ma_dang_nhap = EXCLUDED.ma_dang_nhap,
    ho_ten = EXCLUDED.ho_ten,
    ten_hien_thi = EXCLUDED.ten_hien_thi,
    vai_tro = EXCLUDED.vai_tro;

  RETURN v_uid;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER SET search_path = public, extensions;

-- Khởi tạo tài khoản Admin (Mã: ADMIN / Mật khẩu: admin)
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
