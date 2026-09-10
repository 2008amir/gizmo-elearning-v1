
-- Helper: user folder is first path segment
-- Buckets that are readable by any signed-in user but writable only in own folder
DO $$
DECLARE b text;
BEGIN
  FOREACH b IN ARRAY ARRAY['research-images','avatars','purchase-receipts','assignments','chat-attachments']
  LOOP
    EXECUTE format($f$
      CREATE POLICY "%s read authed" ON storage.objects FOR SELECT TO authenticated
        USING (bucket_id = %L);
      CREATE POLICY "%s insert own" ON storage.objects FOR INSERT TO authenticated
        WITH CHECK (bucket_id = %L AND (storage.foldername(name))[1] = auth.uid()::text);
      CREATE POLICY "%s update own" ON storage.objects FOR UPDATE TO authenticated
        USING (bucket_id = %L AND (storage.foldername(name))[1] = auth.uid()::text);
      CREATE POLICY "%s delete own" ON storage.objects FOR DELETE TO authenticated
        USING (bucket_id = %L AND (storage.foldername(name))[1] = auth.uid()::text);
    $f$, b, b, b, b, b, b, b, b, b);
  END LOOP;
END $$;
