
CREATE POLICY "users upload own assignment files" ON storage.objects FOR INSERT TO authenticated WITH CHECK (bucket_id = 'assignments' AND (storage.foldername(name))[1] = auth.uid()::text);
CREATE POLICY "users read own assignment files" ON storage.objects FOR SELECT TO authenticated USING (bucket_id = 'assignments' AND ((storage.foldername(name))[1] = auth.uid()::text OR public.has_role(auth.uid(), 'admin')));
CREATE POLICY "users update own assignment files" ON storage.objects FOR UPDATE TO authenticated USING (bucket_id = 'assignments' AND (storage.foldername(name))[1] = auth.uid()::text);
CREATE POLICY "users delete own assignment files" ON storage.objects FOR DELETE TO authenticated USING (bucket_id = 'assignments' AND (storage.foldername(name))[1] = auth.uid()::text);
