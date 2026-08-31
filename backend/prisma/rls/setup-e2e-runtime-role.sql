-- Disposable E2E role only. Production roles must be provisioned by the
-- infrastructure/secrets layer with unique credentials.
DO $e2e_role$
BEGIN
  IF EXISTS (SELECT 1 FROM pg_catalog.pg_roles WHERE rolname = 'tenant_e2e_runtime') THEN
    ALTER ROLE tenant_e2e_runtime
      WITH LOGIN PASSWORD 'tenant-e2e-runtime-password' NOSUPERUSER NOCREATEDB NOCREATEROLE NOINHERIT NOBYPASSRLS;
  ELSE
    CREATE ROLE tenant_e2e_runtime
      WITH LOGIN PASSWORD 'tenant-e2e-runtime-password' NOSUPERUSER NOCREATEDB NOCREATEROLE NOINHERIT NOBYPASSRLS;
  END IF;
END
$e2e_role$;

GRANT USAGE ON SCHEMA public TO tenant_e2e_runtime;
GRANT SELECT, INSERT, UPDATE, DELETE ON ALL TABLES IN SCHEMA public TO tenant_e2e_runtime;
GRANT USAGE, SELECT ON ALL SEQUENCES IN SCHEMA public TO tenant_e2e_runtime;
