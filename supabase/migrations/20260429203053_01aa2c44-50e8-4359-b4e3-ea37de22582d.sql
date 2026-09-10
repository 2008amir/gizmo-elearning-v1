-- Function: check if a username is available (public, safe — only returns boolean)
CREATE OR REPLACE FUNCTION public.is_username_available(_username text)
RETURNS boolean
LANGUAGE sql
STABLE
SECURITY DEFINER
SET search_path = public
AS $$
  SELECT NOT EXISTS (
    SELECT 1 FROM public.profiles
    WHERE lower(username) = lower(trim(_username))
  );
$$;

REVOKE ALL ON FUNCTION public.is_username_available(text) FROM PUBLIC;
GRANT EXECUTE ON FUNCTION public.is_username_available(text) TO anon, authenticated;

-- Function: resolve a username to its account email so users can sign in with username.
-- Returns NULL if the username doesn't exist. Email is needed by Supabase Auth which
-- only accepts email + password. This intentionally exposes the email tied to a username
-- (similar to many apps) — required for username login UX.
CREATE OR REPLACE FUNCTION public.get_email_for_username(_username text)
RETURNS text
LANGUAGE plpgsql
STABLE
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  user_email text;
  uid uuid;
BEGIN
  SELECT id INTO uid
  FROM public.profiles
  WHERE lower(username) = lower(trim(_username))
  LIMIT 1;

  IF uid IS NULL THEN
    RETURN NULL;
  END IF;

  SELECT email INTO user_email FROM auth.users WHERE id = uid LIMIT 1;
  RETURN user_email;
END;
$$;

REVOKE ALL ON FUNCTION public.get_email_for_username(text) FROM PUBLIC;
GRANT EXECUTE ON FUNCTION public.get_email_for_username(text) TO anon, authenticated;