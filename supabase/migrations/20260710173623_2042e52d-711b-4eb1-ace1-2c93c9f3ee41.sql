
CREATE TYPE public.app_role AS ENUM ('admin', 'user');

CREATE TABLE public.profiles (
  id UUID PRIMARY KEY REFERENCES auth.users(id) ON DELETE CASCADE,
  first_name TEXT NOT NULL DEFAULT '',
  last_name TEXT NOT NULL DEFAULT '',
  username TEXT NOT NULL UNIQUE,
  country TEXT NOT NULL DEFAULT '',
  phone TEXT,
  avatar_url TEXT,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT now()
);
GRANT SELECT, INSERT, UPDATE, DELETE ON public.profiles TO authenticated;
GRANT ALL ON public.profiles TO service_role;
ALTER TABLE public.profiles ENABLE ROW LEVEL SECURITY;

CREATE TABLE public.user_roles (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id UUID NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
  role public.app_role NOT NULL,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  UNIQUE (user_id, role)
);
GRANT SELECT ON public.user_roles TO authenticated;
GRANT ALL ON public.user_roles TO service_role;
ALTER TABLE public.user_roles ENABLE ROW LEVEL SECURITY;

CREATE OR REPLACE FUNCTION public.has_role(_user_id UUID, _role public.app_role)
RETURNS BOOLEAN LANGUAGE SQL STABLE SECURITY DEFINER SET search_path = public
AS $$ SELECT EXISTS (SELECT 1 FROM public.user_roles WHERE user_id = _user_id AND role = _role) $$;

CREATE POLICY "profiles_select_all_auth" ON public.profiles FOR SELECT TO authenticated USING (true);
CREATE POLICY "profiles_update_own" ON public.profiles FOR UPDATE TO authenticated USING (auth.uid() = id) WITH CHECK (auth.uid() = id);
CREATE POLICY "profiles_insert_own" ON public.profiles FOR INSERT TO authenticated WITH CHECK (auth.uid() = id);
CREATE POLICY "profiles_admin_all" ON public.profiles FOR ALL TO authenticated USING (public.has_role(auth.uid(), 'admin')) WITH CHECK (public.has_role(auth.uid(), 'admin'));

CREATE POLICY "user_roles_select_own" ON public.user_roles FOR SELECT TO authenticated USING (user_id = auth.uid() OR public.has_role(auth.uid(), 'admin'));

CREATE TABLE public.research (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  title TEXT NOT NULL,
  description TEXT NOT NULL DEFAULT '',
  header_image_url TEXT,
  research_type TEXT NOT NULL DEFAULT 'general',
  category TEXT NOT NULL DEFAULT '',
  section TEXT NOT NULL DEFAULT '',
  content_html TEXT NOT NULL DEFAULT '',
  author_id UUID REFERENCES auth.users(id) ON DELETE SET NULL,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT now()
);
GRANT SELECT ON public.research TO anon, authenticated;
GRANT INSERT, UPDATE, DELETE ON public.research TO authenticated;
GRANT ALL ON public.research TO service_role;
ALTER TABLE public.research ENABLE ROW LEVEL SECURITY;
CREATE POLICY "research_public_read" ON public.research FOR SELECT TO anon, authenticated USING (true);
CREATE POLICY "research_admin_write" ON public.research FOR ALL TO authenticated USING (public.has_role(auth.uid(), 'admin')) WITH CHECK (public.has_role(auth.uid(), 'admin'));

CREATE TABLE public.saved_research (
  user_id UUID NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
  research_id UUID NOT NULL REFERENCES public.research(id) ON DELETE CASCADE,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  PRIMARY KEY (user_id, research_id)
);
GRANT SELECT, INSERT, DELETE ON public.saved_research TO authenticated;
GRANT ALL ON public.saved_research TO service_role;
ALTER TABLE public.saved_research ENABLE ROW LEVEL SECURITY;
CREATE POLICY "saved_own" ON public.saved_research FOR ALL TO authenticated USING (auth.uid() = user_id) WITH CHECK (auth.uid() = user_id);

CREATE TABLE public.likes (
  user_id UUID NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
  research_id UUID NOT NULL REFERENCES public.research(id) ON DELETE CASCADE,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  PRIMARY KEY (user_id, research_id)
);
GRANT SELECT ON public.likes TO anon, authenticated;
GRANT INSERT, DELETE ON public.likes TO authenticated;
GRANT ALL ON public.likes TO service_role;
ALTER TABLE public.likes ENABLE ROW LEVEL SECURITY;
CREATE POLICY "likes_read_all" ON public.likes FOR SELECT TO anon, authenticated USING (true);
CREATE POLICY "likes_write_own" ON public.likes FOR ALL TO authenticated USING (auth.uid() = user_id) WITH CHECK (auth.uid() = user_id);

CREATE TABLE public.comments (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id UUID NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
  research_id UUID NOT NULL REFERENCES public.research(id) ON DELETE CASCADE,
  parent_id UUID REFERENCES public.comments(id) ON DELETE CASCADE,
  content TEXT NOT NULL,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now()
);
GRANT SELECT ON public.comments TO anon, authenticated;
GRANT INSERT, UPDATE, DELETE ON public.comments TO authenticated;
GRANT ALL ON public.comments TO service_role;
ALTER TABLE public.comments ENABLE ROW LEVEL SECURITY;
CREATE POLICY "comments_read_all" ON public.comments FOR SELECT TO anon, authenticated USING (true);
CREATE POLICY "comments_insert_own" ON public.comments FOR INSERT TO authenticated WITH CHECK (auth.uid() = user_id);
CREATE POLICY "comments_update_own" ON public.comments FOR UPDATE TO authenticated USING (auth.uid() = user_id);
CREATE POLICY "comments_delete_own_or_admin" ON public.comments FOR DELETE TO authenticated USING (auth.uid() = user_id OR public.has_role(auth.uid(), 'admin'));

CREATE TABLE public.comment_likes (
  user_id UUID NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
  comment_id UUID NOT NULL REFERENCES public.comments(id) ON DELETE CASCADE,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  PRIMARY KEY (user_id, comment_id)
);
GRANT SELECT ON public.comment_likes TO anon, authenticated;
GRANT INSERT, DELETE ON public.comment_likes TO authenticated;
GRANT ALL ON public.comment_likes TO service_role;
ALTER TABLE public.comment_likes ENABLE ROW LEVEL SECURITY;
CREATE POLICY "comment_likes_read" ON public.comment_likes FOR SELECT TO anon, authenticated USING (true);
CREATE POLICY "comment_likes_own" ON public.comment_likes FOR ALL TO authenticated USING (auth.uid() = user_id) WITH CHECK (auth.uid() = user_id);

CREATE TABLE public.messages (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  sender_id UUID NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
  recipient_id UUID NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
  content TEXT,
  file_url TEXT,
  file_type TEXT,
  file_name TEXT,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  read_at TIMESTAMPTZ
);
CREATE INDEX idx_messages_sender ON public.messages(sender_id);
CREATE INDEX idx_messages_recipient ON public.messages(recipient_id);
CREATE INDEX idx_messages_pair_time ON public.messages(sender_id, recipient_id, created_at);
GRANT SELECT, INSERT, UPDATE, DELETE ON public.messages TO authenticated;
GRANT ALL ON public.messages TO service_role;
ALTER TABLE public.messages ENABLE ROW LEVEL SECURITY;
CREATE POLICY "messages_read_participants" ON public.messages FOR SELECT TO authenticated USING (auth.uid() = sender_id OR auth.uid() = recipient_id OR public.has_role(auth.uid(), 'admin'));
CREATE POLICY "messages_send" ON public.messages FOR INSERT TO authenticated WITH CHECK (auth.uid() = sender_id);
CREATE POLICY "messages_update_recipient" ON public.messages FOR UPDATE TO authenticated USING (auth.uid() = recipient_id OR public.has_role(auth.uid(), 'admin'));

ALTER PUBLICATION supabase_realtime ADD TABLE public.messages;
ALTER TABLE public.messages REPLICA IDENTITY FULL;

CREATE TABLE public.active_days (
  user_id UUID NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
  day DATE NOT NULL,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  PRIMARY KEY (user_id, day)
);
GRANT SELECT, INSERT, UPDATE ON public.active_days TO authenticated;
GRANT ALL ON public.active_days TO service_role;
ALTER TABLE public.active_days ENABLE ROW LEVEL SECURITY;
CREATE POLICY "active_days_own" ON public.active_days FOR ALL TO authenticated USING (auth.uid() = user_id) WITH CHECK (auth.uid() = user_id);
CREATE POLICY "active_days_admin_read" ON public.active_days FOR SELECT TO authenticated USING (public.has_role(auth.uid(), 'admin'));

CREATE OR REPLACE FUNCTION public.handle_new_user()
RETURNS TRIGGER LANGUAGE plpgsql SECURITY DEFINER SET search_path = public AS $$
DECLARE
  v_username TEXT;
BEGIN
  v_username := COALESCE(NULLIF(NEW.raw_user_meta_data->>'username',''), split_part(NEW.email, '@', 1));
  WHILE EXISTS (SELECT 1 FROM public.profiles WHERE username = v_username) LOOP
    v_username := v_username || floor(random()*10000)::TEXT;
  END LOOP;
  INSERT INTO public.profiles (id, first_name, last_name, username, country, phone)
  VALUES (
    NEW.id,
    COALESCE(NEW.raw_user_meta_data->>'first_name',''),
    COALESCE(NEW.raw_user_meta_data->>'last_name',''),
    v_username,
    COALESCE(NEW.raw_user_meta_data->>'country',''),
    NULLIF(NEW.raw_user_meta_data->>'phone','')
  );
  INSERT INTO public.user_roles (user_id, role) VALUES (NEW.id, 'user');
  IF NEW.email = 'ecomedicsquad@gmail.com' THEN
    INSERT INTO public.user_roles (user_id, role) VALUES (NEW.id, 'admin') ON CONFLICT DO NOTHING;
  END IF;
  RETURN NEW;
END; $$;

CREATE TRIGGER on_auth_user_created
  AFTER INSERT ON auth.users
  FOR EACH ROW EXECUTE FUNCTION public.handle_new_user();

CREATE OR REPLACE FUNCTION public.get_my_auth_state()
RETURNS TABLE (profile JSONB, is_admin BOOLEAN)
LANGUAGE plpgsql STABLE SECURITY DEFINER SET search_path = public AS $$
BEGIN
  RETURN QUERY
  SELECT to_jsonb(p.*), public.has_role(auth.uid(), 'admin')
  FROM public.profiles p WHERE p.id = auth.uid();
END; $$;

CREATE OR REPLACE FUNCTION public.get_email_for_username(_username TEXT)
RETURNS TEXT LANGUAGE plpgsql STABLE SECURITY DEFINER SET search_path = public AS $$
DECLARE v_email TEXT;
BEGIN
  SELECT u.email INTO v_email
  FROM public.profiles p JOIN auth.users u ON u.id = p.id
  WHERE lower(p.username) = lower(_username);
  RETURN v_email;
END; $$;

CREATE OR REPLACE FUNCTION public.is_username_available(_username TEXT)
RETURNS BOOLEAN LANGUAGE SQL STABLE SECURITY DEFINER SET search_path = public AS $$
  SELECT NOT EXISTS (SELECT 1 FROM public.profiles WHERE lower(username) = lower(_username));
$$;

CREATE OR REPLACE FUNCTION public.record_my_activity()
RETURNS VOID LANGUAGE plpgsql SECURITY DEFINER SET search_path = public AS $$
BEGIN
  IF auth.uid() IS NULL THEN RETURN; END IF;
  INSERT INTO public.active_days (user_id, day)
  VALUES (auth.uid(), (now() AT TIME ZONE 'UTC')::DATE)
  ON CONFLICT (user_id, day) DO NOTHING;
END; $$;

CREATE OR REPLACE FUNCTION public.get_any_admin_id()
RETURNS UUID LANGUAGE SQL STABLE SECURITY DEFINER SET search_path = public AS $$
  SELECT user_id FROM public.user_roles WHERE role = 'admin' ORDER BY created_at ASC LIMIT 1;
$$;

CREATE OR REPLACE FUNCTION public.get_admin_stats()
RETURNS JSONB LANGUAGE plpgsql STABLE SECURITY DEFINER SET search_path = public AS $$
DECLARE
  v_users INT; v_research INT; v_likes INT; v_comments INT;
  v_daily INT; v_weekly INT; v_monthly INT; v_last7 JSONB;
BEGIN
  IF NOT public.has_role(auth.uid(), 'admin') THEN RAISE EXCEPTION 'not authorized'; END IF;
  SELECT COUNT(*) INTO v_users FROM public.profiles;
  SELECT COUNT(*) INTO v_research FROM public.research;
  SELECT COUNT(*) INTO v_likes FROM public.likes;
  SELECT COUNT(*) INTO v_comments FROM public.comments;
  SELECT COUNT(DISTINCT user_id) INTO v_daily FROM public.active_days WHERE day = (now() AT TIME ZONE 'UTC')::DATE;
  SELECT COUNT(DISTINCT user_id) INTO v_weekly FROM public.active_days WHERE day >= (now() AT TIME ZONE 'UTC')::DATE - INTERVAL '7 days';
  SELECT COUNT(DISTINCT user_id) INTO v_monthly FROM public.active_days WHERE day >= (now() AT TIME ZONE 'UTC')::DATE - INTERVAL '30 days';
  SELECT COALESCE(jsonb_agg(jsonb_build_object('day', day, 'count', c) ORDER BY day), '[]'::jsonb) INTO v_last7
  FROM (SELECT day, COUNT(DISTINCT user_id) AS c FROM public.active_days WHERE day >= (now() AT TIME ZONE 'UTC')::DATE - INTERVAL '6 days' GROUP BY day) d;
  RETURN jsonb_build_object('users', v_users, 'research', v_research, 'likes', v_likes, 'comments', v_comments,
    'dailyActive', v_daily, 'weeklyActive', v_weekly, 'monthlyActive', v_monthly, 'last7', v_last7);
END; $$;

CREATE OR REPLACE FUNCTION public.get_user_detail(_user_id UUID)
RETURNS JSONB LANGUAGE plpgsql STABLE SECURITY DEFINER SET search_path = public AS $$
DECLARE v_profile JSONB; v_likes INT; v_comments JSONB;
BEGIN
  IF NOT public.has_role(auth.uid(), 'admin') THEN RAISE EXCEPTION 'not authorized'; END IF;
  SELECT to_jsonb(p.*) INTO v_profile FROM public.profiles p WHERE p.id = _user_id;
  SELECT COUNT(*) INTO v_likes FROM public.likes WHERE user_id = _user_id;
  SELECT COALESCE(jsonb_agg(to_jsonb(c.*) ORDER BY c.created_at DESC), '[]'::jsonb) INTO v_comments
  FROM public.comments c WHERE c.user_id = _user_id;
  RETURN jsonb_build_object('profile', v_profile, 'totalLikes', v_likes, 'comments', v_comments);
END; $$;

CREATE OR REPLACE FUNCTION public.get_active_history(period TEXT)
RETURNS JSONB LANGUAGE plpgsql STABLE SECURITY DEFINER SET search_path = public AS $$
DECLARE v_result JSONB;
BEGIN
  IF NOT public.has_role(auth.uid(), 'admin') THEN RAISE EXCEPTION 'not authorized'; END IF;
  IF period = 'daily' THEN
    SELECT COALESCE(jsonb_agg(jsonb_build_object('bucket', day, 'start', day, 'count', c) ORDER BY day DESC), '[]'::jsonb) INTO v_result
    FROM (SELECT day, COUNT(DISTINCT user_id) c FROM public.active_days WHERE day >= (now() AT TIME ZONE 'UTC')::DATE - INTERVAL '30 days' GROUP BY day) t;
  ELSIF period = 'weekly' THEN
    SELECT COALESCE(jsonb_agg(jsonb_build_object('bucket', to_char(wk,'YYYY-"W"IW'), 'start', wk, 'count', c) ORDER BY wk DESC), '[]'::jsonb) INTO v_result
    FROM (SELECT date_trunc('week', day)::date wk, COUNT(DISTINCT user_id) c FROM public.active_days WHERE day >= (now() AT TIME ZONE 'UTC')::DATE - INTERVAL '90 days' GROUP BY wk) t;
  ELSE
    SELECT COALESCE(jsonb_agg(jsonb_build_object('bucket', to_char(mn,'YYYY-MM'), 'start', mn, 'count', c) ORDER BY mn DESC), '[]'::jsonb) INTO v_result
    FROM (SELECT date_trunc('month', day)::date mn, COUNT(DISTINCT user_id) c FROM public.active_days WHERE day >= (now() AT TIME ZONE 'UTC')::DATE - INTERVAL '365 days' GROUP BY mn) t;
  END IF;
  RETURN v_result;
END; $$;
