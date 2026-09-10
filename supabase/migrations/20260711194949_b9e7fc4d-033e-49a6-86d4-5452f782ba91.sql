
-- =========================================================
-- 1. EXAM: server-side grading + hide answer key
-- =========================================================
DROP POLICY IF EXISTS "exam_qs read authed" ON public.exam_questions;
CREATE POLICY "exam_qs read admin" ON public.exam_questions FOR SELECT TO authenticated USING (public.has_role(auth.uid(),'admin'));

DROP POLICY IF EXISTS "attempts insert own" ON public.exam_attempts;
-- Only admins/service role may write attempts directly; students go through submit_exam RPC.

DROP POLICY IF EXISTS "certs insert own" ON public.certificates;
-- Only admins/service role may write certificates directly.

-- Public (no answer key) exam question fetcher
CREATE OR REPLACE FUNCTION public.get_exam_questions(_course_id uuid)
RETURNS TABLE(id uuid, question text, options jsonb)
LANGUAGE plpgsql STABLE SECURITY DEFINER SET search_path = public AS $$
BEGIN
  IF auth.uid() IS NULL THEN RAISE EXCEPTION 'not authenticated'; END IF;
  RETURN QUERY SELECT q.id, q.question, to_jsonb(q.options) FROM public.exam_questions q WHERE q.course_id = _course_id;
END $$;

-- Server-side exam grading
CREATE OR REPLACE FUNCTION public.submit_exam(_course_id uuid, _answers jsonb, _question_ids uuid[])
RETURNS jsonb LANGUAGE plpgsql SECURITY DEFINER SET search_path = public AS $$
DECLARE
  v_uid uuid := auth.uid();
  v_correct int := 0;
  v_total int;
  v_score int;
  v_passed boolean;
  v_attempt_id uuid;
  v_cert_serial text;
  q record;
  v_answer int;
  v_course_title text;
BEGIN
  IF v_uid IS NULL THEN RAISE EXCEPTION 'not authenticated'; END IF;
  v_total := coalesce(array_length(_question_ids,1),0);
  IF v_total = 0 THEN RAISE EXCEPTION 'no questions'; END IF;

  FOR q IN SELECT id, correct_index FROM public.exam_questions WHERE id = ANY(_question_ids) AND course_id = _course_id LOOP
    v_answer := NULLIF(_answers->>(q.id::text),'')::int;
    IF v_answer IS NOT NULL AND v_answer = q.correct_index THEN v_correct := v_correct + 1; END IF;
  END LOOP;

  v_score := round((v_correct::numeric / v_total) * 100);
  v_passed := v_score >= 70;

  INSERT INTO public.exam_attempts(user_id, course_id, score_pct, passed, answers, question_ids)
  VALUES (v_uid, _course_id, v_score, v_passed, _answers, _question_ids)
  RETURNING id INTO v_attempt_id;

  IF v_passed THEN
    v_cert_serial := 'GOP-' || to_char(now(),'YYYY') || '-' || upper(substr(md5(random()::text||v_attempt_id::text),1,6));
    INSERT INTO public.certificates(user_id, course_id, serial, score_pct, exam_id)
    VALUES (v_uid, _course_id, v_cert_serial, v_score, v_attempt_id);
    SELECT title INTO v_course_title FROM public.courses WHERE id = _course_id;
    INSERT INTO public.notifications(user_id, kind, title, body, link)
    VALUES (v_uid, 'certificate', '🎓 Congratulations!',
      'You passed '||coalesce(v_course_title,'the course')||' with '||v_score||'% and earned your certificate.',
      '/certificates');
  END IF;

  RETURN jsonb_build_object('score', v_score, 'passed', v_passed, 'attempt_id', v_attempt_id, 'serial', v_cert_serial);
END $$;

REVOKE EXECUTE ON FUNCTION public.get_exam_questions(uuid) FROM anon;
REVOKE EXECUTE ON FUNCTION public.submit_exam(uuid, jsonb, uuid[]) FROM anon;
GRANT EXECUTE ON FUNCTION public.get_exam_questions(uuid) TO authenticated;
GRANT EXECUTE ON FUNCTION public.submit_exam(uuid, jsonb, uuid[]) TO authenticated;

-- =========================================================
-- 2. ASSIGNMENT: block students from writing grading columns
-- =========================================================
CREATE OR REPLACE FUNCTION public.assignment_submissions_guard()
RETURNS trigger LANGUAGE plpgsql SECURITY DEFINER SET search_path = public AS $$
BEGIN
  IF public.has_role(auth.uid(),'admin') THEN RETURN NEW; END IF;
  IF TG_OP = 'INSERT' THEN
    NEW.status := 'submitted';
    NEW.score_pct := NULL;
    NEW.grade := NULL;
    NEW.feedback := NULL;
    NEW.graded_at := NULL;
    NEW.graded_via := NULL;
  ELSIF TG_OP = 'UPDATE' THEN
    NEW.status := OLD.status;
    NEW.score_pct := OLD.score_pct;
    NEW.grade := OLD.grade;
    NEW.feedback := OLD.feedback;
    NEW.graded_at := OLD.graded_at;
    NEW.graded_via := OLD.graded_via;
  END IF;
  RETURN NEW;
END $$;
DROP TRIGGER IF EXISTS trg_assignment_submissions_guard ON public.assignment_submissions;
CREATE TRIGGER trg_assignment_submissions_guard
BEFORE INSERT OR UPDATE ON public.assignment_submissions
FOR EACH ROW EXECUTE FUNCTION public.assignment_submissions_guard();

-- Server-side grader for objective-only assignments
CREATE OR REPLACE FUNCTION public.grade_assignment_objective(_submission_id uuid)
RETURNS jsonb LANGUAGE plpgsql SECURITY DEFINER SET search_path = public AS $$
DECLARE
  v_sub record; v_asg record; v_correct int := 0; v_total int := 0; v_score numeric; v_grade int;
  v_q jsonb; v_i int; v_ans int;
BEGIN
  IF auth.uid() IS NULL THEN RAISE EXCEPTION 'not authenticated'; END IF;
  SELECT * INTO v_sub FROM public.assignment_submissions WHERE id = _submission_id;
  IF v_sub.user_id <> auth.uid() AND NOT public.has_role(auth.uid(),'admin') THEN RAISE EXCEPTION 'forbidden'; END IF;
  SELECT * INTO v_asg FROM public.assignments WHERE id = v_sub.assignment_id;
  IF NOT (coalesce((v_asg.submission_types->>'objective')::boolean,false)
          AND NOT coalesce((v_asg.submission_types->>'text')::boolean,false)
          AND NOT coalesce((v_asg.submission_types->>'file')::boolean,false)) THEN
    RAISE EXCEPTION 'not an objective-only assignment';
  END IF;
  IF jsonb_typeof(v_asg.questions) <> 'array' THEN RAISE EXCEPTION 'no questions'; END IF;
  v_i := 0;
  FOR v_q IN SELECT * FROM jsonb_array_elements(v_asg.questions) LOOP
    v_total := v_total + 1;
    v_ans := NULLIF(v_sub.answers->>(v_i::text),'')::int;
    IF v_ans IS NOT NULL AND v_ans = (v_q->>'correct_index')::int THEN v_correct := v_correct + 1; END IF;
    v_i := v_i + 1;
  END LOOP;
  v_score := CASE WHEN v_total = 0 THEN 0 ELSE (v_correct::numeric / v_total) * 100 END;
  v_grade := round(v_score / 100 * coalesce(v_asg.max_points,100));
  UPDATE public.assignment_submissions SET
    status = 'graded', score_pct = v_score, grade = v_grade,
    graded_at = now(), graded_via = 'auto',
    feedback = 'Auto-graded: '||v_correct||'/'||v_total||' correct'
  WHERE id = _submission_id;
  RETURN jsonb_build_object('score_pct', v_score, 'grade', v_grade, 'correct', v_correct, 'total', v_total);
END $$;
REVOKE EXECUTE ON FUNCTION public.grade_assignment_objective(uuid) FROM anon;
GRANT EXECUTE ON FUNCTION public.grade_assignment_objective(uuid) TO authenticated;

-- =========================================================
-- 3. PURCHASES: only "pending" status on insert
-- =========================================================
DROP POLICY IF EXISTS "purchases insert own" ON public.course_purchases;
CREATE POLICY "purchases insert own pending" ON public.course_purchases
FOR INSERT TO authenticated
WITH CHECK (auth.uid() = user_id AND status = 'pending');

-- =========================================================
-- 4. CERTIFICATE PUBLIC PAGE: strip PII
-- =========================================================
CREATE OR REPLACE FUNCTION public.get_public_certificate(_username text, _serial text)
 RETURNS jsonb
 LANGUAGE plpgsql
 STABLE SECURITY DEFINER
 SET search_path TO 'public'
AS $$
DECLARE
  v_cert record; v_profile record; v_course record; v_enrolled timestamptz; v_total_lessons int;
BEGIN
  SELECT c.* INTO v_cert FROM public.certificates c JOIN public.profiles p ON p.id = c.user_id
    WHERE lower(p.username) = lower(_username) AND lower(c.serial) = lower(_serial) LIMIT 1;
  IF v_cert.id IS NULL THEN RETURN NULL; END IF;
  SELECT id, first_name, last_name, username, avatar_url, country INTO v_profile FROM public.profiles WHERE id = v_cert.user_id;
  SELECT id, title, image_url, total_lessons INTO v_course FROM public.courses WHERE id = v_cert.course_id;
  SELECT created_at INTO v_enrolled FROM public.course_enrollments
    WHERE user_id = v_cert.user_id AND course_id = v_cert.course_id ORDER BY created_at ASC LIMIT 1;
  SELECT COALESCE(v_course.total_lessons, count(*)::int) INTO v_total_lessons
    FROM public.course_sections WHERE course_id = v_cert.course_id;
  RETURN jsonb_build_object(
    'serial', v_cert.serial,
    'issued_at', v_cert.issued_at,
    'score_pct', v_cert.score_pct,
    'grade', CASE WHEN v_cert.score_pct IS NULL THEN NULL
                  WHEN v_cert.score_pct >= 85 THEN 'Upper Class' ELSE 'Lower Class' END,
    'start_date', v_enrolled,
    'end_date', v_cert.issued_at,
    'user', jsonb_build_object(
      'first_name', v_profile.first_name, 'last_name', v_profile.last_name,
      'username', v_profile.username, 'avatar_url', v_profile.avatar_url, 'country', v_profile.country
    ),
    'course', jsonb_build_object('title', v_course.title, 'image_url', v_course.image_url, 'total_lessons', v_total_lessons)
  );
END $$;

-- =========================================================
-- 5. USERNAME → EMAIL: revoke anon, add server-side login helper
-- =========================================================
REVOKE EXECUTE ON FUNCTION public.get_email_for_username(text) FROM anon, authenticated, public;

-- =========================================================
-- 6. CALENDAR: null-owner events readable only by admin
-- =========================================================
DROP POLICY IF EXISTS "cal read authed" ON public.calendar_events;
CREATE POLICY "cal read own or admin" ON public.calendar_events FOR SELECT TO authenticated
USING ((auth.uid() = user_id) OR public.has_role(auth.uid(),'admin'));

-- =========================================================
-- 7. PROFILES: hide phone from broad reads
-- =========================================================
REVOKE SELECT (phone) ON public.profiles FROM anon, authenticated;
-- get_my_auth_state / get_user_detail / get_public_certificate are SECURITY DEFINER
-- and continue to expose phone to the owner / admin as intended.

-- =========================================================
-- 8. Revoke anon EXECUTE on internal SECURITY DEFINER functions
-- =========================================================
REVOKE EXECUTE ON FUNCTION public.get_my_auth_state() FROM anon;
REVOKE EXECUTE ON FUNCTION public.record_my_activity() FROM anon;
REVOKE EXECUTE ON FUNCTION public.admin_review_purchase(uuid, text) FROM anon;
REVOKE EXECUTE ON FUNCTION public.has_role(uuid, app_role) FROM anon;
REVOKE EXECUTE ON FUNCTION public.get_user_detail(uuid) FROM anon;
REVOKE EXECUTE ON FUNCTION public.join_community_by_code(text) FROM anon;
REVOKE EXECUTE ON FUNCTION public.is_community_owner(uuid, uuid) FROM anon;
REVOKE EXECUTE ON FUNCTION public.is_community_member(uuid, uuid) FROM anon;
REVOKE EXECUTE ON FUNCTION public.gen_invite_code() FROM anon, authenticated, public;
REVOKE EXECUTE ON FUNCTION public.admin_list_purchases(text) FROM anon;
REVOKE EXECUTE ON FUNCTION public.decide_join_request(uuid, boolean) FROM anon;
REVOKE EXECUTE ON FUNCTION public.create_post_and_broadcast(text, text, text, text) FROM anon;
REVOKE EXECUTE ON FUNCTION public.get_active_history(text) FROM anon;
REVOKE EXECUTE ON FUNCTION public.request_or_join_community(uuid) FROM anon;
REVOKE EXECUTE ON FUNCTION public.get_admin_stats() FROM anon;
