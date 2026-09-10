
CREATE OR REPLACE FUNCTION public.get_public_certificate(_username text, _serial text)
RETURNS jsonb
LANGUAGE plpgsql
STABLE
SECURITY DEFINER
SET search_path = public, auth
AS $$
DECLARE
  v_cert record;
  v_profile record;
  v_course record;
  v_email text;
  v_enrolled timestamptz;
  v_total_lessons int;
BEGIN
  SELECT c.* INTO v_cert
    FROM public.certificates c
    JOIN public.profiles p ON p.id = c.user_id
    WHERE lower(p.username) = lower(_username)
      AND lower(c.serial) = lower(_serial)
    LIMIT 1;
  IF v_cert.id IS NULL THEN
    RETURN NULL;
  END IF;

  SELECT id, first_name, last_name, username, avatar_url, country, phone
    INTO v_profile FROM public.profiles WHERE id = v_cert.user_id;
  SELECT id, title, image_url, total_lessons
    INTO v_course FROM public.courses WHERE id = v_cert.course_id;
  SELECT email::text INTO v_email FROM auth.users WHERE id = v_cert.user_id;
  SELECT created_at INTO v_enrolled
    FROM public.course_enrollments
    WHERE user_id = v_cert.user_id AND course_id = v_cert.course_id
    ORDER BY created_at ASC LIMIT 1;

  SELECT COALESCE(v_course.total_lessons, count(*)::int) INTO v_total_lessons
    FROM public.course_sections WHERE course_id = v_cert.course_id;

  RETURN jsonb_build_object(
    'serial', v_cert.serial,
    'issued_at', v_cert.issued_at,
    'score_pct', v_cert.score_pct,
    'grade', CASE WHEN v_cert.score_pct IS NULL THEN NULL
                  WHEN v_cert.score_pct >= 85 THEN 'Upper Class'
                  ELSE 'Lower Class' END,
    'start_date', v_enrolled,
    'end_date', v_cert.issued_at,
    'user', jsonb_build_object(
      'first_name', v_profile.first_name,
      'last_name', v_profile.last_name,
      'username', v_profile.username,
      'avatar_url', v_profile.avatar_url,
      'country', v_profile.country,
      'phone', v_profile.phone,
      'email', v_email
    ),
    'course', jsonb_build_object(
      'title', v_course.title,
      'image_url', v_course.image_url,
      'total_lessons', v_total_lessons
    )
  );
END $$;

GRANT EXECUTE ON FUNCTION public.get_public_certificate(text, text) TO anon, authenticated;
