#!/usr/bin/env bash
set -Eeuo pipefail
ROOT_DIR="$(cd "$(dirname "${BASH_SOURCE[0]}")/../.." && pwd)"
CONTAINER_NAME="paysave-stage43-${RANDOM}-${$}"
POSTGRES_PASSWORD="paysave-stage43-disposable"
DATABASE_NAME="paysave_stage43"
image="${POSTGRES_IMAGE:-postgres:17-alpine@sha256:742f40ea20b9ff2ff31db5458d127452988a2164df9e17441e191f3b72252193}"
migrations=(
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
remediations=(
  database/migrations/stage4_3_sprint2/M017_critical_release_blockers.sql
  database/migrations/stage4_3_sprint2/M018_asset_rpc_execution_security.sql
)
verification="database/tests/stage4_3_sprint2_verify.sql"
cleanup(){ docker rm -f "${CONTAINER_NAME}" >/dev/null 2>&1 || true; }
trap cleanup EXIT INT TERM

docker run --detach --rm --name "${CONTAINER_NAME}" --env "POSTGRES_PASSWORD=${POSTGRES_PASSWORD}" --env "POSTGRES_DB=${DATABASE_NAME}" "${image}" >/dev/null
for attempt in $(seq 1 45); do
  docker exec "${CONTAINER_NAME}" pg_isready -U postgres -d "${DATABASE_NAME}" >/dev/null 2>&1 && break
  [[ "${attempt}" -lt 45 ]] || { echo "ERROR: PostgreSQL did not become ready" >&2; exit 1; }
  sleep 1
done
apply(){ docker exec -i "${CONTAINER_NAME}" psql -X -v ON_ERROR_STOP=1 -U postgres -d "${DATABASE_NAME}" < "${ROOT_DIR}/$1"; }
# Reproduce Managed Supabase's pgcrypto placement instead of assuming public.
docker exec "${CONTAINER_NAME}" psql -X -v ON_ERROR_STOP=1 -U postgres -d "${DATABASE_NAME}" -c "CREATE SCHEMA extensions; CREATE EXTENSION pgcrypto WITH SCHEMA extensions;" >/dev/null
for migration in "${migrations[@]}"; do apply "${migration}" >/dev/null; done
for remediation in "${remediations[@]}"; do
  if [[ -f "${ROOT_DIR}/${remediation}" ]]; then
    apply "${remediation}" >/dev/null
    apply "${remediation}" >/dev/null
  fi
done
apply "${verification}"
echo "STAGE4_3_SPRINT2_RUNNER_PASS image=${image}"
