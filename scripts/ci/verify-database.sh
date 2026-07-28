#!/usr/bin/env bash
set -Eeuo pipefail

ROOT_DIR="$(cd "$(dirname "${BASH_SOURCE[0]}")/../.." && pwd)"
CONTAINER_NAME="paysave-ci-postgres-${RANDOM}-${$}"
POSTGRES_PASSWORD="paysave-ci-disposable"
DATABASE_NAME="paysave_ci"

migrations=(
  "database/migrations/stage3_2_batch1/M001_foundation.sql"
  "database/migrations/stage3_2_batch1/M002_master_data.sql"
  "database/migrations/stage3_2_batch1/M003_iam.sql"
  "database/migrations/stage3_2_batch2/M004_partner.sql"
  "database/migrations/stage3_2_batch2/M005_customer.sql"
  "database/migrations/stage3_2_batch2/M006_contract.sql"
  "database/migrations/stage3_2_batch2/M007_asset.sql"
  "database/migrations/stage3_2_batch3/M008_recovery.sql"
  "database/migrations/stage3_2_batch3/M009_workflow.sql"
  "database/migrations/stage3_2_batch3/M010_workforce.sql"
  "database/migrations/stage3_2_batch4/M011_finance.sql"
  "database/migrations/stage3_2_batch4/M012_performance.sql"
  "database/migrations/stage3_2_batch4/M013_document.sql"
  "database/migrations/stage3_2_batch5/M014_approval.sql"
  "database/migrations/stage3_2_batch5/M015_notification.sql"
  "database/migrations/stage3_2_batch5/M016_platform.sql"
  "database/migrations/stage4_3_sprint2/M017_critical_release_blockers.sql"
  "database/migrations/stage4_3_sprint2/M018_asset_rpc_execution_security.sql"
)
verifications=(
  "database/tests/stage3_2_batch1_verify.sql"
  "database/tests/stage3_2_batch2_verify.sql"
  "database/tests/stage3_2_batch3_verify.sql"
  "database/tests/stage3_2_batch4_verify.sql"
  "database/tests/stage3_2_batch5_verify.sql"
  "database/tests/stage4_3_sprint2_verify.sql"
)
seeds=(
  "database/seeds/0001_backend_sprint1_permission_catalog.sql"
  "database/seeds/0002_backend_sprint2_recovery_permission_catalog.sql"
)

cleanup() { docker rm -f "${CONTAINER_NAME}" >/dev/null 2>&1 || true; }
trap cleanup EXIT INT TERM
command -v docker >/dev/null || { echo "ERROR: docker is required" >&2; exit 1; }
for relative_path in "${migrations[@]}" "${verifications[@]}" "${seeds[@]}"; do
  [[ -f "${ROOT_DIR}/${relative_path}" ]] || { echo "ERROR: missing ${relative_path}" >&2; exit 1; }
done
unexpected="$(find "${ROOT_DIR}/database/migrations" -type f \( -name 'M019*.sql' -o -name 'M020*.sql' -o -name 'M021*.sql' \) -print)"
[[ -z "${unexpected}" ]] || { echo "ERROR: migrations beyond CTO-authorized Stage 4.3.2 remediation detected:" >&2; echo "${unexpected}" >&2; exit 1; }

image="${POSTGRES_IMAGE:-postgres:17-alpine@sha256:742f40ea20b9ff2ff31db5458d127452988a2164df9e17441e191f3b72252193}"
echo "Starting disposable ${image} database"
docker run --detach --rm --name "${CONTAINER_NAME}" --env "POSTGRES_PASSWORD=${POSTGRES_PASSWORD}" --env "POSTGRES_DB=${DATABASE_NAME}" "${image}" >/dev/null
for attempt in $(seq 1 45); do
  if docker exec "${CONTAINER_NAME}" pg_isready -U postgres -d "${DATABASE_NAME}" >/dev/null 2>&1; then break; fi
  [[ "${attempt}" -lt 45 ]] || { echo "ERROR: PostgreSQL did not become ready" >&2; exit 1; }
  sleep 1
done
server_major="$(docker exec "${CONTAINER_NAME}" psql -Atq -U postgres -d "${DATABASE_NAME}" -c "SHOW server_version_num" | cut -c1-2)"
[[ "${server_major}" == "17" ]] || { echo "ERROR: expected PostgreSQL 17, got ${server_major}" >&2; exit 1; }
apply_file() {
  local database="$1"
  local relative_path="$2"
  docker exec -i "${CONTAINER_NAME}" psql -X -v ON_ERROR_STOP=1 -U postgres -d "${database}" < "${ROOT_DIR}/${relative_path}"
}

cumulative_count=0
batch_counts=(3 4 3 3 3 2)
for batch_index in "${!batch_counts[@]}"; do
  cumulative_count="$((cumulative_count + batch_counts[batch_index]))"
  batch_number="$((batch_index + 1))"
  batch_database="paysave_batch_${batch_number}"
  echo "Applying and verifying isolated Batch #${batch_number}"
  docker exec "${CONTAINER_NAME}" createdb -U postgres "${batch_database}"
  for ((index = 0; index < cumulative_count; index++)); do
    apply_file "${batch_database}" "${migrations[$index]}" >/dev/null
  done
  apply_file "${batch_database}" "${verifications[$batch_index]}"
done

echo "Applying approved M001-M018 to full baseline"
for migration in "${migrations[@]}"; do apply_file "${DATABASE_NAME}" "${migration}" >/dev/null; done
echo "Replaying approved M001-M018 for idempotency"
for migration in "${migrations[@]}"; do apply_file "${DATABASE_NAME}" "${migration}" >/dev/null; done
for pass in first replay; do
  for seed in "${seeds[@]}"; do apply_file "${DATABASE_NAME}" "${seed}" >/dev/null; done
done
catalog="$(docker exec "${CONTAINER_NAME}" psql -Atq -U postgres -d "${DATABASE_NAME}" -c "SELECT json_build_object('tables',(SELECT count(*) FROM pg_tables WHERE schemaname NOT IN ('pg_catalog','information_schema')),'permissions',(SELECT count(*) FROM iam.permissions),'forced_rls_tables',(SELECT count(*) FROM pg_class c JOIN pg_namespace n ON n.oid=c.relnamespace WHERE c.relrowsecurity AND c.relforcerowsecurity AND n.nspname NOT IN ('pg_catalog','information_schema')));")"
permission_count="$(docker exec "${CONTAINER_NAME}" psql -Atq -U postgres -d "${DATABASE_NAME}" -c "SELECT count(*) FROM iam.permissions")"
[[ "${permission_count}" == "16" ]] || { echo "ERROR: expected 16 permissions, got ${permission_count}" >&2; exit 1; }
if apply_file "${DATABASE_NAME}" "database/rollbacks/stage3_2_batch5/RB005_batch5.sql" >/tmp/paysave-rb005-unexpected.log 2>&1; then
  echo "ERROR: destructive rollback ran without explicit guard" >&2
  exit 1
fi
echo "DATABASE_VERIFICATION_PASS ${catalog}"
echo "ROLLBACK_GUARD_PASS destructive rollback remained disabled"
