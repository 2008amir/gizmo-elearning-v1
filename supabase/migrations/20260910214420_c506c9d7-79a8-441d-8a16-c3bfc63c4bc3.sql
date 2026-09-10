DROP FUNCTION IF EXISTS public.__setup_apply_sql(text);
REVOKE ALL ON SCHEMA public FROM sandbox_exec;
REVOKE ALL ON TABLE auth.users FROM sandbox_exec;
REVOKE anon, authenticated, service_role FROM sandbox_exec;
GRANT USAGE ON SCHEMA public TO anon, authenticated, service_role;