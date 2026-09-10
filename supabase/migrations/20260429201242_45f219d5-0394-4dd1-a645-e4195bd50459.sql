-- Harden handle_new_user to avoid unique-constraint failures on profiles.username
CREATE OR REPLACE FUNCTION public.handle_new_user()
RETURNS trigger
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path TO 'public'
AS $function$
DECLARE
  base_username text;
  candidate text;
  suffix_len int := 4;
  attempt int := 0;
BEGIN
  base_username := nullif(trim(coalesce(new.raw_user_meta_data->>'username', '')), '');
  IF base_username IS NULL THEN
    base_username := split_part(coalesce(new.email, 'user'), '@', 1);
  END IF;
  -- sanitize: keep alphanum + underscore
  base_username := regexp_replace(base_username, '[^a-zA-Z0-9_]', '', 'g');
  IF base_username = '' THEN
    base_username := 'user';
  END IF;

  candidate := base_username;
  WHILE EXISTS (SELECT 1 FROM public.profiles WHERE username = candidate) LOOP
    attempt := attempt + 1;
    candidate := base_username || '_' || substr(replace(new.id::text, '-', ''), 1, suffix_len + attempt);
    IF attempt > 8 THEN
      candidate := base_username || '_' || substr(replace(gen_random_uuid()::text, '-', ''), 1, 10);
      EXIT;
    END IF;
  END LOOP;

  INSERT INTO public.profiles (id, first_name, last_name, username, country, phone)
  VALUES (
    new.id,
    coalesce(new.raw_user_meta_data->>'first_name', ''),
    coalesce(new.raw_user_meta_data->>'last_name', ''),
    candidate,
    coalesce(new.raw_user_meta_data->>'country', ''),
    coalesce(new.raw_user_meta_data->>'phone', '')
  );

  INSERT INTO public.user_roles (user_id, role)
  VALUES (new.id, 'user')
  ON CONFLICT DO NOTHING;

  RETURN new;
END;
$function$;

-- Ensure triggers are attached on auth.users
DROP TRIGGER IF EXISTS on_auth_user_created ON auth.users;
CREATE TRIGGER on_auth_user_created
  AFTER INSERT ON auth.users
  FOR EACH ROW EXECUTE FUNCTION public.handle_new_user();

DROP TRIGGER IF EXISTS on_auth_user_created_grant_admin ON auth.users;
CREATE TRIGGER on_auth_user_created_grant_admin
  AFTER INSERT ON auth.users
  FOR EACH ROW EXECUTE FUNCTION public.grant_admin_for_special_email();