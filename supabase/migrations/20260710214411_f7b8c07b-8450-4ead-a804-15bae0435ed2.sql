
-- 1. Extend courses
ALTER TABLE public.courses
  ADD COLUMN IF NOT EXISTS price NUMERIC(12,2) NOT NULL DEFAULT 0,
  ADD COLUMN IF NOT EXISTS purchase_enabled BOOLEAN NOT NULL DEFAULT false;

-- 2. Extend profiles with block flag
ALTER TABLE public.profiles
  ADD COLUMN IF NOT EXISTS is_blocked BOOLEAN NOT NULL DEFAULT false;

-- 3. course_purchases
CREATE TABLE IF NOT EXISTS public.course_purchases (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id UUID NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
  course_id UUID NOT NULL REFERENCES public.courses(id) ON DELETE CASCADE,
  receipt_url TEXT NOT NULL,
  bank_name TEXT NOT NULL,
  account_name TEXT NOT NULL,
  status TEXT NOT NULL DEFAULT 'pending' CHECK (status IN ('pending','approved','rejected','scam')),
  reviewed_at TIMESTAMPTZ,
  reviewed_by UUID REFERENCES auth.users(id),
  created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT now()
);

GRANT SELECT, INSERT, UPDATE, DELETE ON public.course_purchases TO authenticated;
GRANT ALL ON public.course_purchases TO service_role;

ALTER TABLE public.course_purchases ENABLE ROW LEVEL SECURITY;

CREATE POLICY "users view own purchases" ON public.course_purchases
  FOR SELECT TO authenticated USING (auth.uid() = user_id OR public.has_role(auth.uid(),'admin'));

CREATE POLICY "users insert own purchases" ON public.course_purchases
  FOR INSERT TO authenticated WITH CHECK (auth.uid() = user_id);

CREATE POLICY "users delete own pending purchases" ON public.course_purchases
  FOR DELETE TO authenticated USING (auth.uid() = user_id AND status = 'pending');

CREATE POLICY "admins update purchases" ON public.course_purchases
  FOR UPDATE TO authenticated USING (public.has_role(auth.uid(),'admin')) WITH CHECK (public.has_role(auth.uid(),'admin'));

CREATE TRIGGER update_course_purchases_updated_at BEFORE UPDATE ON public.course_purchases
  FOR EACH ROW EXECUTE FUNCTION public.update_updated_at_column();

CREATE INDEX IF NOT EXISTS course_purchases_user_idx ON public.course_purchases(user_id);
CREATE INDEX IF NOT EXISTS course_purchases_status_idx ON public.course_purchases(status);

-- 4. Storage policies for purchase-receipts
CREATE POLICY "receipts users upload own" ON storage.objects
  FOR INSERT TO authenticated
  WITH CHECK (bucket_id = 'purchase-receipts' AND (storage.foldername(name))[1] = auth.uid()::text);

CREATE POLICY "receipts users read own" ON storage.objects
  FOR SELECT TO authenticated
  USING (bucket_id = 'purchase-receipts' AND ((storage.foldername(name))[1] = auth.uid()::text OR public.has_role(auth.uid(),'admin')));

-- 5. Admin review RPC
CREATE OR REPLACE FUNCTION public.admin_review_purchase(_purchase_id UUID, _action TEXT)
RETURNS VOID
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE v_user UUID;
BEGIN
  IF NOT public.has_role(auth.uid(),'admin') THEN RAISE EXCEPTION 'not authorized'; END IF;
  IF _action NOT IN ('approved','rejected','scam') THEN RAISE EXCEPTION 'invalid action'; END IF;

  IF _action = 'approved' THEN
    UPDATE public.course_purchases SET status='approved', reviewed_at=now(), reviewed_by=auth.uid()
      WHERE id=_purchase_id RETURNING user_id INTO v_user;
  ELSIF _action = 'rejected' THEN
    DELETE FROM public.course_purchases WHERE id=_purchase_id RETURNING user_id INTO v_user;
  ELSIF _action = 'scam' THEN
    UPDATE public.course_purchases SET status='scam', reviewed_at=now(), reviewed_by=auth.uid()
      WHERE id=_purchase_id RETURNING user_id INTO v_user;
    IF v_user IS NOT NULL THEN
      UPDATE public.profiles SET is_blocked = true WHERE id = v_user;
    END IF;
  END IF;
END; $$;

-- 6. Purchase stats
CREATE OR REPLACE FUNCTION public.get_purchase_stats()
RETURNS JSONB
LANGUAGE plpgsql
STABLE SECURITY DEFINER
SET search_path = public
AS $$
DECLARE v_pending INT; v_approved INT;
BEGIN
  IF NOT public.has_role(auth.uid(),'admin') THEN RAISE EXCEPTION 'not authorized'; END IF;
  SELECT COUNT(*) INTO v_pending FROM public.course_purchases WHERE status='pending';
  SELECT COUNT(*) INTO v_approved FROM public.course_purchases WHERE status='approved';
  RETURN jsonb_build_object('pending', v_pending, 'purchased', v_approved);
END; $$;

-- 7. List purchases with user + course info (admin)
CREATE OR REPLACE FUNCTION public.admin_list_purchases(_status TEXT)
RETURNS JSONB
LANGUAGE plpgsql
STABLE SECURITY DEFINER
SET search_path = public
AS $$
DECLARE v JSONB;
BEGIN
  IF NOT public.has_role(auth.uid(),'admin') THEN RAISE EXCEPTION 'not authorized'; END IF;
  SELECT COALESCE(jsonb_agg(row_to_json(t) ORDER BY t.created_at DESC), '[]'::jsonb) INTO v FROM (
    SELECT cp.id, cp.status, cp.receipt_url, cp.bank_name, cp.account_name, cp.created_at, cp.reviewed_at,
           cp.user_id, cp.course_id,
           c.title AS course_title, c.price AS course_price,
           p.first_name, p.last_name, p.username,
           u.email
    FROM public.course_purchases cp
    JOIN public.courses c ON c.id = cp.course_id
    JOIN public.profiles p ON p.id = cp.user_id
    JOIN auth.users u ON u.id = cp.user_id
    WHERE cp.status = _status
  ) t;
  RETURN v;
END; $$;
