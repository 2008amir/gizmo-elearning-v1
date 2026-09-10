
-- Extend assignments
ALTER TABLE public.assignments
  ALTER COLUMN course_id DROP NOT NULL,
  ADD COLUMN IF NOT EXISTS submission_types jsonb NOT NULL DEFAULT '{"text":false,"file":false,"objective":false}'::jsonb,
  ADD COLUMN IF NOT EXISTS questions jsonb NOT NULL DEFAULT '[]'::jsonb,
  ADD COLUMN IF NOT EXISTS created_by uuid REFERENCES auth.users(id) ON DELETE SET NULL;

-- Extend assignment_submissions with answers + status + score_pct
ALTER TABLE public.assignment_submissions
  ADD COLUMN IF NOT EXISTS answers jsonb,
  ADD COLUMN IF NOT EXISTS status text NOT NULL DEFAULT 'submitted',
  ADD COLUMN IF NOT EXISTS score_pct numeric(5,2),
  ADD COLUMN IF NOT EXISTS graded_via text;

-- Extend certificates
ALTER TABLE public.certificates
  ADD COLUMN IF NOT EXISTS score_pct numeric(5,2),
  ADD COLUMN IF NOT EXISTS exam_id uuid;

-- Exam questions
CREATE TABLE IF NOT EXISTS public.exam_questions (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  course_id uuid NOT NULL REFERENCES public.courses(id) ON DELETE CASCADE,
  question text NOT NULL,
  options jsonb NOT NULL,
  correct_index int NOT NULL,
  source text NOT NULL DEFAULT 'manual',
  created_at timestamptz NOT NULL DEFAULT now(),
  updated_at timestamptz NOT NULL DEFAULT now()
);
GRANT SELECT, INSERT, UPDATE, DELETE ON public.exam_questions TO authenticated;
GRANT ALL ON public.exam_questions TO service_role;
ALTER TABLE public.exam_questions ENABLE ROW LEVEL SECURITY;
CREATE POLICY "Everyone can read exam questions" ON public.exam_questions FOR SELECT TO authenticated USING (true);
CREATE POLICY "Admins manage exam questions" ON public.exam_questions FOR ALL TO authenticated
  USING (public.has_role(auth.uid(),'admin')) WITH CHECK (public.has_role(auth.uid(),'admin'));

-- Exam attempts
CREATE TABLE IF NOT EXISTS public.exam_attempts (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id uuid NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
  course_id uuid NOT NULL REFERENCES public.courses(id) ON DELETE CASCADE,
  score_pct numeric(5,2) NOT NULL,
  passed boolean NOT NULL,
  answers jsonb,
  question_ids jsonb,
  created_at timestamptz NOT NULL DEFAULT now()
);
GRANT SELECT, INSERT ON public.exam_attempts TO authenticated;
GRANT ALL ON public.exam_attempts TO service_role;
ALTER TABLE public.exam_attempts ENABLE ROW LEVEL SECURITY;
CREATE POLICY "Users see own attempts" ON public.exam_attempts FOR SELECT TO authenticated USING (auth.uid() = user_id OR public.has_role(auth.uid(),'admin'));
CREATE POLICY "Users insert own attempts" ON public.exam_attempts FOR INSERT TO authenticated WITH CHECK (auth.uid() = user_id);

-- Allow anon read of profiles for public certificate verification (safe columns only via view)
CREATE OR REPLACE VIEW public.public_profiles AS
  SELECT id, username, first_name, last_name, avatar_url, country FROM public.profiles;
GRANT SELECT ON public.public_profiles TO anon, authenticated;

-- Allow anon read of certificates (for verification page)
DROP POLICY IF EXISTS "Public read certificates" ON public.certificates;
CREATE POLICY "Public read certificates" ON public.certificates FOR SELECT TO anon, authenticated USING (true);
GRANT SELECT ON public.certificates TO anon;

-- Realtime
ALTER PUBLICATION supabase_realtime ADD TABLE public.exam_questions;
ALTER PUBLICATION supabase_realtime ADD TABLE public.exam_attempts;
