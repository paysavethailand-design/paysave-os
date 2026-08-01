#!/usr/bin/env bash
set -Eeuo pipefail

ROOT_DIR="$(cd "$(dirname "${BASH_SOURCE[0]}")/../.." && pwd)"
MIGRATION_DIR="${ROOT_DIR}/supabase/migrations"
CONTAINER_NAME="paysave-supabase-ci-${RANDOM}-${$}"
POSTGRES_PASSWORD="paysave-ci-disposable"
DATABASE_NAME="paysave_supabase_ci"

schema_migrations=(
  "20260801_000001_initial_schema.sql"
  "20260801_000002_rls.sql"
  "20260801_000003_storage.sql"
)
reference_migrations=("20260801_000004_seed_reference.sql")

cleanup() { docker rm -f "${CONTAINER_NAME}" >/dev/null 2>&1 || true; }
trap cleanup EXIT INT TERM

command -v docker >/dev/null || { echo "ERROR: docker is required" >&2; exit 1; }
[[ -d "${MIGRATION_DIR}" ]] || { echo "ERROR: missing supabase/migrations" >&2; exit 1; }

for filename in "${schema_migrations[@]}" "${reference_migrations[@]}"; do
  path="${MIGRATION_DIR}/${filename}"
  [[ -s "${path}" ]] || { echo "ERROR: missing or empty supabase/migrations/${filename}" >&2; exit 1; }
done

actual_count="$(find "${MIGRATION_DIR}" -maxdepth 1 -type f -name '*.sql' | wc -l | tr -d ' ')"
expected_count="$((${#schema_migrations[@]} + ${#reference_migrations[@]}))"
[[ "${actual_count}" -eq "${expected_count}" ]] || {
  echo "ERROR: expected ${expected_count} Supabase migrations, found ${actual_count}" >&2
  find "${MIGRATION_DIR}" -maxdepth 1 -type f -name '*.sql' -print | sort >&2
  exit 1
}

if grep -R -n -E 'ADD[[:space:]]+CONSTRAINT[[:space:]]+IF[[:space:]]+NOT[[:space:]]+EXISTS' "${MIGRATION_DIR}"; then
  echo "ERROR: unsupported PostgreSQL constraint syntax found in supabase/migrations" >&2
  exit 1
fi

image="${POSTGRES_IMAGE:-postgres:17-alpine@sha256:742f40ea20b9ff2ff31db5458d127452988a2164df9e17441e191f3b72252193}"
echo "Starting disposable ${image} database"
docker run --detach --rm --name "${CONTAINER_NAME}" \
  --env "POSTGRES_PASSWORD=${POSTGRES_PASSWORD}" \
  --env "POSTGRES_DB=${DATABASE_NAME}" \
  "${image}" >/dev/null

for attempt in $(seq 1 45); do
  database_ready="$(
    docker exec "${CONTAINER_NAME}" psql -Atq -U postgres -d postgres \
      -c "SELECT 1 FROM pg_database WHERE datname = '${DATABASE_NAME}'" 2>/dev/null || true
  )"
  if [[ "${database_ready}" == "1" ]]; then
    break
  fi
  [[ "${attempt}" -lt 45 ]] || { echo "ERROR: PostgreSQL database did not become ready" >&2; exit 1; }
  sleep 1
done

server_major="$(docker exec "${CONTAINER_NAME}" psql -Atq -U postgres -d "${DATABASE_NAME}" -c "SHOW server_version_num" | cut -c1-2)"
[[ "${server_major}" == "17" ]] || { echo "ERROR: expected PostgreSQL 17, got ${server_major}" >&2; exit 1; }

# Minimal Supabase-owned objects required to parse and exercise project migrations.
docker exec -i "${CONTAINER_NAME}" psql -X -v ON_ERROR_STOP=1 -U postgres -d "${DATABASE_NAME}" >/dev/null <<'SQL'
CREATE ROLE authenticated NOLOGIN;
CREATE ROLE service_role NOLOGIN;
CREATE SCHEMA auth;
CREATE SCHEMA storage;
CREATE TABLE auth.users (id uuid PRIMARY KEY);
CREATE FUNCTION auth.uid() RETURNS uuid LANGUAGE sql STABLE AS 'SELECT NULL::uuid';
CREATE TABLE storage.objects (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  bucket_id text NOT NULL,
  owner uuid
);
SQL

for filename in "${schema_migrations[@]}"; do
  echo "Applying supabase/migrations/${filename}"
  docker exec -i "${CONTAINER_NAME}" psql -X -v ON_ERROR_STOP=1 -U postgres -d "${DATABASE_NAME}" \
    < "${MIGRATION_DIR}/${filename}" >/dev/null
done

catalog="$(docker exec "${CONTAINER_NAME}" psql -Atq -U postgres -d "${DATABASE_NAME}" -c "SELECT json_build_object('public_tables',(SELECT count(*) FROM pg_tables WHERE schemaname='public'),'project_policies',(SELECT count(*) FROM pg_policies WHERE schemaname IN ('public','storage')));")"
public_tables="$(docker exec "${CONTAINER_NAME}" psql -Atq -U postgres -d "${DATABASE_NAME}" -c "SELECT count(*) FROM pg_tables WHERE schemaname='public';")"
[[ "${public_tables}" == "13" ]] || { echo "ERROR: expected 13 public tables, got ${public_tables}" >&2; exit 1; }

echo "REFERENCE_SEED_VALIDATED supabase/migrations/${reference_migrations[0]} (presence/static checks only)"
echo "SUPABASE_DATABASE_VERIFICATION_PASS ${catalog}"
