
-- avatars
CREATE POLICY "avatars_read" ON storage.objects FOR SELECT TO anon, authenticated USING (bucket_id = 'avatars');
CREATE POLICY "avatars_insert" ON storage.objects FOR INSERT TO authenticated WITH CHECK (bucket_id = 'avatars');
CREATE POLICY "avatars_update_own" ON storage.objects FOR UPDATE TO authenticated USING (bucket_id = 'avatars' AND owner = auth.uid());
CREATE POLICY "avatars_delete_own" ON storage.objects FOR DELETE TO authenticated USING (bucket_id = 'avatars' AND owner = auth.uid());

-- chat files (only participants can read via app; we permit all authenticated to keep it simple)
CREATE POLICY "chat_files_read" ON storage.objects FOR SELECT TO authenticated USING (bucket_id = 'chat-files');
CREATE POLICY "chat_files_insert" ON storage.objects FOR INSERT TO authenticated WITH CHECK (bucket_id = 'chat-files');

-- research images
CREATE POLICY "research_images_read" ON storage.objects FOR SELECT TO anon, authenticated USING (bucket_id = 'research-images');
CREATE POLICY "research_images_insert" ON storage.objects FOR INSERT TO authenticated WITH CHECK (bucket_id = 'research-images' AND public.has_role(auth.uid(), 'admin'));
CREATE POLICY "research_images_update" ON storage.objects FOR UPDATE TO authenticated USING (bucket_id = 'research-images' AND public.has_role(auth.uid(), 'admin'));
CREATE POLICY "research_images_delete" ON storage.objects FOR DELETE TO authenticated USING (bucket_id = 'research-images' AND public.has_role(auth.uid(), 'admin'));

-- research media
CREATE POLICY "research_media_read" ON storage.objects FOR SELECT TO anon, authenticated USING (bucket_id = 'research-media');
CREATE POLICY "research_media_insert" ON storage.objects FOR INSERT TO authenticated WITH CHECK (bucket_id = 'research-media' AND public.has_role(auth.uid(), 'admin'));
CREATE POLICY "research_media_update" ON storage.objects FOR UPDATE TO authenticated USING (bucket_id = 'research-media' AND public.has_role(auth.uid(), 'admin'));
CREATE POLICY "research_media_delete" ON storage.objects FOR DELETE TO authenticated USING (bucket_id = 'research-media' AND public.has_role(auth.uid(), 'admin'));
