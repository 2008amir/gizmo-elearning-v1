
DROP VIEW IF EXISTS public.public_profiles;
CREATE VIEW public.public_profiles WITH (security_invoker = true) AS
  SELECT id, username, first_name, last_name, avatar_url, country FROM public.profiles;
GRANT SELECT ON public.public_profiles TO anon, authenticated;
-- Ensure profiles has anon SELECT so the invoker view works publicly for verification
DROP POLICY IF EXISTS "Public read basic profile" ON public.profiles;
CREATE POLICY "Public read basic profile" ON public.profiles FOR SELECT TO anon USING (true);
