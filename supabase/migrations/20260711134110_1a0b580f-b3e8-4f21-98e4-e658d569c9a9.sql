
-- Public profiles view should run as the caller
ALTER VIEW public.public_profiles SET (security_invoker = on);

-- Username → email (for sign-in by username)
CREATE OR REPLACE FUNCTION public.get_email_for_username(_username text)
RETURNS text LANGUAGE sql STABLE SECURITY DEFINER SET search_path = public, auth AS $$
  SELECT u.email::text FROM public.profiles p JOIN auth.users u ON u.id = p.id WHERE p.username = _username LIMIT 1
$$;
REVOKE ALL ON FUNCTION public.get_email_for_username(text) FROM PUBLIC;
GRANT EXECUTE ON FUNCTION public.get_email_for_username(text) TO anon, authenticated;

CREATE OR REPLACE FUNCTION public.is_username_available(_username text)
RETURNS boolean LANGUAGE sql STABLE SECURITY DEFINER SET search_path = public AS $$
  SELECT NOT EXISTS (SELECT 1 FROM public.profiles WHERE lower(username) = lower(_username))
$$;
REVOKE ALL ON FUNCTION public.is_username_available(text) FROM PUBLIC;
GRANT EXECUTE ON FUNCTION public.is_username_available(text) TO anon, authenticated;

-- Record today's activity for the current user
CREATE OR REPLACE FUNCTION public.record_my_activity()
RETURNS void LANGUAGE plpgsql SECURITY DEFINER SET search_path = public AS $$
BEGIN
  IF auth.uid() IS NULL THEN RETURN; END IF;
  INSERT INTO public.active_days (user_id, day) VALUES (auth.uid(), current_date)
  ON CONFLICT DO NOTHING;
END $$;
REVOKE ALL ON FUNCTION public.record_my_activity() FROM PUBLIC;
GRANT EXECUTE ON FUNCTION public.record_my_activity() TO authenticated;

-- Compose current profile + admin flag
CREATE OR REPLACE FUNCTION public.get_my_auth_state()
RETURNS TABLE (profile jsonb, is_admin boolean)
LANGUAGE sql STABLE SECURITY DEFINER SET search_path = public AS $$
  SELECT
    (SELECT to_jsonb(p) FROM public.profiles p WHERE p.id = auth.uid()) AS profile,
    public.has_role(auth.uid(), 'admin') AS is_admin
$$;
REVOKE ALL ON FUNCTION public.get_my_auth_state() FROM PUBLIC;
GRANT EXECUTE ON FUNCTION public.get_my_auth_state() TO authenticated;

-- Get any admin's id (for user→admin chat routing)
CREATE OR REPLACE FUNCTION public.get_any_admin_id()
RETURNS uuid LANGUAGE sql STABLE SECURITY DEFINER SET search_path = public AS $$
  SELECT user_id FROM public.user_roles WHERE role = 'admin' ORDER BY created_at LIMIT 1
$$;
REVOKE ALL ON FUNCTION public.get_any_admin_id() FROM PUBLIC;
GRANT EXECUTE ON FUNCTION public.get_any_admin_id() TO authenticated;

-- Admin overview stats
CREATE OR REPLACE FUNCTION public.get_admin_stats()
RETURNS jsonb LANGUAGE plpgsql STABLE SECURITY DEFINER SET search_path = public AS $$
DECLARE
  v_users bigint; v_research bigint; v_likes bigint; v_comments bigint;
  v_daily bigint; v_weekly bigint; v_monthly bigint;
  v_last7 jsonb;
BEGIN
  IF NOT public.has_role(auth.uid(),'admin') THEN
    RAISE EXCEPTION 'not authorized';
  END IF;
  SELECT count(*) INTO v_users FROM public.profiles;
  SELECT count(*) INTO v_research FROM public.research;
  SELECT count(*) INTO v_likes FROM public.likes;
  SELECT count(*) INTO v_comments FROM public.comments;
  SELECT count(DISTINCT user_id) INTO v_daily FROM public.active_days WHERE day = current_date;
  SELECT count(DISTINCT user_id) INTO v_weekly FROM public.active_days WHERE day >= current_date - INTERVAL '7 days';
  SELECT count(DISTINCT user_id) INTO v_monthly FROM public.active_days WHERE day >= current_date - INTERVAL '30 days';
  SELECT coalesce(jsonb_agg(jsonb_build_object('day', d.day::text, 'count', d.c) ORDER BY d.day), '[]'::jsonb)
    INTO v_last7
  FROM (
    SELECT day, count(DISTINCT user_id) AS c
    FROM public.active_days
    WHERE day >= current_date - INTERVAL '6 days'
    GROUP BY day
  ) d;
  RETURN jsonb_build_object(
    'users', v_users, 'research', v_research, 'likes', v_likes, 'comments', v_comments,
    'dailyActive', v_daily, 'weeklyActive', v_weekly, 'monthlyActive', v_monthly,
    'last7', v_last7
  );
END $$;
REVOKE ALL ON FUNCTION public.get_admin_stats() FROM PUBLIC;
GRANT EXECUTE ON FUNCTION public.get_admin_stats() TO authenticated;

-- Active users history by period
CREATE OR REPLACE FUNCTION public.get_active_history(period text)
RETURNS TABLE(bucket text, "start" timestamptz, count bigint)
LANGUAGE plpgsql STABLE SECURITY DEFINER SET search_path = public AS $$
BEGIN
  IF NOT public.has_role(auth.uid(),'admin') THEN
    RAISE EXCEPTION 'not authorized';
  END IF;
  IF period = 'daily' THEN
    RETURN QUERY SELECT day::text, day::timestamptz, count(DISTINCT user_id)
      FROM public.active_days GROUP BY day ORDER BY day DESC LIMIT 90;
  ELSIF period = 'weekly' THEN
    RETURN QUERY SELECT to_char(date_trunc('week', day), 'IYYY-"W"IW'),
      date_trunc('week', day)::timestamptz, count(DISTINCT user_id)
      FROM public.active_days GROUP BY 1,2 ORDER BY 2 DESC LIMIT 52;
  ELSE
    RETURN QUERY SELECT to_char(date_trunc('month', day), 'YYYY-MM'),
      date_trunc('month', day)::timestamptz, count(DISTINCT user_id)
      FROM public.active_days GROUP BY 1,2 ORDER BY 2 DESC LIMIT 24;
  END IF;
END $$;
REVOKE ALL ON FUNCTION public.get_active_history(text) FROM PUBLIC;
GRANT EXECUTE ON FUNCTION public.get_active_history(text) TO authenticated;

-- Admin: list purchases by status
CREATE OR REPLACE FUNCTION public.admin_list_purchases(_status text)
RETURNS TABLE (
  id uuid, status text, receipt_url text, bank_name text, account_name text,
  created_at timestamptz, user_id uuid, course_id uuid, course_title text, course_price numeric,
  first_name text, last_name text, username text, email text
)
LANGUAGE plpgsql STABLE SECURITY DEFINER SET search_path = public, auth AS $$
BEGIN
  IF NOT public.has_role(auth.uid(),'admin') THEN
    RAISE EXCEPTION 'not authorized';
  END IF;
  RETURN QUERY
  SELECT p.id, p.status, p.receipt_url, p.bank_name, p.account_name, p.created_at,
         p.user_id, p.course_id, c.title, c.price,
         pr.first_name, pr.last_name, pr.username, u.email::text
  FROM public.course_purchases p
  LEFT JOIN public.courses c ON c.id = p.course_id
  LEFT JOIN public.profiles pr ON pr.id = p.user_id
  LEFT JOIN auth.users u ON u.id = p.user_id
  WHERE p.status = _status
  ORDER BY p.created_at DESC;
END $$;
REVOKE ALL ON FUNCTION public.admin_list_purchases(text) FROM PUBLIC;
GRANT EXECUTE ON FUNCTION public.admin_list_purchases(text) TO authenticated;

-- Admin: approve/reject/mark scam
CREATE OR REPLACE FUNCTION public.admin_review_purchase(_purchase_id uuid, _action text)
RETURNS void LANGUAGE plpgsql SECURITY DEFINER SET search_path = public AS $$
DECLARE v_user uuid;
BEGIN
  IF NOT public.has_role(auth.uid(),'admin') THEN
    RAISE EXCEPTION 'not authorized';
  END IF;
  IF _action NOT IN ('approved','rejected','scam') THEN
    RAISE EXCEPTION 'invalid action';
  END IF;
  UPDATE public.course_purchases
    SET status = _action, reviewed_at = now(), reviewed_by = auth.uid()
    WHERE id = _purchase_id
    RETURNING user_id INTO v_user;
  IF _action = 'scam' AND v_user IS NOT NULL THEN
    UPDATE public.profiles SET is_blocked = true WHERE id = v_user;
  END IF;
END $$;
REVOKE ALL ON FUNCTION public.admin_review_purchase(uuid, text) FROM PUBLIC;
GRANT EXECUTE ON FUNCTION public.admin_review_purchase(uuid, text) TO authenticated;

-- Admin: user detail (profile, likes count, comments)
CREATE OR REPLACE FUNCTION public.get_user_detail(_user_id uuid)
RETURNS jsonb LANGUAGE plpgsql STABLE SECURITY DEFINER SET search_path = public AS $$
DECLARE v_profile jsonb; v_likes bigint; v_comments jsonb; v_comment_count bigint;
BEGIN
  IF NOT public.has_role(auth.uid(),'admin') THEN
    RAISE EXCEPTION 'not authorized';
  END IF;
  SELECT to_jsonb(p) INTO v_profile FROM public.profiles p WHERE p.id = _user_id;
  SELECT count(*) INTO v_likes FROM public.likes WHERE user_id = _user_id;
  SELECT count(*) INTO v_comment_count FROM public.comments WHERE user_id = _user_id;
  SELECT coalesce(jsonb_agg(jsonb_build_object(
      'id', c.id, 'content', c.content, 'created_at', c.created_at,
      'research_id', c.research_id, 'research_title', r.title
    ) ORDER BY c.created_at DESC), '[]'::jsonb)
    INTO v_comments
    FROM public.comments c
    LEFT JOIN public.research r ON r.id = c.research_id
    WHERE c.user_id = _user_id;
  RETURN jsonb_build_object(
    'profile', v_profile,
    'totalLikes', v_likes,
    'totalComments', v_comment_count,
    'comments', v_comments
  );
END $$;
REVOKE ALL ON FUNCTION public.get_user_detail(uuid) FROM PUBLIC;
GRANT EXECUTE ON FUNCTION public.get_user_detail(uuid) TO authenticated;

-- Tighten has_role grants
REVOKE ALL ON FUNCTION public.has_role(uuid, public.app_role) FROM PUBLIC;
GRANT EXECUTE ON FUNCTION public.has_role(uuid, public.app_role) TO authenticated;

-- Seed default org row
INSERT INTO public.organisation_settings (id, org_name, tagline, primary_color)
VALUES (1, 'Gizmo Office Plus', '//CODEBREAKERS', '#3b82f6')
ON CONFLICT (id) DO NOTHING;
