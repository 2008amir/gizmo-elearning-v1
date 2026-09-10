
-- 1. Drop unused/insecure RPC (replaced by edge function)
DROP FUNCTION IF EXISTS public.get_email_for_username(text);

-- 2. Revoke anon EXECUTE on SECURITY DEFINER functions that require an authenticated user
REVOKE EXECUTE ON FUNCTION public.assignment_submissions_guard() FROM anon, authenticated, PUBLIC;
REVOKE EXECUTE ON FUNCTION public.get_exam_questions(uuid) FROM anon, PUBLIC;
REVOKE EXECUTE ON FUNCTION public.grade_assignment_objective(uuid) FROM anon, PUBLIC;
REVOKE EXECUTE ON FUNCTION public.submit_exam(uuid, jsonb, uuid[]) FROM anon, PUBLIC;

-- Explicitly grant to authenticated where needed
GRANT EXECUTE ON FUNCTION public.get_exam_questions(uuid) TO authenticated;
GRANT EXECUTE ON FUNCTION public.grade_assignment_objective(uuid) TO authenticated;
GRANT EXECUTE ON FUNCTION public.submit_exam(uuid, jsonb, uuid[]) TO authenticated;

-- 3. Remove exam_questions from realtime publication so answer keys can't be broadcast
ALTER PUBLICATION supabase_realtime DROP TABLE public.exam_questions;
