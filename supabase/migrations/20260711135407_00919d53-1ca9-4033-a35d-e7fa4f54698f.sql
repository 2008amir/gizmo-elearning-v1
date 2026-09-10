
CREATE OR REPLACE FUNCTION public.gen_invite_code() RETURNS text LANGUAGE sql VOLATILE SET search_path = public, extensions AS $$
  SELECT lower(encode(gen_random_bytes(6), 'hex'))
$$;
CREATE OR REPLACE FUNCTION public.communities_updated_at() RETURNS trigger LANGUAGE plpgsql SET search_path = public AS $$
BEGIN NEW.updated_at = now(); RETURN NEW; END $$;
