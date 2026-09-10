DROP SCHEMA public CASCADE;
CREATE SCHEMA public;
GRANT ALL ON SCHEMA public TO postgres, sandbox_exec;
GRANT USAGE ON SCHEMA public TO anon, authenticated, service_role;