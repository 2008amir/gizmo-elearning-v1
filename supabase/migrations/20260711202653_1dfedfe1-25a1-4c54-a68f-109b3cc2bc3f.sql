
CREATE TABLE public.password_reset_otps (
  email text PRIMARY KEY,
  otp_code text NOT NULL,
  attempts int NOT NULL DEFAULT 0,
  verified boolean NOT NULL DEFAULT false,
  expires_at timestamptz NOT NULL,
  created_at timestamptz NOT NULL DEFAULT now(),
  updated_at timestamptz NOT NULL DEFAULT now()
);

GRANT ALL ON public.password_reset_otps TO service_role;

ALTER TABLE public.password_reset_otps ENABLE ROW LEVEL SECURITY;

CREATE POLICY "service role only" ON public.password_reset_otps
  FOR ALL TO service_role USING (true) WITH CHECK (true);
