
-- Invite code generator (safe to create first)
CREATE OR REPLACE FUNCTION public.gen_invite_code() RETURNS text LANGUAGE sql VOLATILE AS $$
  SELECT lower(encode(gen_random_bytes(6), 'hex'))
$$;

-- Tables ---------------------------------------------------------------
CREATE TABLE public.communities (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  owner_id uuid NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
  name text NOT NULL,
  description text,
  image_url text,
  invite_code text NOT NULL UNIQUE DEFAULT public.gen_invite_code(),
  allow_open_join boolean NOT NULL DEFAULT false,
  member_count integer NOT NULL DEFAULT 0,
  created_at timestamptz NOT NULL DEFAULT now(),
  updated_at timestamptz NOT NULL DEFAULT now()
);
GRANT SELECT, INSERT, UPDATE, DELETE ON public.communities TO authenticated;
GRANT ALL ON public.communities TO service_role;

CREATE TABLE public.community_members (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  community_id uuid NOT NULL REFERENCES public.communities(id) ON DELETE CASCADE,
  user_id uuid NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
  role text NOT NULL DEFAULT 'member' CHECK (role IN ('owner','member')),
  joined_at timestamptz NOT NULL DEFAULT now(),
  UNIQUE (community_id, user_id)
);
GRANT SELECT, INSERT, UPDATE, DELETE ON public.community_members TO authenticated;
GRANT ALL ON public.community_members TO service_role;

CREATE TABLE public.community_join_requests (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  community_id uuid NOT NULL REFERENCES public.communities(id) ON DELETE CASCADE,
  user_id uuid NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
  status text NOT NULL DEFAULT 'pending' CHECK (status IN ('pending','approved','rejected')),
  created_at timestamptz NOT NULL DEFAULT now(),
  decided_at timestamptz,
  UNIQUE (community_id, user_id)
);
GRANT SELECT, INSERT, UPDATE, DELETE ON public.community_join_requests TO authenticated;
GRANT ALL ON public.community_join_requests TO service_role;

CREATE TABLE public.community_messages (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  community_id uuid NOT NULL REFERENCES public.communities(id) ON DELETE CASCADE,
  user_id uuid NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
  content text,
  attachment_url text,
  attachment_type text CHECK (attachment_type IN ('image','file','voice')),
  attachment_name text,
  duration_seconds integer,
  created_at timestamptz NOT NULL DEFAULT now()
);
GRANT SELECT, INSERT, UPDATE, DELETE ON public.community_messages TO authenticated;
GRANT ALL ON public.community_messages TO service_role;

-- Helpers (created AFTER tables so SQL functions can resolve references)
CREATE OR REPLACE FUNCTION public.is_community_member(_cid uuid, _uid uuid)
RETURNS boolean LANGUAGE sql STABLE SECURITY DEFINER SET search_path = public
AS $$ SELECT EXISTS (SELECT 1 FROM public.community_members WHERE community_id = _cid AND user_id = _uid) $$;

CREATE OR REPLACE FUNCTION public.is_community_owner(_cid uuid, _uid uuid)
RETURNS boolean LANGUAGE sql STABLE SECURITY DEFINER SET search_path = public
AS $$ SELECT EXISTS (SELECT 1 FROM public.communities WHERE id = _cid AND owner_id = _uid) $$;

-- RLS ------------------------------------------------------------------
ALTER TABLE public.communities ENABLE ROW LEVEL SECURITY;
CREATE POLICY "communities visible to authenticated" ON public.communities FOR SELECT TO authenticated USING (true);
CREATE POLICY "communities insert own" ON public.communities FOR INSERT TO authenticated WITH CHECK (owner_id = auth.uid());
CREATE POLICY "communities update by owner" ON public.communities FOR UPDATE TO authenticated USING (owner_id = auth.uid()) WITH CHECK (owner_id = auth.uid());
CREATE POLICY "communities delete by owner" ON public.communities FOR DELETE TO authenticated USING (owner_id = auth.uid());

ALTER TABLE public.community_members ENABLE ROW LEVEL SECURITY;
CREATE POLICY "members visible to fellow members" ON public.community_members FOR SELECT TO authenticated
  USING (user_id = auth.uid() OR public.is_community_member(community_id, auth.uid()));
CREATE POLICY "members self-insert if open" ON public.community_members FOR INSERT TO authenticated
  WITH CHECK (user_id = auth.uid() AND EXISTS (SELECT 1 FROM public.communities c WHERE c.id = community_id AND (c.allow_open_join OR c.owner_id = auth.uid())));
CREATE POLICY "members self-remove or owner-remove" ON public.community_members FOR DELETE TO authenticated
  USING (user_id = auth.uid() OR public.is_community_owner(community_id, auth.uid()));

ALTER TABLE public.community_join_requests ENABLE ROW LEVEL SECURITY;
CREATE POLICY "requests visible to requester or owner" ON public.community_join_requests FOR SELECT TO authenticated
  USING (user_id = auth.uid() OR public.is_community_owner(community_id, auth.uid()));
CREATE POLICY "requests self-insert" ON public.community_join_requests FOR INSERT TO authenticated
  WITH CHECK (user_id = auth.uid());
CREATE POLICY "requests update by owner" ON public.community_join_requests FOR UPDATE TO authenticated
  USING (public.is_community_owner(community_id, auth.uid())) WITH CHECK (public.is_community_owner(community_id, auth.uid()));
CREATE POLICY "requests delete self or owner" ON public.community_join_requests FOR DELETE TO authenticated
  USING (user_id = auth.uid() OR public.is_community_owner(community_id, auth.uid()));

ALTER TABLE public.community_messages ENABLE ROW LEVEL SECURITY;
CREATE POLICY "messages visible to members" ON public.community_messages FOR SELECT TO authenticated
  USING (public.is_community_member(community_id, auth.uid()));
CREATE POLICY "messages insert by members" ON public.community_messages FOR INSERT TO authenticated
  WITH CHECK (user_id = auth.uid() AND public.is_community_member(community_id, auth.uid()));
CREATE POLICY "messages delete own or owner" ON public.community_messages FOR DELETE TO authenticated
  USING (user_id = auth.uid() OR public.is_community_owner(community_id, auth.uid()));

-- Triggers -------------------------------------------------------------
CREATE OR REPLACE FUNCTION public.communities_after_insert() RETURNS trigger LANGUAGE plpgsql SECURITY DEFINER SET search_path = public AS $$
BEGIN
  INSERT INTO public.community_members (community_id, user_id, role) VALUES (NEW.id, NEW.owner_id, 'owner') ON CONFLICT DO NOTHING;
  UPDATE public.communities SET member_count = 1 WHERE id = NEW.id;
  RETURN NEW;
END $$;
CREATE TRIGGER trg_communities_after_insert AFTER INSERT ON public.communities FOR EACH ROW EXECUTE FUNCTION public.communities_after_insert();

CREATE OR REPLACE FUNCTION public.community_members_count_sync() RETURNS trigger LANGUAGE plpgsql SECURITY DEFINER SET search_path = public AS $$
BEGIN
  IF TG_OP = 'INSERT' THEN
    UPDATE public.communities SET member_count = member_count + 1 WHERE id = NEW.community_id;
  ELSIF TG_OP = 'DELETE' THEN
    UPDATE public.communities SET member_count = GREATEST(0, member_count - 1) WHERE id = OLD.community_id;
  END IF;
  RETURN NULL;
END $$;
CREATE TRIGGER trg_community_members_count_ins AFTER INSERT ON public.community_members FOR EACH ROW EXECUTE FUNCTION public.community_members_count_sync();
CREATE TRIGGER trg_community_members_count_del AFTER DELETE ON public.community_members FOR EACH ROW EXECUTE FUNCTION public.community_members_count_sync();

CREATE OR REPLACE FUNCTION public.communities_updated_at() RETURNS trigger LANGUAGE plpgsql AS $$
BEGIN NEW.updated_at = now(); RETURN NEW; END $$;
CREATE TRIGGER trg_communities_updated_at BEFORE UPDATE ON public.communities FOR EACH ROW EXECUTE FUNCTION public.communities_updated_at();

-- RPCs -----------------------------------------------------------------
CREATE OR REPLACE FUNCTION public.request_or_join_community(_community_id uuid)
RETURNS jsonb LANGUAGE plpgsql SECURITY DEFINER SET search_path = public AS $$
DECLARE v_open bool; v_owner uuid;
BEGIN
  IF auth.uid() IS NULL THEN RAISE EXCEPTION 'not authenticated'; END IF;
  SELECT allow_open_join, owner_id INTO v_open, v_owner FROM public.communities WHERE id = _community_id;
  IF v_open IS NULL THEN RAISE EXCEPTION 'community not found'; END IF;
  IF EXISTS (SELECT 1 FROM public.community_members WHERE community_id = _community_id AND user_id = auth.uid()) THEN
    RETURN jsonb_build_object('status','member');
  END IF;
  IF v_open OR v_owner = auth.uid() THEN
    INSERT INTO public.community_members (community_id, user_id, role) VALUES (_community_id, auth.uid(), 'member') ON CONFLICT DO NOTHING;
    RETURN jsonb_build_object('status','joined');
  END IF;
  INSERT INTO public.community_join_requests (community_id, user_id, status) VALUES (_community_id, auth.uid(), 'pending')
    ON CONFLICT (community_id, user_id) DO UPDATE SET status = 'pending', decided_at = NULL, created_at = now();
  RETURN jsonb_build_object('status','requested');
END $$;

CREATE OR REPLACE FUNCTION public.join_community_by_code(_code text)
RETURNS jsonb LANGUAGE plpgsql SECURITY DEFINER SET search_path = public AS $$
DECLARE v_id uuid;
BEGIN
  SELECT id INTO v_id FROM public.communities WHERE invite_code = _code;
  IF v_id IS NULL THEN RAISE EXCEPTION 'invalid invite code'; END IF;
  RETURN public.request_or_join_community(v_id);
END $$;

CREATE OR REPLACE FUNCTION public.decide_join_request(_request_id uuid, _approve boolean)
RETURNS void LANGUAGE plpgsql SECURITY DEFINER SET search_path = public AS $$
DECLARE v_cid uuid; v_uid uuid;
BEGIN
  SELECT community_id, user_id INTO v_cid, v_uid FROM public.community_join_requests WHERE id = _request_id;
  IF v_cid IS NULL THEN RAISE EXCEPTION 'request not found'; END IF;
  IF NOT public.is_community_owner(v_cid, auth.uid()) THEN RAISE EXCEPTION 'not authorized'; END IF;
  IF _approve THEN
    INSERT INTO public.community_members (community_id, user_id, role) VALUES (v_cid, v_uid, 'member') ON CONFLICT DO NOTHING;
    UPDATE public.community_join_requests SET status = 'approved', decided_at = now() WHERE id = _request_id;
  ELSE
    UPDATE public.community_join_requests SET status = 'rejected', decided_at = now() WHERE id = _request_id;
  END IF;
END $$;

REVOKE ALL ON FUNCTION public.request_or_join_community(uuid) FROM PUBLIC;
REVOKE ALL ON FUNCTION public.join_community_by_code(text) FROM PUBLIC;
REVOKE ALL ON FUNCTION public.decide_join_request(uuid, boolean) FROM PUBLIC;
GRANT EXECUTE ON FUNCTION public.request_or_join_community(uuid) TO authenticated;
GRANT EXECUTE ON FUNCTION public.join_community_by_code(text) TO authenticated;
GRANT EXECUTE ON FUNCTION public.decide_join_request(uuid, boolean) TO authenticated;

-- Realtime -------------------------------------------------------------
ALTER PUBLICATION supabase_realtime ADD TABLE public.communities;
ALTER PUBLICATION supabase_realtime ADD TABLE public.community_members;
ALTER PUBLICATION supabase_realtime ADD TABLE public.community_join_requests;
ALTER PUBLICATION supabase_realtime ADD TABLE public.community_messages;

-- Storage RLS ---------------------------------------------------------
CREATE POLICY "community media readable by members" ON storage.objects FOR SELECT TO authenticated
  USING (bucket_id = 'community-media' AND public.is_community_member((split_part(name, '/', 1))::uuid, auth.uid()));
CREATE POLICY "community media upload by members" ON storage.objects FOR INSERT TO authenticated
  WITH CHECK (bucket_id = 'community-media' AND public.is_community_member((split_part(name, '/', 1))::uuid, auth.uid()) AND (storage.foldername(name))[2] = auth.uid()::text);
CREATE POLICY "community media delete own" ON storage.objects FOR DELETE TO authenticated
  USING (bucket_id = 'community-media' AND (storage.foldername(name))[2] = auth.uid()::text);
