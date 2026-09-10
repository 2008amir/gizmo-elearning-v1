-- Trigger and internal-only functions must not be callable through the API.
REVOKE EXECUTE ON FUNCTION public.assignment_submissions_guard() FROM anon, authenticated;
REVOKE EXECUTE ON FUNCTION public.communities_after_insert() FROM anon, authenticated;
REVOKE EXECUTE ON FUNCTION public.community_members_count_sync() FROM anon, authenticated;
REVOKE EXECUTE ON FUNCTION public.grant_admin_for_special_email() FROM anon, authenticated;
REVOKE EXECUTE ON FUNCTION public.handle_new_user() FROM anon, authenticated;
REVOKE EXECUTE ON FUNCTION public.set_research_number() FROM anon, authenticated;
REVOKE EXECUTE ON FUNCTION public.trg_course_reviews_agg() FROM anon, authenticated;
REVOKE EXECUTE ON FUNCTION public.communities_updated_at() FROM anon, authenticated;
REVOKE EXECUTE ON FUNCTION public.update_updated_at_column() FROM anon, authenticated;
REVOKE EXECUTE ON FUNCTION public.get_email_for_username(text) FROM anon, authenticated;
REVOKE EXECUTE ON FUNCTION public.get_purchase_stats() FROM anon, authenticated;
REVOKE EXECUTE ON FUNCTION public.refresh_course_rating(uuid) FROM anon, authenticated;
REVOKE EXECUTE ON FUNCTION public.gen_invite_code() FROM anon, authenticated;

-- Signed-in-only helpers: remove anonymous access.
REVOKE EXECUTE ON FUNCTION public.has_role(uuid, public.app_role) FROM anon;
REVOKE EXECUTE ON FUNCTION public.is_community_member(uuid, uuid) FROM anon;
REVOKE EXECUTE ON FUNCTION public.is_community_owner(uuid, uuid) FROM anon;
REVOKE EXECUTE ON FUNCTION public.admin_list_purchases(text) FROM anon;
REVOKE EXECUTE ON FUNCTION public.admin_review_purchase(uuid, text) FROM anon;
REVOKE EXECUTE ON FUNCTION public.create_post_and_broadcast(text, text, text, text) FROM anon;
REVOKE EXECUTE ON FUNCTION public.decide_join_request(uuid, boolean) FROM anon;
REVOKE EXECUTE ON FUNCTION public.get_active_history(text) FROM anon;
REVOKE EXECUTE ON FUNCTION public.get_admin_stats() FROM anon;
REVOKE EXECUTE ON FUNCTION public.get_any_admin_id() FROM anon;
REVOKE EXECUTE ON FUNCTION public.get_exam_questions(uuid) FROM anon;
REVOKE EXECUTE ON FUNCTION public.get_my_auth_state() FROM anon;
REVOKE EXECUTE ON FUNCTION public.get_user_detail(uuid) FROM anon;
REVOKE EXECUTE ON FUNCTION public.grade_assignment_objective(uuid) FROM anon;
REVOKE EXECUTE ON FUNCTION public.join_community_by_code(text) FROM anon;
REVOKE EXECUTE ON FUNCTION public.record_my_activity() FROM anon;
REVOKE EXECUTE ON FUNCTION public.request_or_join_community(uuid) FROM anon;
REVOKE EXECUTE ON FUNCTION public.submit_exam(uuid, jsonb, uuid[]) FROM anon;