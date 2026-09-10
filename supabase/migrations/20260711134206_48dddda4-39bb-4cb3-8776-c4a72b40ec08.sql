
DO $$
DECLARE t text;
BEGIN
  FOREACH t IN ARRAY ARRAY[
    'courses','research','comments','likes','comment_likes','messages','course_purchases',
    'certificates','exam_questions','exam_attempts','calendar_events','support_tickets',
    'profiles','research_progress','assignments','course_reviews','user_roles'
  ] LOOP
    EXECUTE format('ALTER PUBLICATION supabase_realtime ADD TABLE public.%I', t);
    EXECUTE format('ALTER TABLE public.%I REPLICA IDENTITY FULL', t);
  END LOOP;
END $$;
