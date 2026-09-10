CREATE OR REPLACE FUNCTION public.submit_exam(_course_id uuid, _answers jsonb, _question_ids uuid[])
 RETURNS jsonb
 LANGUAGE plpgsql
 SECURITY DEFINER
 SET search_path TO 'public'
AS $function$
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
  VALUES (v_uid, _course_id, v_score, v_passed, _answers, to_jsonb(_question_ids))
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
END $function$;