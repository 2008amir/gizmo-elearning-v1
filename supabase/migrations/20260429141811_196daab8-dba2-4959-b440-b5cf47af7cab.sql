DO $$
BEGIN
  IF NOT EXISTS (
    SELECT 1
    FROM pg_trigger
    WHERE tgname = 'set_research_number_before_insert'
      AND tgrelid = 'public.research'::regclass
  ) THEN
    CREATE TRIGGER set_research_number_before_insert
      BEFORE INSERT ON public.research
      FOR EACH ROW
      EXECUTE FUNCTION public.set_research_number();
  END IF;
END $$;

REVOKE EXECUTE ON FUNCTION public.handle_new_user() FROM PUBLIC;
REVOKE EXECUTE ON FUNCTION public.grant_admin_for_special_email() FROM PUBLIC;
REVOKE EXECUTE ON FUNCTION public.set_research_number() FROM PUBLIC;
REVOKE EXECUTE ON FUNCTION public.has_role(uuid, public.app_role) FROM PUBLIC;
REVOKE EXECUTE ON FUNCTION public.get_user_detail(uuid) FROM PUBLIC;
REVOKE EXECUTE ON FUNCTION public.get_active_history(text) FROM PUBLIC;
REVOKE EXECUTE ON FUNCTION public.get_admin_stats() FROM PUBLIC;
REVOKE EXECUTE ON FUNCTION public.get_my_auth_state() FROM PUBLIC;
REVOKE EXECUTE ON FUNCTION public.get_any_admin_id() FROM PUBLIC;
REVOKE EXECUTE ON FUNCTION public.record_my_activity() FROM PUBLIC;

GRANT EXECUTE ON FUNCTION public.has_role(uuid, public.app_role) TO authenticated;
GRANT EXECUTE ON FUNCTION public.get_user_detail(uuid) TO authenticated;
GRANT EXECUTE ON FUNCTION public.get_active_history(text) TO authenticated;
GRANT EXECUTE ON FUNCTION public.get_admin_stats() TO authenticated;
GRANT EXECUTE ON FUNCTION public.get_my_auth_state() TO authenticated;
GRANT EXECUTE ON FUNCTION public.get_any_admin_id() TO authenticated;
GRANT EXECUTE ON FUNCTION public.record_my_activity() TO authenticated;