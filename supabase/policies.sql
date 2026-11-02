-- ==============================================================================
-- ECO CHIBI — ROW LEVEL SECURITY (RLS) POLICIES & GRANTS (IDEMPOTENT)
-- ==============================================================================

-- Bật RLS trên toàn bộ các bảng
ALTER TABLE public.users ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.rewards ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.redemptions ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.point_logs ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.game_sessions ENABLE ROW LEVEL SECURITY;

-- Cấp quyền truy cập bảng và view cho role authenticated
GRANT USAGE ON SCHEMA public TO anon, authenticated;
GRANT SELECT, INSERT ON public.users TO authenticated;
GRANT SELECT, INSERT, UPDATE, DELETE ON public.rewards TO authenticated;
GRANT SELECT ON public.redemptions TO authenticated;
GRANT SELECT ON public.point_logs TO authenticated;
GRANT SELECT ON public.game_sessions TO authenticated;
GRANT SELECT ON public.v_leaderboard TO authenticated;

-- Helper function lấy vai trò người dùng hiện tại
CREATE OR REPLACE FUNCTION public.current_user_role()
RETURNS VARCHAR
LANGUAGE sql
STABLE
SECURITY DEFINER
SET search_path = public, extensions
AS $$
  SELECT COALESCE(
    (SELECT vai_tro FROM public.users WHERE id = (SELECT auth.uid())),
    CASE
      WHEN (SELECT auth.jwt() ->> 'email') IN ('admin@ecochibi.local', 'admin.portal@ecochibi.local') THEN 'admin'
      ELSE NULL
    END
  );
$$;

-- Helper function lấy lớp phụ trách của người dùng hiện tại
CREATE OR REPLACE FUNCTION public.current_user_lop()
RETURNS VARCHAR
LANGUAGE sql
STABLE
SECURITY DEFINER
SET search_path = public, extensions
AS $$
  SELECT lop FROM public.users WHERE id = (SELECT auth.uid());
$$;

REVOKE EXECUTE ON FUNCTION public.current_user_role() FROM PUBLIC, anon;
GRANT EXECUTE ON FUNCTION public.current_user_role() TO authenticated;
REVOKE EXECUTE ON FUNCTION public.current_user_lop() FROM PUBLIC, anon;
GRANT EXECUTE ON FUNCTION public.current_user_lop() TO authenticated;

-- ------------------------------------------------------------------------------
-- 1. POLICIES: USERS
-- ------------------------------------------------------------------------------
DROP POLICY IF EXISTS "Users read self" ON public.users;
CREATE POLICY "Users read self" ON public.users
  FOR SELECT TO authenticated
  USING ((SELECT auth.uid()) = id);

DROP POLICY IF EXISTS "Teacher read class students" ON public.users;
CREATE POLICY "Teacher read class students" ON public.users
  FOR SELECT TO authenticated
  USING (
    (SELECT public.current_user_role()) = 'teacher' AND lop = (SELECT public.current_user_lop())
  );

DROP POLICY IF EXISTS "Admin read all users" ON public.users;
CREATE POLICY "Admin read all users" ON public.users
  FOR SELECT TO authenticated
  USING ((SELECT public.current_user_role()) = 'admin');

DROP POLICY IF EXISTS "Insert user profile" ON public.users;
DROP POLICY IF EXISTS "Insert own student profile" ON public.users;
CREATE POLICY "Insert own student profile" ON public.users
  FOR INSERT TO authenticated
  WITH CHECK (
    (
      (SELECT auth.uid()) = id
      AND vai_tro = 'student'
      AND diem_hien_co <= 50
      AND tong_diem_tich_luy = 0
      AND diem_kiem_hom_nay = 0
    )
    OR (SELECT public.current_user_role()) IN ('teacher', 'admin')
  );

-- ------------------------------------------------------------------------------
-- 2. POLICIES: REWARDS
-- ------------------------------------------------------------------------------
DROP POLICY IF EXISTS "Read active rewards" ON public.rewards;
CREATE POLICY "Read active rewards" ON public.rewards
  FOR SELECT TO authenticated
  USING (dang_hoat_dong = true);

DROP POLICY IF EXISTS "Staff read all rewards" ON public.rewards;
CREATE POLICY "Staff read all rewards" ON public.rewards
  FOR SELECT TO authenticated
  USING ((SELECT public.current_user_role()) IN ('teacher', 'admin'));

DROP POLICY IF EXISTS "Staff manage rewards" ON public.rewards;
CREATE POLICY "Staff manage rewards" ON public.rewards
  FOR ALL TO authenticated
  USING ((SELECT public.current_user_role()) IN ('teacher', 'admin'))
  WITH CHECK ((SELECT public.current_user_role()) IN ('teacher', 'admin'));

-- ------------------------------------------------------------------------------
-- 3. POLICIES: REDEMPTIONS
-- ------------------------------------------------------------------------------
DROP POLICY IF EXISTS "Students read own redemptions" ON public.redemptions;
CREATE POLICY "Students read own redemptions" ON public.redemptions
  FOR SELECT TO authenticated
  USING ((SELECT auth.uid()) = user_id);

DROP POLICY IF EXISTS "Teacher read class redemptions" ON public.redemptions;
CREATE POLICY "Teacher read class redemptions" ON public.redemptions
  FOR SELECT TO authenticated
  USING (
    (SELECT public.current_user_role()) = 'teacher' AND
    EXISTS (
      SELECT 1 FROM public.users u
      WHERE u.id = redemptions.user_id AND u.lop = (SELECT public.current_user_lop())
    )
  );

DROP POLICY IF EXISTS "Admin read all redemptions" ON public.redemptions;
CREATE POLICY "Admin read all redemptions" ON public.redemptions
  FOR SELECT TO authenticated
  USING ((SELECT public.current_user_role()) = 'admin');

-- ------------------------------------------------------------------------------
-- 4. POLICIES: POINT_LOGS
-- ------------------------------------------------------------------------------
DROP POLICY IF EXISTS "Students read own point logs" ON public.point_logs;
CREATE POLICY "Students read own point logs" ON public.point_logs
  FOR SELECT TO authenticated
  USING ((SELECT auth.uid()) = user_id);

DROP POLICY IF EXISTS "Teacher read class point logs" ON public.point_logs;
CREATE POLICY "Teacher read class point logs" ON public.point_logs
  FOR SELECT TO authenticated
  USING (
    (SELECT public.current_user_role()) = 'teacher' AND
    EXISTS (
      SELECT 1 FROM public.users u
      WHERE u.id = point_logs.user_id AND u.lop = (SELECT public.current_user_lop())
    )
  );

DROP POLICY IF EXISTS "Admin read all point logs" ON public.point_logs;
CREATE POLICY "Admin read all point logs" ON public.point_logs
  FOR SELECT TO authenticated
  USING ((SELECT public.current_user_role()) = 'admin');

-- ------------------------------------------------------------------------------
-- 5. POLICIES: GAME_SESSIONS
-- ------------------------------------------------------------------------------
DROP POLICY IF EXISTS "Students read own game sessions" ON public.game_sessions;
CREATE POLICY "Students read own game sessions" ON public.game_sessions
  FOR SELECT TO authenticated
  USING ((SELECT auth.uid()) = user_id);
