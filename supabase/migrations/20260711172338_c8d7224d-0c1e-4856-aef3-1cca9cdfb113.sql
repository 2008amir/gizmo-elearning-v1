
-- 1. Storage: restrict read to folder owner or admin for private buckets
DROP POLICY IF EXISTS "purchase-receipts read authed" ON storage.objects;
CREATE POLICY "purchase-receipts read own or admin" ON storage.objects
  FOR SELECT TO authenticated
  USING (
    bucket_id = 'purchase-receipts'
    AND (
      (storage.foldername(name))[1] = (auth.uid())::text
      OR public.has_role(auth.uid(), 'admin')
    )
  );

DROP POLICY IF EXISTS "assignments read authed" ON storage.objects;
CREATE POLICY "assignments read own or admin" ON storage.objects
  FOR SELECT TO authenticated
  USING (
    bucket_id = 'assignments'
    AND (
      (storage.foldername(name))[1] = (auth.uid())::text
      OR public.has_role(auth.uid(), 'admin')
    )
  );

DROP POLICY IF EXISTS "chat-attachments read authed" ON storage.objects;
CREATE POLICY "chat-attachments read own or admin" ON storage.objects
  FOR SELECT TO authenticated
  USING (
    bucket_id = 'chat-attachments'
    AND (
      (storage.foldername(name))[1] = (auth.uid())::text
      OR public.has_role(auth.uid(), 'admin')
    )
  );

-- 2. Certificates: remove public SELECT; owner + admin only.
-- Anonymous certificate verification still works via public.get_public_certificate (SECURITY DEFINER RPC).
DROP POLICY IF EXISTS "certs read all" ON public.certificates;
CREATE POLICY "certs read own or admin" ON public.certificates
  FOR SELECT TO authenticated
  USING (user_id = auth.uid() OR public.has_role(auth.uid(), 'admin'));

-- 3. Fix mutable search_path on posts_touch_updated
CREATE OR REPLACE FUNCTION public.posts_touch_updated()
RETURNS trigger
LANGUAGE plpgsql
SET search_path = public
AS $$
BEGIN NEW.updated_at = now(); RETURN NEW; END $$;

-- 4. Lock down SECURITY DEFINER function execution.
-- Revoke broad EXECUTE on all public functions, then grant only the RPCs
-- clients legitimately call. Trigger/helper SECURITY DEFINER functions
-- (handle_new_user, communities_after_insert, community_members_count_sync,
-- posts_touch_updated, has_role, is_community_owner, is_community_member,
-- gen_invite_code, communities_updated_at, get_any_admin_id) are invoked
-- by triggers or RLS internally and do not need client EXECUTE.
REVOKE EXECUTE ON ALL FUNCTIONS IN SCHEMA public FROM PUBLIC, anon, authenticated;

-- Public (pre-auth) RPCs
GRANT EXECUTE ON FUNCTION public.is_username_available(text) TO anon, authenticated;
GRANT EXECUTE ON FUNCTION public.get_email_for_username(text) TO anon, authenticated;
GRANT EXECUTE ON FUNCTION public.get_public_certificate(text, text) TO anon, authenticated;

-- Authenticated-user RPCs
GRANT EXECUTE ON FUNCTION public.get_my_auth_state() TO authenticated;
GRANT EXECUTE ON FUNCTION public.record_my_activity() TO authenticated;
GRANT EXECUTE ON FUNCTION public.request_or_join_community(uuid) TO authenticated;
GRANT EXECUTE ON FUNCTION public.join_community_by_code(text) TO authenticated;
GRANT EXECUTE ON FUNCTION public.decide_join_request(uuid, boolean) TO authenticated;

-- Admin-gated RPCs (also self-check with has_role inside)
GRANT EXECUTE ON FUNCTION public.admin_list_purchases(text) TO authenticated;
GRANT EXECUTE ON FUNCTION public.admin_review_purchase(uuid, text) TO authenticated;
GRANT EXECUTE ON FUNCTION public.get_admin_stats() TO authenticated;
GRANT EXECUTE ON FUNCTION public.get_active_history(text) TO authenticated;
GRANT EXECUTE ON FUNCTION public.get_user_detail(uuid) TO authenticated;
GRANT EXECUTE ON FUNCTION public.create_post_and_broadcast(text, text, text, text) TO authenticated;
