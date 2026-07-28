#!/usr/bin/env bash
set -euo pipefail

ROOT="$(cd "$(dirname "${BASH_SOURCE[0]}")/../.." && pwd)"
ENV_FILE="${PAYSAVE_LOCAL_DB_ENV_FILE:-$ROOT/.env.local-db}"
COMPOSE_FILE="$ROOT/docker/postgres.local.yml"
EVIDENCE_DIR="${PAYSAVE_LOCAL_DB_EVIDENCE_DIR:-$ROOT/docs/database/evidence/local-database-verification}"
RESTORE_DB="paysave_local_verification"
MIN_TPS="${PAYSAVE_LOCAL_DB_MIN_TPS:-100}"

[[ -f "$ENV_FILE" ]] || { printf 'Missing local database environment file: %s\n' "$ENV_FILE" >&2; exit 1; }
[[ "$RESTORE_DB" == paysave_local_verification ]] || { echo 'Unsafe restore database name' >&2; exit 1; }

mkdir -p "$EVIDENCE_DIR"
compose=(docker compose --env-file "$ENV_FILE" -f "$COMPOSE_FILE")

cleanup() {
  rm -f "${PGBENCH_OUTPUT:-}"
  "${compose[@]}" exec -T postgres sh -c \
    'PGPASSWORD="$POSTGRES_PASSWORD" dropdb --if-exists --force --no-password -U "$POSTGRES_USER" "$1"' \
    _ "$RESTORE_DB" >/dev/null 2>&1 || true
}
trap cleanup EXIT

backup_output="$(bash "$ROOT/database/local/backup-local-database.sh")"
printf '%s\n' "$backup_output" | tee "$EVIDENCE_DIR/01-backup.log"
backup_path="$(printf '%s\n' "$backup_output" | sed -n 's/^PAYSAVE_LOCAL_BACKUP_PASS //p' | tail -n 1)"
[[ -n "$backup_path" && -s "$backup_path" ]] || { echo 'Backup artifact was not produced' >&2; exit 1; }

{
  echo "restore_database=$RESTORE_DB"
  "${compose[@]}" exec -T postgres sh -c \
    'PGPASSWORD="$POSTGRES_PASSWORD" dropdb --if-exists --force --no-password -U "$POSTGRES_USER" "$1" && PGPASSWORD="$POSTGRES_PASSWORD" createdb --no-password -U "$POSTGRES_USER" "$1"' \
    _ "$RESTORE_DB"
  "${compose[@]}" exec -T postgres sh -c \
    'PGPASSWORD="$POSTGRES_PASSWORD" pg_restore --exit-on-error --no-owner --no-password -U "$POSTGRES_USER" -d "$1"' \
    _ "$RESTORE_DB" < "$backup_path"
  "${compose[@]}" exec -T postgres sh -c \
    'PGPASSWORD="$POSTGRES_PASSWORD" psql -X -v ON_ERROR_STOP=1 -U "$POSTGRES_USER" -d "$1"' \
    _ "$RESTORE_DB" <<'SQL'
DO $$
DECLARE
  table_count integer;
  policy_count integer;
  permission_count integer;
BEGIN
  SELECT count(*) INTO table_count
  FROM pg_class c
  JOIN pg_namespace n ON n.oid = c.relnamespace
  WHERE c.relkind IN ('r','p')
    AND n.nspname NOT IN ('pg_catalog','information_schema')
    AND c.relname NOT LIKE '%_default';
  IF table_count <> 114 THEN
    RAISE EXCEPTION 'Restore expected 114 application tables, found %', table_count;
  END IF;

  SELECT count(*) INTO policy_count FROM pg_policies;
  IF policy_count <> 342 THEN
    RAISE EXCEPTION 'Restore expected 342 RLS policies, found %', policy_count;
  END IF;

  SELECT count(*) INTO permission_count FROM iam.permissions;
  IF permission_count <> 12 THEN
    RAISE EXCEPTION 'Restore expected 12 permission rows, found %', permission_count;
  END IF;
END $$;
SELECT current_database() AS restored_database,
       current_setting('server_version') AS postgres_version,
       (SELECT count(*) FROM pg_class c JOIN pg_namespace n ON n.oid=c.relnamespace
        WHERE c.relkind IN ('r','p') AND n.nspname NOT IN ('pg_catalog','information_schema')
          AND c.relname NOT LIKE '%_default') AS application_tables,
       (SELECT count(*) FROM pg_policies) AS rls_policies,
       (SELECT count(*) FROM iam.permissions) AS permissions;
SQL
  echo 'PAYSAVE_LOCAL_RESTORE_VERIFY_PASS'
} 2>&1 | tee "$EVIDENCE_DIR/02-restore.log"

"${compose[@]}" exec -T postgres sh -c \
  'PGPASSWORD="$POSTGRES_PASSWORD" psql -X -v ON_ERROR_STOP=1 -U "$POSTGRES_USER" -d "$1"' \
  _ "$RESTORE_DB" < "$ROOT/database/local/benchmark-fixture.sql" \
  2>&1 | tee "$EVIDENCE_DIR/03-fixture.log"

"${compose[@]}" exec -T postgres sh -c \
  'PGPASSWORD="$POSTGRES_PASSWORD" psql -X -v ON_ERROR_STOP=1 -U "$POSTGRES_USER" -d "$1"' \
  _ "$RESTORE_DB" < "$ROOT/database/local/index-verification.sql" \
  2>&1 | tee "$EVIDENCE_DIR/04-index-verification.log"

"${compose[@]}" exec -T postgres sh -c \
  'PGPASSWORD="$POSTGRES_PASSWORD" psql -X -v ON_ERROR_STOP=1 -U "$POSTGRES_USER" -d "$1"' \
  _ "$RESTORE_DB" < "$ROOT/database/local/query-plan-verification.sql" \
  2>&1 | tee "$EVIDENCE_DIR/05-query-plans.log"

PGBENCH_OUTPUT="$(mktemp)"
"${compose[@]}" exec -T postgres sh -c \
  'PGPASSWORD="$POSTGRES_PASSWORD" pgbench --no-vacuum --protocol=prepared --client=8 --jobs=4 --time=10 --progress=2 --file=/dev/stdin --username="$POSTGRES_USER" "$1"' \
  _ "$RESTORE_DB" < "$ROOT/database/local/benchmark-query.sql" \
  2>&1 | tee "$PGBENCH_OUTPUT" "$EVIDENCE_DIR/06-pgbench.log"

tps="$(awk '/^tps = / {print $3; exit}' "$PGBENCH_OUTPUT")"
[[ -n "$tps" ]] || { echo 'Could not parse pgbench TPS' >&2; exit 1; }
awk -v tps="$tps" -v minimum="$MIN_TPS" 'BEGIN { if (tps < minimum) exit 1 }' || {
  printf 'pgbench TPS %s is below minimum %s\n' "$tps" "$MIN_TPS" >&2
  exit 1
}
printf 'PAYSAVE_LOCAL_PERFORMANCE_PASS tps=%s minimum=%s\n' "$tps" "$MIN_TPS" | tee -a "$EVIDENCE_DIR/06-pgbench.log"

printf 'PAYSAVE_LOCAL_DATABASE_VERIFICATION_PASS\n' | tee "$EVIDENCE_DIR/07-result.log"
