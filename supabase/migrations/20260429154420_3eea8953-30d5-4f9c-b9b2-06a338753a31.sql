-- Storage RLS policies for upload buckets
-- Users upload into folders named with their own user id (e.g. {user_id}/file.jpg)

-- AVATARS (public bucket)
DROP POLICY IF EXISTS "Avatars public read" ON storage.objects;
DROP POLICY IF EXISTS "Avatars user upload" ON storage.objects;
DROP POLICY IF EXISTS "Avatars user update" ON storage.objects;
DROP POLICY IF EXISTS "Avatars user delete" ON storage.objects;

CREATE POLICY "Avatars public read" ON storage.objects
  FOR SELECT USING (bucket_id = 'avatars');

CREATE POLICY "Avatars user upload" ON storage.objects
  FOR INSERT TO authenticated
  WITH CHECK (bucket_id = 'avatars' AND auth.uid()::text = (storage.foldername(name))[1]);

CREATE POLICY "Avatars user update" ON storage.objects
  FOR UPDATE TO authenticated
  USING (bucket_id = 'avatars' AND auth.uid()::text = (storage.foldername(name))[1]);

CREATE POLICY "Avatars user delete" ON storage.objects
  FOR DELETE TO authenticated
  USING (bucket_id = 'avatars' AND auth.uid()::text = (storage.foldername(name))[1]);

-- RESEARCH-IMAGES (admin write, public read)
DROP POLICY IF EXISTS "Research images public read" ON storage.objects;
DROP POLICY IF EXISTS "Research images admin write" ON storage.objects;
DROP POLICY IF EXISTS "Research images admin update" ON storage.objects;
DROP POLICY IF EXISTS "Research images admin delete" ON storage.objects;

CREATE POLICY "Research images public read" ON storage.objects
  FOR SELECT USING (bucket_id = 'research-images');

CREATE POLICY "Research images admin write" ON storage.objects
  FOR INSERT TO authenticated
  WITH CHECK (bucket_id = 'research-images' AND public.has_role(auth.uid(), 'admin'::public.app_role));

CREATE POLICY "Research images admin update" ON storage.objects
  FOR UPDATE TO authenticated
  USING (bucket_id = 'research-images' AND public.has_role(auth.uid(), 'admin'::public.app_role));

CREATE POLICY "Research images admin delete" ON storage.objects
  FOR DELETE TO authenticated
  USING (bucket_id = 'research-images' AND public.has_role(auth.uid(), 'admin'::public.app_role));

-- RESEARCH-MEDIA (admin write, public read)
DROP POLICY IF EXISTS "Research media public read" ON storage.objects;
DROP POLICY IF EXISTS "Research media admin write" ON storage.objects;
DROP POLICY IF EXISTS "Research media admin update" ON storage.objects;
DROP POLICY IF EXISTS "Research media admin delete" ON storage.objects;

CREATE POLICY "Research media public read" ON storage.objects
  FOR SELECT USING (bucket_id = 'research-media');

CREATE POLICY "Research media admin write" ON storage.objects
  FOR INSERT TO authenticated
  WITH CHECK (bucket_id = 'research-media' AND public.has_role(auth.uid(), 'admin'::public.app_role));

CREATE POLICY "Research media admin update" ON storage.objects
  FOR UPDATE TO authenticated
  USING (bucket_id = 'research-media' AND public.has_role(auth.uid(), 'admin'::public.app_role));

CREATE POLICY "Research media admin delete" ON storage.objects
  FOR DELETE TO authenticated
  USING (bucket_id = 'research-media' AND public.has_role(auth.uid(), 'admin'::public.app_role));

-- CHAT-FILES (authenticated users upload to their own folder, all auth users can read)
DROP POLICY IF EXISTS "Chat files read" ON storage.objects;
DROP POLICY IF EXISTS "Chat files user upload" ON storage.objects;
DROP POLICY IF EXISTS "Chat files user delete" ON storage.objects;

CREATE POLICY "Chat files read" ON storage.objects
  FOR SELECT TO authenticated
  USING (bucket_id = 'chat-files');

CREATE POLICY "Chat files user upload" ON storage.objects
  FOR INSERT TO authenticated
  WITH CHECK (bucket_id = 'chat-files' AND auth.uid()::text = (storage.foldername(name))[1]);

CREATE POLICY "Chat files user delete" ON storage.objects
  FOR DELETE TO authenticated
  USING (bucket_id = 'chat-files' AND (auth.uid()::text = (storage.foldername(name))[1] OR public.has_role(auth.uid(), 'admin'::public.app_role)));
