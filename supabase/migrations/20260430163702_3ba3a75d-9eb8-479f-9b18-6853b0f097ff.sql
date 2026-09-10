
CREATE TABLE public.saved_research (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id uuid NOT NULL,
  research_id uuid NOT NULL,
  created_at timestamptz NOT NULL DEFAULT now(),
  UNIQUE (user_id, research_id)
);

ALTER TABLE public.saved_research ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Users see own saves" ON public.saved_research
  FOR SELECT TO authenticated USING (auth.uid() = user_id);

CREATE POLICY "Users save research" ON public.saved_research
  FOR INSERT TO authenticated WITH CHECK (auth.uid() = user_id);

CREATE POLICY "Users unsave research" ON public.saved_research
  FOR DELETE TO authenticated USING (auth.uid() = user_id);
