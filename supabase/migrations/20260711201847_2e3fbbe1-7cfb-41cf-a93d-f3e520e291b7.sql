
CREATE TABLE IF NOT EXISTS public.pending_signups (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  email text NOT NULL UNIQUE,
  password text NOT NULL,
  first_name text NOT NULL DEFAULT '',
  last_name text NOT NULL DEFAULT '',
  username text NOT NULL,
  country text NOT NULL DEFAULT '',
  otp_code text NOT NULL,
  attempts int NOT NULL DEFAULT 0,
  expires_at timestamptz NOT NULL,
  created_at timestamptz NOT NULL DEFAULT now()
);

GRANT ALL ON public.pending_signups TO service_role;

ALTER TABLE public.pending_signups ENABLE ROW LEVEL SECURITY;

-- Deny-all: only service_role (which bypasses RLS) can access.
CREATE POLICY "no client access" ON public.pending_signups FOR ALL USING (false) WITH CHECK (false);

CREATE INDEX IF NOT EXISTS pending_signups_email_lower_idx ON public.pending_signups (lower(email));
CREATE INDEX IF NOT EXISTS pending_signups_username_lower_idx ON public.pending_signups (lower(username));
