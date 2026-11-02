-- ==============================================================================
-- ECO CHIBI — STORED PROCEDURES / RPC FUNCTIONS
-- Chạy với đặc quyền SECURITY DEFINER để thực thi giao dịch an toàn
-- ==============================================================================

-- ------------------------------------------------------------------------------
-- 1. BAT_DAU_GAME: Cấp phiên chơi mới
-- ------------------------------------------------------------------------------
CREATE OR REPLACE FUNCTION public.bat_dau_game(p_game VARCHAR)
RETURNS JSONB AS $$
DECLARE
  v_session_id UUID;
BEGIN
  IF auth.uid() IS NULL THEN
    RAISE EXCEPTION 'Vui lòng đăng nhập trước khi chơi.';
  END IF;

  INSERT INTO public.game_sessions (user_id, game, bat_dau)
  VALUES (auth.uid(), p_game, NOW())
  RETURNING id INTO v_session_id;

  RETURN jsonb_build_object('id', v_session_id);
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

-- ------------------------------------------------------------------------------
-- 2. NOP_KET_QUA_GAME: Kiểm tra chống gian lận & cộng điểm
-- ------------------------------------------------------------------------------
CREATE OR REPLACE FUNCTION public.nop_ket_qua_game(p_session_id UUID, p_so_cau_dung INT)
RETURNS JSONB AS $$
DECLARE
  v_session RECORD;
  v_user RECORD;
  v_duration_sec INT;
  v_today DATE := (CURRENT_TIMESTAMP AT TIME ZONE 'Asia/Ho_Chi_Minh')::date;
  v_base INT;
  v_con_lai INT;
  v_earned INT;
  v_level_before INT;
  v_level_after INT;
  v_max_count INT := 60;
BEGIN
  -- Khóa dòng phiên chơi
  SELECT * INTO v_session FROM public.game_sessions WHERE id = p_session_id FOR UPDATE;
  IF NOT FOUND THEN
    RAISE EXCEPTION 'Không tìm thấy lượt chơi.';
  END IF;
  IF v_session.user_id <> auth.uid() THEN
    RAISE EXCEPTION 'Bạn không có quyền nộp kết quả lượt chơi này.';
  END IF;
  IF v_session.ket_thuc IS NOT NULL THEN
    RAISE EXCEPTION 'Lượt chơi này đã được tính điểm rồi.';
  END IF;

  -- Kiểm tra thời gian chơi (tối thiểu 10s, tối đa 5 phút)
  v_duration_sec := EXTRACT(EPOCH FROM (NOW() - v_session.bat_dau))::INT;
  IF v_session.game = 'save_energy' THEN
    v_max_count := 80;
  END IF;

  IF p_so_cau_dung < 0 OR p_so_cau_dung > v_max_count OR v_duration_sec < 10 OR v_duration_sec > 300 THEN
    UPDATE public.game_sessions SET ket_thuc = NOW(), so_cau_dung = p_so_cau_dung WHERE id = p_session_id;
    RAISE EXCEPTION 'Kết quả lượt chơi không hợp lệ nên không được tính điểm.';
  END IF;

  UPDATE public.game_sessions SET ket_thuc = NOW(), so_cau_dung = p_so_cau_dung WHERE id = p_session_id;

  -- Khóa dòng người dùng để cập nhật điểm an toàn
  SELECT * INTO v_user FROM public.users WHERE id = auth.uid() FOR UPDATE;
  
  -- Reset giới hạn ngày nếu bước sang ngày mới
  IF v_user.ngay_cap_nhat_cuoi <> v_today THEN
    v_user.diem_kiem_hom_nay := 0;
    v_user.ngay_cap_nhat_cuoi := v_today;
  END IF;

  v_base := LEAST(p_so_cau_dung, 10);
  v_con_lai := GREATEST(0, 30 - v_user.diem_kiem_hom_nay);
  v_earned := LEAST(v_base, v_con_lai);

  v_level_before := CASE
    WHEN v_user.tong_diem_tich_luy >= 601 THEN 4
    WHEN v_user.tong_diem_tich_luy >= 301 THEN 3
    WHEN v_user.tong_diem_tich_luy >= 101 THEN 2
    ELSE 1
  END;

  IF v_earned > 0 THEN
    UPDATE public.users SET
      tong_diem_tich_luy = tong_diem_tich_luy + v_earned,
      diem_hien_co = diem_hien_co + v_earned,
      diem_kiem_hom_nay = v_user.diem_kiem_hom_nay + v_earned,
      ngay_cap_nhat_cuoi = v_today,
      thoi_diem_dat_diem = NOW()
    WHERE id = auth.uid();

    INSERT INTO public.point_logs (user_id, loai, xp, xu, tham_chieu_id, ly_do)
    VALUES (auth.uid(), 'game', v_earned, v_earned, p_session_id, 'Chơi mini-game');
  END IF;

  v_level_after := CASE
    WHEN (v_user.tong_diem_tich_luy + v_earned) >= 601 THEN 4
    WHEN (v_user.tong_diem_tich_luy + v_earned) >= 301 THEN 3
    WHEN (v_user.tong_diem_tich_luy + v_earned) >= 101 THEN 2
    ELSE 1
  END;

  RETURN jsonb_build_object(
    'earned', v_earned,
    'base', v_base,
    'roundCapped', p_so_cau_dung > 10,
    'dailyCapped', v_earned < v_base,
    'levelUp', v_level_after > v_level_before
  );
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

-- ------------------------------------------------------------------------------
-- 3. DOI_QUA: Transaction đổi quà an toàn tuyệt đối
-- ------------------------------------------------------------------------------
CREATE OR REPLACE FUNCTION public.doi_qua(p_reward_id UUID)
RETURNS JSONB AS $$
DECLARE
  v_reward RECORD;
  v_user RECORD;
  v_code VARCHAR(16);
  v_redemption_id UUID;
BEGIN
  IF auth.uid() IS NULL THEN
    RAISE EXCEPTION 'Vui lòng đăng nhập để đổi quà.';
  END IF;

  -- Khóa dòng món quà
  SELECT * INTO v_reward FROM public.rewards WHERE id = p_reward_id FOR UPDATE;
  IF NOT FOUND OR NOT v_reward.dang_hoat_dong THEN
    RAISE EXCEPTION 'Món quà này đang tạm ẩn.';
  END IF;
  IF v_reward.so_luong_ton <= 0 THEN
    RAISE EXCEPTION 'Món quà này vừa hết mất rồi!';
  END IF;

  -- Khóa ví học sinh
  SELECT * INTO v_user FROM public.users WHERE id = auth.uid() FOR UPDATE;
  IF v_user.diem_hien_co < v_reward.gia_xu THEN
    RAISE EXCEPTION 'Em còn thiếu Xu Xanh để đổi món quà này.';
  END IF;

  -- Sinh mã nhận quà duy nhất dạng GX-XXXX
  LOOP
    v_code := 'GX-' || LPAD((FLOOR(RANDOM() * 9000) + 1000)::TEXT, 4, '0');
    EXIT WHEN NOT EXISTS (SELECT 1 FROM public.redemptions WHERE ma_nhan_qua = v_code);
  END LOOP;

  -- Trừ tồn kho và trừ xu
  UPDATE public.rewards SET so_luong_ton = so_luong_ton - 1 WHERE id = p_reward_id;
  UPDATE public.users SET diem_hien_co = diem_hien_co - v_reward.gia_xu WHERE id = auth.uid();

  -- Tạo đơn nhận quà
  INSERT INTO public.redemptions (ma_nhan_qua, user_id, reward_id, gia_xu_luc_doi, trang_thai)
  VALUES (v_code, auth.uid(), p_reward_id, v_reward.gia_xu, 'pending')
  RETURNING id INTO v_redemption_id;

  -- Ghi log
  INSERT INTO public.point_logs (user_id, loai, xp, xu, tham_chieu_id, ly_do)
  VALUES (auth.uid(), 'doi_qua', 0, -v_reward.gia_xu, v_redemption_id, 'Đổi quà: ' || v_reward.ten_qua);

  RETURN jsonb_build_object(
    'redemption_id', v_redemption_id,
    'ma_nhan_qua', v_code,
    'gia_xu', v_reward.gia_xu
  );
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

-- ------------------------------------------------------------------------------
-- 4. XAC_NHAN_PHAT_QUA: Giáo viên duyệt trao quà (hỗ trợ cả ID đơn hoặc mã GX-XXXX)
-- ------------------------------------------------------------------------------
DROP FUNCTION IF EXISTS public.xac_nhan_phat_qua(UUID);
CREATE OR REPLACE FUNCTION public.xac_nhan_phat_qua(p_redemption_id TEXT)
RETURNS JSONB AS $$
DECLARE
  v_red RECORD;
  v_student RECORD;
  v_staff RECORD;
BEGIN
  SELECT * INTO v_staff FROM public.users WHERE id = auth.uid();
  IF v_staff.vai_tro NOT IN ('teacher', 'admin') THEN
    RAISE EXCEPTION 'Chỉ thầy cô hoặc ban phụ trách mới có quyền duyệt quà.';
  END IF;

  SELECT * INTO v_red FROM public.redemptions
  WHERE id::text = p_redemption_id OR ma_nhan_qua = UPPER(TRIM(p_redemption_id))
  FOR UPDATE;
  IF NOT FOUND THEN
    RAISE EXCEPTION 'Không tìm thấy đơn nhận quà.';
  END IF;
  IF v_red.trang_thai = 'completed' THEN
    RAISE EXCEPTION 'Món quà này đã được phát rồi.';
  END IF;
  IF v_red.trang_thai = 'cancelled' THEN
    RAISE EXCEPTION 'Đơn đổi quà này đã bị hủy trước đó.';
  END IF;

  SELECT * INTO v_student FROM public.users WHERE id = v_red.user_id;
  IF v_staff.vai_tro = 'teacher' AND v_student.lop <> v_staff.lop THEN
    RAISE EXCEPTION 'Bạn chỉ có quyền duyệt quà cho học sinh lớp %.', v_staff.lop;
  END IF;

  UPDATE public.redemptions SET
    trang_thai = 'completed',
    ngay_nhan = NOW(),
    nguoi_duyet = auth.uid()
  WHERE id = v_red.id;

  RETURN jsonb_build_object('success', true);
END;
$$ LANGUAGE plpgsql SECURITY DEFINER SET search_path = public;

-- ------------------------------------------------------------------------------
-- 5. HUY_DOI_QUA: Hủy đơn & hoàn Xu về ví học sinh, hoàn lại kho
-- ------------------------------------------------------------------------------
CREATE OR REPLACE FUNCTION public.huy_doi_qua(p_redemption_id UUID, p_ly_do TEXT)
RETURNS JSONB AS $$
DECLARE
  v_red RECORD;
  v_student RECORD;
  v_staff RECORD;
  v_reward RECORD;
BEGIN
  SELECT * INTO v_staff FROM public.users WHERE id = auth.uid();
  IF v_staff.vai_tro NOT IN ('teacher', 'admin') THEN
    RAISE EXCEPTION 'Chỉ thầy cô hoặc ban phụ trách mới có quyền hủy đơn quà.';
  END IF;

  SELECT * INTO v_red FROM public.redemptions WHERE id = p_redemption_id FOR UPDATE;
  IF NOT FOUND THEN
    RAISE EXCEPTION 'Không tìm thấy đơn đổi quà.';
  END IF;
  IF v_red.trang_thai <> 'pending' THEN
    RAISE EXCEPTION 'Chỉ có thể hủy đơn quà đang ở trạng thái Chờ nhận.';
  END IF;

  SELECT * INTO v_student FROM public.users WHERE id = v_red.user_id FOR UPDATE;
  IF v_staff.vai_tro = 'teacher' AND v_student.lop <> v_staff.lop THEN
    RAISE EXCEPTION 'Bạn chỉ có quyền thao tác học sinh lớp %.', v_staff.lop;
  END IF;

  SELECT * INTO v_reward FROM public.rewards WHERE id = v_red.reward_id FOR UPDATE;

  -- Hoàn Xu cho học sinh
  UPDATE public.users SET diem_hien_co = diem_hien_co + v_red.gia_xu_luc_doi WHERE id = v_student.id;

  -- Hoàn lại tồn kho
  IF FOUND THEN
    UPDATE public.rewards SET so_luong_ton = so_luong_ton + 1 WHERE id = v_reward.id;
  END IF;

  -- Cập nhật đơn
  UPDATE public.redemptions SET
    trang_thai = 'cancelled',
    ngay_nhan = NOW(),
    nguoi_duyet = auth.uid()
  WHERE id = p_redemption_id;

  -- Ghi log
  INSERT INTO public.point_logs (user_id, loai, xp, xu, tham_chieu_id, ly_do, nguoi_tao)
  VALUES (v_student.id, 'hoan_xu', 0, v_red.gia_xu_luc_doi, p_redemption_id, 'Hoàn Xu quà: ' || COALESCE(p_ly_do, 'Hủy theo yêu cầu'), auth.uid());

  RETURN jsonb_build_object('success', true);
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

-- ------------------------------------------------------------------------------
-- 6. CONG_DIEM_THUONG: Thưởng nóng điểm xanh ngoài đời thực
-- ------------------------------------------------------------------------------
CREATE OR REPLACE FUNCTION public.cong_diem_thuong(p_student_id UUID, p_diem INT, p_ly_do TEXT)
RETURNS JSONB AS $$
DECLARE
  v_staff RECORD;
  v_student RECORD;
BEGIN
  SELECT * INTO v_staff FROM public.users WHERE id = auth.uid();
  IF v_staff.vai_tro NOT IN ('teacher', 'admin') THEN
    RAISE EXCEPTION 'Chỉ thầy cô hoặc ban phụ trách mới có quyền cộng điểm thưởng.';
  END IF;

  IF p_diem <= 0 OR p_diem > 50 THEN
    RAISE EXCEPTION 'Điểm thưởng phải từ 1 đến 50 điểm.';
  END IF;

  IF p_ly_do IS NULL OR TRIM(p_ly_do) = '' THEN
    RAISE EXCEPTION 'Vui lòng nhập lý do thưởng điểm.';
  END IF;

  SELECT * INTO v_student FROM public.users WHERE id = p_student_id FOR UPDATE;
  IF NOT FOUND OR v_student.vai_tro <> 'student' THEN
    RAISE EXCEPTION 'Không tìm thấy học sinh.';
  END IF;

  IF v_staff.vai_tro = 'teacher' AND v_student.lop <> v_staff.lop THEN
    RAISE EXCEPTION 'Bạn chỉ có quyền cộng điểm cho học sinh lớp %.', v_staff.lop;
  END IF;

  UPDATE public.users SET
    diem_hien_co = diem_hien_co + p_diem,
    tong_diem_tich_luy = tong_diem_tich_luy + p_diem,
    thoi_diem_dat_diem = NOW()
  WHERE id = p_student_id;

  INSERT INTO public.point_logs (user_id, loai, xp, xu, ly_do, nguoi_tao)
  VALUES (p_student_id, 'thuong_nong', p_diem, p_diem, TRIM(p_ly_do), auth.uid());

  RETURN jsonb_build_object('success', true);
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

-- ------------------------------------------------------------------------------
-- 7. NOP_NHIEM_VU: Nộp nhiệm vụ Bước Chân Xanh (tự khai báo hoặc đố vui)
-- ------------------------------------------------------------------------------
CREATE OR REPLACE FUNCTION public.nop_nhiem_vu(
  p_loai VARCHAR,
  p_tra_loi_bool BOOLEAN DEFAULT NULL,
  p_tra_loi_int INT DEFAULT NULL
)
RETURNS JSONB AS $$
DECLARE
  v_user RECORD;
  v_today DATE := (CURRENT_TIMESTAMP AT TIME ZONE 'Asia/Ho_Chi_Minh')::date;
  v_con_lai INT;
  v_earned INT := 0;
  v_reward INT := 0;
  v_level_before INT;
  v_level_after INT;
  v_dung BOOLEAN := false;
BEGIN
  IF auth.uid() IS NULL THEN
    RAISE EXCEPTION 'Vui lòng đăng nhập để nộp nhiệm vụ.';
  END IF;

  SELECT * INTO v_user FROM public.users WHERE id = auth.uid() FOR UPDATE;
  IF NOT FOUND THEN
    RAISE EXCEPTION 'Không tìm thấy người dùng.';
  END IF;

  -- Reset điểm ngày nếu qua ngày mới
  IF v_user.ngay_cap_nhat_cuoi <> v_today THEN
    v_user.diem_kiem_hom_nay := 0;
    v_user.ngay_cap_nhat_cuoi := v_today;
    v_user.nv_ngay := v_today;
    v_user.nv_tu_khai := NULL;
    v_user.nv_do_vui := NULL;
  END IF;

  v_level_before := CASE
    WHEN v_user.tong_diem_tich_luy >= 601 THEN 4
    WHEN v_user.tong_diem_tich_luy >= 301 THEN 3
    WHEN v_user.tong_diem_tich_luy >= 101 THEN 2
    ELSE 1
  END;

  v_con_lai := GREATEST(0, 30 - v_user.diem_kiem_hom_nay);

  IF p_loai = 'tu_khai' THEN
    IF v_user.nv_tu_khai IS NOT NULL AND v_user.nv_ngay = v_today THEN
      RAISE EXCEPTION 'Hôm nay em đã trả lời câu này rồi, mai quay lại nhé!';
    END IF;
    IF p_tra_loi_bool IS NULL THEN
      RAISE EXCEPTION 'Câu trả lời không hợp lệ.';
    END IF;

    v_reward := 2;
    v_earned := LEAST(v_reward, v_con_lai);

    UPDATE public.users SET
      nv_ngay = v_today,
      nv_tu_khai = p_tra_loi_bool,
      tong_diem_tich_luy = tong_diem_tich_luy + v_earned,
      diem_hien_co = diem_hien_co + v_earned,
      diem_kiem_hom_nay = v_user.diem_kiem_hom_nay + v_earned,
      ngay_cap_nhat_cuoi = v_today,
      thoi_diem_dat_diem = NOW()
    WHERE id = auth.uid();

    IF v_earned > 0 THEN
      INSERT INTO public.point_logs (user_id, loai, xp, xu, ly_do)
      VALUES (auth.uid(), 'quiz', v_earned, v_earned, 'Nhiệm vụ tự khai báo');
    END IF;

    v_level_after := CASE
      WHEN (v_user.tong_diem_tich_luy + v_earned) >= 601 THEN 4
      WHEN (v_user.tong_diem_tich_luy + v_earned) >= 301 THEN 3
      WHEN (v_user.tong_diem_tich_luy + v_earned) >= 101 THEN 2
      ELSE 1
    END;

    RETURN jsonb_build_object(
      'earned', v_earned,
      'dailyCapped', v_earned < v_reward,
      'levelUp', v_level_after > v_level_before
    );

  ELSIF p_loai = 'do_vui' THEN
    IF v_user.nv_do_vui IS NOT NULL AND v_user.nv_ngay = v_today THEN
      RAISE EXCEPTION 'Hôm nay em đã giải câu đố rồi, mai có câu mới nhé!';
    END IF;
    IF p_tra_loi_int IS NULL THEN
      RAISE EXCEPTION 'Câu trả lời không hợp lệ.';
    END IF;

    v_dung := COALESCE(p_tra_loi_bool, true);
    v_reward := CASE WHEN v_dung THEN 5 ELSE 0 END;
    v_earned := LEAST(v_reward, v_con_lai);

    UPDATE public.users SET
      nv_ngay = v_today,
      nv_do_vui = jsonb_build_object('chon', p_tra_loi_int, 'dung', v_dung),
      tong_diem_tich_luy = tong_diem_tich_luy + v_earned,
      diem_hien_co = diem_hien_co + v_earned,
      diem_kiem_hom_nay = v_user.diem_kiem_hom_nay + v_earned,
      ngay_cap_nhat_cuoi = v_today,
      thoi_diem_dat_diem = NOW()
    WHERE id = auth.uid();

    IF v_earned > 0 THEN
      INSERT INTO public.point_logs (user_id, loai, xp, xu, ly_do)
      VALUES (auth.uid(), 'quiz', v_earned, v_earned, 'Đố vui môi trường');
    END IF;

    v_level_after := CASE
      WHEN (v_user.tong_diem_tich_luy + v_earned) >= 601 THEN 4
      WHEN (v_user.tong_diem_tich_luy + v_earned) >= 301 THEN 3
      WHEN (v_user.tong_diem_tich_luy + v_earned) >= 101 THEN 2
      ELSE 1
    END;

    RETURN jsonb_build_object(
      'dung', v_dung,
      'earned', v_earned,
      'dailyCapped', v_earned < v_reward,
      'levelUp', v_level_after > v_level_before
    );

  ELSE
    RAISE EXCEPTION 'Loại nhiệm vụ không hợp lệ.';
  END IF;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

-- ------------------------------------------------------------------------------
-- 8. CAP_LAI_PIN: Giáo viên cấp lại PIN cho học sinh
-- ------------------------------------------------------------------------------
CREATE OR REPLACE FUNCTION public.cap_lai_pin(p_student_id UUID, p_new_pin VARCHAR)
RETURNS JSONB AS $$
DECLARE
  v_staff RECORD;
  v_student RECORD;
BEGIN
  SELECT * INTO v_staff FROM public.users WHERE id = auth.uid();
  IF v_staff.vai_tro NOT IN ('teacher', 'admin') THEN
    RAISE EXCEPTION 'Chỉ thầy cô hoặc ban phụ trách mới có quyền cấp lại PIN.';
  END IF;

  SELECT * INTO v_student FROM public.users WHERE id = p_student_id;
  IF NOT FOUND OR v_student.vai_tro <> 'student' THEN
    RAISE EXCEPTION 'Không tìm thấy học sinh.';
  END IF;

  IF v_staff.vai_tro = 'teacher' AND v_student.lop <> v_staff.lop THEN
    RAISE EXCEPTION 'Bạn chỉ có quyền thao tác học sinh lớp %.', v_staff.lop;
  END IF;

  UPDATE auth.users
  SET encrypted_password = crypt('eco-' || p_new_pin, gen_salt('bf'))
  WHERE id = p_student_id;

  RETURN jsonb_build_object('success', true, 'new_pin', p_new_pin);
END;
$$ LANGUAGE plpgsql SECURITY DEFINER SET search_path = public, extensions;

-- ------------------------------------------------------------------------------
-- 9. TAO_HOC_SINH_MOI: Admin/Giáo viên thêm học sinh mà không làm mất phiên đăng nhập
-- ------------------------------------------------------------------------------
CREATE OR REPLACE FUNCTION public.tao_hoc_sinh_moi(
  p_ho_ten TEXT,
  p_lop VARCHAR,
  p_pin VARCHAR DEFAULT '1234'
)
RETURNS JSONB AS $$
DECLARE
  v_staff RECORD;
  v_clean_lop VARCHAR;
  v_count INT;
  v_ma VARCHAR;
  v_email TEXT;
  v_password TEXT;
  v_uid UUID;
  v_parts TEXT[];
  v_ten_rut_gon TEXT;
BEGIN
  SELECT * INTO v_staff FROM public.users WHERE id = auth.uid();
  IF v_staff.vai_tro NOT IN ('teacher', 'admin') THEN
    RAISE EXCEPTION 'Chỉ thầy cô hoặc ban phụ trách mới có quyền thêm học sinh.';
  END IF;

  v_clean_lop := UPPER(REGEXP_REPLACE(TRIM(p_lop), '\s+', '', 'g'));
  IF v_staff.vai_tro = 'teacher' AND v_clean_lop <> v_staff.lop THEN
    RAISE EXCEPTION 'Giáo viên chỉ có quyền thêm học sinh vào lớp %.', v_staff.lop;
  END IF;

  SELECT COUNT(*) + 1 INTO v_count
  FROM public.users
  WHERE vai_tro = 'student' AND lop = v_clean_lop;

  LOOP
    v_ma := 'HS' || v_clean_lop || LPAD(v_count::TEXT, 2, '0');
    EXIT WHEN NOT EXISTS (SELECT 1 FROM public.users WHERE ma_dang_nhap = v_ma);
    v_count := v_count + 1;
  END LOOP;

  v_email := LOWER(v_ma) || '@ecochibi.local';
  v_password := 'eco-' || TRIM(p_pin);
  v_uid := gen_random_uuid();

  v_parts := regexp_split_to_array(TRIM(p_ho_ten), '\s+');
  IF array_length(v_parts, 1) >= 2 THEN
    v_ten_rut_gon := array_to_string(v_parts[2:array_length(v_parts, 1)], ' ') || ' ' || LEFT(v_parts[1], 1) || '.';
  ELSE
    v_ten_rut_gon := TRIM(p_ho_ten);
  END IF;

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
    crypt(v_password, gen_salt('bf')),
    NOW(), '', '', '', '',
    '{"provider":"email","providers":["email"]}'::jsonb,
    jsonb_build_object('ma_dang_nhap', v_ma, 'ho_ten', TRIM(p_ho_ten), 'ten_hien_thi', v_ten_rut_gon, 'lop', v_clean_lop),
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

  INSERT INTO public.users (
    id, ma_dang_nhap, ho_ten, ten_hien_thi, lop, vai_tro,
    diem_hien_co, tong_diem_tich_luy, diem_kiem_hom_nay, ngay_cap_nhat_cuoi, thoi_diem_dat_diem
  ) VALUES (
    v_uid, v_ma, TRIM(p_ho_ten), v_ten_rut_gon, v_clean_lop, 'student',
    50, 0, 0, CURRENT_DATE, NOW()
  )
  ON CONFLICT (id) DO NOTHING;

  INSERT INTO public.point_logs (user_id, loai, xp, xu, ly_do, nguoi_tao)
  VALUES (v_uid, 'thuong_nong', 0, 50, 'Quà chào mừng thành viên mới 🌱', auth.uid());

  RETURN jsonb_build_object(
    'id', v_uid,
    'ma_dang_nhap', v_ma,
    'ho_ten', TRIM(p_ho_ten),
    'ten_hien_thi', v_ten_rut_gon,
    'lop', v_clean_lop,
    'vai_tro', 'student',
    'diem_hien_co', 50,
    'tong_diem_tich_luy', 0
  );
END;
$$ LANGUAGE plpgsql SECURITY DEFINER SET search_path = public, extensions;

-- ------------------------------------------------------------------------------
-- 10. TRIGGER TỰ ĐỘNG KHỞI TẠO HỒ SƠ KHI HỌC SINH ĐĂNG KÝ QUA SUPABASE AUTH
-- ------------------------------------------------------------------------------
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
      id, ma_dang_nhap, ho_ten, ten_hien_thi, lop, vai_tro,
      diem_hien_co, tong_diem_tich_luy, diem_kiem_hom_nay, ngay_cap_nhat_cuoi, thoi_diem_dat_diem
    ) VALUES (
      NEW.id, v_ma, v_ho_ten, v_ten_hien_thi, v_lop, 'student',
      50, 0, 0, CURRENT_DATE, NOW()
    )
    ON CONFLICT (id) DO NOTHING;

    INSERT INTO public.point_logs (user_id, loai, xp, xu, ly_do)
    VALUES (NEW.id, 'thuong_nong', 0, 50, 'Quà chào mừng thành viên mới 🌱');
  END IF;

  RETURN NEW;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER SET search_path = public;

DROP TRIGGER IF EXISTS on_auth_user_created ON auth.users;
CREATE TRIGGER on_auth_user_created
  AFTER INSERT ON auth.users
  FOR EACH ROW EXECUTE FUNCTION public.handle_new_auth_user();

-- ------------------------------------------------------------------------------
-- 11. PHÂN QUYỀN THỰC THI RPC (CHỈ CHO PHÉP NGƯỜI DÙNG ĐÃ XÁC THỰC)
-- ------------------------------------------------------------------------------
REVOKE EXECUTE ON FUNCTION public.bat_dau_game(VARCHAR) FROM PUBLIC, anon;
GRANT EXECUTE ON FUNCTION public.bat_dau_game(VARCHAR) TO authenticated;

REVOKE EXECUTE ON FUNCTION public.nop_ket_qua_game(UUID, INT) FROM PUBLIC, anon;
GRANT EXECUTE ON FUNCTION public.nop_ket_qua_game(UUID, INT) TO authenticated;

REVOKE EXECUTE ON FUNCTION public.doi_qua(UUID) FROM PUBLIC, anon;
GRANT EXECUTE ON FUNCTION public.doi_qua(UUID) TO authenticated;

REVOKE EXECUTE ON FUNCTION public.xac_nhan_phat_qua(TEXT) FROM PUBLIC, anon;
GRANT EXECUTE ON FUNCTION public.xac_nhan_phat_qua(TEXT) TO authenticated;

REVOKE EXECUTE ON FUNCTION public.huy_doi_qua(UUID, TEXT) FROM PUBLIC, anon;
GRANT EXECUTE ON FUNCTION public.huy_doi_qua(UUID, TEXT) TO authenticated;

REVOKE EXECUTE ON FUNCTION public.cong_diem_thuong(UUID, INT, TEXT) FROM PUBLIC, anon;
GRANT EXECUTE ON FUNCTION public.cong_diem_thuong(UUID, INT, TEXT) TO authenticated;

REVOKE EXECUTE ON FUNCTION public.nop_nhiem_vu(VARCHAR, BOOLEAN, INT) FROM PUBLIC, anon;
GRANT EXECUTE ON FUNCTION public.nop_nhiem_vu(VARCHAR, BOOLEAN, INT) TO authenticated;

REVOKE EXECUTE ON FUNCTION public.cap_lai_pin(UUID, VARCHAR) FROM PUBLIC, anon;
GRANT EXECUTE ON FUNCTION public.cap_lai_pin(UUID, VARCHAR) TO authenticated;

REVOKE EXECUTE ON FUNCTION public.tao_hoc_sinh_moi(TEXT, VARCHAR, VARCHAR) FROM PUBLIC, anon;
GRANT EXECUTE ON FUNCTION public.tao_hoc_sinh_moi(TEXT, VARCHAR, VARCHAR) TO authenticated;


