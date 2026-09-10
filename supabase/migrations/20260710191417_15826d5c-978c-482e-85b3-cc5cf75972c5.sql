
CREATE TABLE public.research_progress (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id uuid NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
  research_id uuid NOT NULL REFERENCES public.research(id) ON DELETE CASCADE,
  research_type text NOT NULL,
  completed_at timestamptz NOT NULL DEFAULT now(),
  UNIQUE (user_id, research_id)
);

GRANT SELECT, INSERT, DELETE ON public.research_progress TO authenticated;
GRANT ALL ON public.research_progress TO service_role;

ALTER TABLE public.research_progress ENABLE ROW LEVEL SECURITY;

CREATE POLICY "progress_own_read" ON public.research_progress
  FOR SELECT TO authenticated USING (auth.uid() = user_id);
CREATE POLICY "progress_own_insert" ON public.research_progress
  FOR INSERT TO authenticated WITH CHECK (auth.uid() = user_id);
CREATE POLICY "progress_own_delete" ON public.research_progress
  FOR DELETE TO authenticated USING (auth.uid() = user_id);

CREATE INDEX research_progress_user_type_idx ON public.research_progress (user_id, research_type, completed_at DESC);
