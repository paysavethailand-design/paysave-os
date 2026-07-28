#!/usr/bin/env bash
set -euo pipefail

ROOT="$(cd "$(dirname "${BASH_SOURCE[0]}")/../.." && pwd)"
ENV_FILE="${PAYSAVE_LOCAL_DB_ENV_FILE:-$ROOT/.env.local-db}"
COMPOSE_FILE="$ROOT/docker/postgres.local.yml"
compose=(docker compose --env-file "$ENV_FILE" -f "$COMPOSE_FILE")

"${compose[@]}" exec -T postgres sh -c \
  'PGPASSWORD="$POSTGRES_PASSWORD" psql -v ON_ERROR_STOP=1 -U "$POSTGRES_USER" -d "$POSTGRES_DB"' <<'SQL'
DO $$
DECLARE
  schema_count integer;
  table_count integer;
  forced_rls_count integer;
  permission_count integer;
BEGIN
  SELECT count(*) INTO schema_count
  FROM pg_namespace
  WHERE nspname IN (
    'admin','tenant','master_data','iam','crm','recovery','workforce','performance',
    'finance','communication','document_store','audit','platform','approval','workflow',
    'sla','knowledge','ai','report','asset','warehouse','event_catalog'
  );
  IF schema_count <> 22 THEN
    RAISE EXCEPTION 'Expected 22 approved schemas, found %', schema_count;
  END IF;

  SELECT count(*) INTO table_count
  FROM pg_class c
  JOIN pg_namespace n ON n.oid = c.relnamespace
  WHERE c.relkind IN ('r','p')
    AND n.nspname IN (
      'tenant','master_data','iam','crm','recovery','workforce','performance','finance',
      'communication','document_store','audit','platform','approval','workflow','sla',
      'knowledge','ai','report','asset','warehouse','event_catalog'
    )
    AND c.relname NOT LIKE '%_default';
  IF table_count <> 114 THEN
    RAISE EXCEPTION 'Expected 114 approved M001-M016 tables, found %', table_count;
  END IF;

  SELECT count(*) INTO forced_rls_count
  FROM pg_class c
  JOIN pg_namespace n ON n.oid = c.relnamespace
  WHERE c.relkind IN ('r','p')
    AND c.relrowsecurity
    AND c.relforcerowsecurity
    AND n.nspname NOT IN ('pg_catalog','information_schema');
  IF forced_rls_count = 0 THEN
    RAISE EXCEPTION 'No FORCE RLS tables found';
  END IF;

  SELECT count(*) INTO permission_count
  FROM iam.permissions
  WHERE code IN (
    'users.read','users.manage','roles.read','roles.manage',
    'permissions.read','permissions.manage','partners.read','partners.manage',
    'customers.read','customers.manage','assets.read','assets.manage'
  );
  IF permission_count <> 12 THEN
    RAISE EXCEPTION 'Expected 12 Backend Sprint #1 permissions, found %', permission_count;
  END IF;
END $$;

SELECT current_database() AS database_name,
       current_setting('server_version') AS postgres_version,
       (SELECT count(*) FROM pg_namespace WHERE nspname NOT LIKE 'pg_%' AND nspname <> 'information_schema') AS non_system_schemas,
       (SELECT count(*) FROM pg_class c JOIN pg_namespace n ON n.oid=c.relnamespace WHERE c.relkind IN ('r','p') AND n.nspname NOT IN ('pg_catalog','information_schema') AND c.relname NOT LIKE '%_default') AS application_tables,
       (SELECT count(*) FROM pg_policies) AS rls_policies,
       (SELECT count(*) FROM pg_extension WHERE extname='pgcrypto') AS pgcrypto_installed;
SQL

printf 'PAYSAVE_LOCAL_DATABASE_VERIFY_PASS\n'
