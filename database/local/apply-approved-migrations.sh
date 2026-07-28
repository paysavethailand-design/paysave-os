#!/usr/bin/env bash
set -euo pipefail

ROOT="$(cd "$(dirname "${BASH_SOURCE[0]}")/../.." && pwd)"
ENV_FILE="${PAYSAVE_LOCAL_DB_ENV_FILE:-$ROOT/.env.local-db}"
COMPOSE_FILE="$ROOT/docker/postgres.local.yml"

if [[ ! -f "$ENV_FILE" ]]; then
  printf 'Missing local database environment file: %s\n' "$ENV_FILE" >&2
  exit 1
fi

compose=(docker compose --env-file "$ENV_FILE" -f "$COMPOSE_FILE")

files=(
  database/migrations/stage3_2_batch1/M001_foundation.sql
  database/migrations/stage3_2_batch1/M002_master_data.sql
  database/migrations/stage3_2_batch1/M003_iam.sql
  database/migrations/stage3_2_batch2/M004_partner.sql
  database/migrations/stage3_2_batch2/M005_customer.sql
  database/migrations/stage3_2_batch2/M006_contract.sql
  database/migrations/stage3_2_batch2/M007_asset.sql
  database/migrations/stage3_2_batch3/M008_recovery.sql
  database/migrations/stage3_2_batch3/M009_workflow.sql
  database/migrations/stage3_2_batch3/M010_workforce.sql
  database/migrations/stage3_2_batch4/M011_finance.sql
  database/migrations/stage3_2_batch4/M012_performance.sql
  database/migrations/stage3_2_batch4/M013_document.sql
  database/migrations/stage3_2_batch5/M014_approval.sql
  database/migrations/stage3_2_batch5/M015_notification.sql
  database/migrations/stage3_2_batch5/M016_platform.sql
)

for relative in "${files[@]}"; do
  file="$ROOT/$relative"
  [[ -f "$file" ]] || { printf 'Missing approved migration: %s\n' "$file" >&2; exit 1; }
  printf 'Applying %s\n' "$(basename "$file")"
  "${compose[@]}" exec -T postgres sh -c \
    'PGPASSWORD="$POSTGRES_PASSWORD" psql -v ON_ERROR_STOP=1 -U "$POSTGRES_USER" -d "$POSTGRES_DB"' < "$file"
done

printf 'Applying Backend Sprint #1 permission catalog\n'
"${compose[@]}" exec -T postgres sh -c \
  'PGPASSWORD="$POSTGRES_PASSWORD" psql -v ON_ERROR_STOP=1 -U "$POSTGRES_USER" -d "$POSTGRES_DB"' \
  < "$ROOT/database/seeds/0001_backend_sprint1_permission_catalog.sql"

printf 'PAYSAVE_LOCAL_M001_M016_APPLY_PASS\n'
