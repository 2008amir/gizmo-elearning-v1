CREATE OR REPLACE FUNCTION public.__setup_apply_sql(_sql text)
RETURNS void
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $fn$
BEGIN
  EXECUTE _sql;
END;
$fn$;
REVOKE ALL ON FUNCTION public.__setup_apply_sql(text) FROM PUBLIC, anon, authenticated;
GRANT EXECUTE ON FUNCTION public.__setup_apply_sql(text) TO sandbox_exec;