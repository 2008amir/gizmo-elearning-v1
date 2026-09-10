
-- 1) Attach trigger so handle_new_user runs on every new signup
DROP TRIGGER IF EXISTS on_auth_user_created ON auth.users;
CREATE TRIGGER on_auth_user_created
  AFTER INSERT ON auth.users
  FOR EACH ROW EXECUTE FUNCTION public.handle_new_user();

-- 2) Backfill profiles for any existing auth users missing one
INSERT INTO public.profiles (id, first_name, last_name, username, country, phone)
SELECT
  u.id,
  COALESCE(u.raw_user_meta_data->>'first_name',''),
  COALESCE(u.raw_user_meta_data->>'last_name',''),
  COALESCE(NULLIF(u.raw_user_meta_data->>'username',''), split_part(u.email,'@',1)) || '_' || substr(u.id::text,1,4),
  COALESCE(u.raw_user_meta_data->>'country',''),
  NULLIF(u.raw_user_meta_data->>'phone','')
FROM auth.users u
LEFT JOIN public.profiles p ON p.id = u.id
WHERE p.id IS NULL;

-- 3) Backfill 'user' role for any auth user without a role
INSERT INTO public.user_roles (user_id, role)
SELECT u.id, 'user'::public.app_role
FROM auth.users u
LEFT JOIN public.user_roles r ON r.user_id = u.id
WHERE r.user_id IS NULL;

-- 4) Ensure bootstrap admin has admin role
INSERT INTO public.user_roles (user_id, role)
SELECT u.id, 'admin'::public.app_role
FROM auth.users u
WHERE u.email = 'ecomedicsquad@gmail.com'
ON CONFLICT DO NOTHING;

-- 5) Enable realtime for course_purchases
ALTER TABLE public.course_purchases REPLICA IDENTITY FULL;
DO $$
BEGIN
  IF NOT EXISTS (
    SELECT 1 FROM pg_publication_tables
    WHERE pubname = 'supabase_realtime' AND schemaname = 'public' AND tablename = 'course_purchases'
  ) THEN
    EXECUTE 'ALTER PUBLICATION supabase_realtime ADD TABLE public.course_purchases';
  END IF;
END $$;
