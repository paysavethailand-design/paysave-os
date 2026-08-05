#!/usr/bin/env bash
set -euo pipefail

ROOT_DIR="$(cd "$(dirname "${BASH_SOURCE[0]}")/../.." && pwd -P)"
IMAGE="postgres:17-alpine"
CONTAINER="paysave-inventory-rls-$RANDOM-$$"

cleanup() {
  docker rm -f "$CONTAINER" >/dev/null 2>&1 || true
}
trap cleanup EXIT

docker run -d --name "$CONTAINER" \
  -e POSTGRES_PASSWORD=postgres \
  -e POSTGRES_DB=paysave_inventory_rls_test \
  "$IMAGE" >/dev/null

docker exec "$CONTAINER" mkdir -p \
  /repo/database/tests \
  /repo/database/migrations/managed_staging
docker cp \
  "$ROOT_DIR/database/tests/managed_staging_inventory_rls_verify.sql" \
  "$CONTAINER:/repo/database/tests/managed_staging_inventory_rls_verify.sql" >/dev/null
docker cp \
  "$ROOT_DIR/database/migrations/managed_staging/20260805_inventory_save_rpc.sql" \
  "$CONTAINER:/repo/database/migrations/managed_staging/20260805_inventory_save_rpc.sql" >/dev/null

for _ in $(seq 1 60); do
  if docker exec "$CONTAINER" pg_isready -U postgres -d paysave_inventory_rls_test >/dev/null 2>&1; then
    break
  fi
  sleep 1
done

docker exec "$CONTAINER" pg_isready -U postgres -d paysave_inventory_rls_test >/dev/null
docker exec "$CONTAINER" \
  psql -v ON_ERROR_STOP=1 -U postgres -d paysave_inventory_rls_test \
  -f /repo/database/tests/managed_staging_inventory_rls_verify.sql
