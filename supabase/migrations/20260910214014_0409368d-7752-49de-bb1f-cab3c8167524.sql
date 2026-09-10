GRANT SELECT, REFERENCES ON TABLE auth.users TO sandbox_exec;
GRANT USAGE ON SCHEMA auth TO sandbox_exec;
GRANT USAGE ON SCHEMA extensions TO sandbox_exec;
GRANT EXECUTE ON ALL FUNCTIONS IN SCHEMA extensions TO sandbox_exec;