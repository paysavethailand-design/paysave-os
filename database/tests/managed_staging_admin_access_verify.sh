#!/usr/bin/env bash
set -euo pipefail

ROOT_DIR="$(cd "$(dirname "${BASH_SOURCE[0]}")/../.." && pwd -P)"
IMAGE="postgres:17-alpine"
CONTAINER="paysave-admin-access-$RANDOM-$$"

cleanup() {
  docker rm -f "$CONTAINER" >/dev/null 2>&1 || true
}
trap cleanup EXIT

docker run -d --name "$CONTAINER" \
  -e POSTGRES_PASSWORD=postgres \
  -e POSTGRES_DB=paysave_admin_access_test \
  "$IMAGE" >/dev/null

docker exec "$CONTAINER" mkdir -p \
  /repo/database/tests \
  /repo/database/migrations/managed_staging
docker cp \
  "$ROOT_DIR/database/tests/managed_staging_admin_access_verify.sql" \
  "$CONTAINER:/repo/database/tests/managed_staging_admin_access_verify.sql" >/dev/null
docker cp \
  "$ROOT_DIR/database/migrations/managed_staging/20260805_000_missing_permission_catalog.sql" \
  "$CONTAINER:/repo/database/migrations/managed_staging/20260805_000_missing_permission_catalog.sql" >/dev/null
docker cp \
  "$ROOT_DIR/database/migrations/managed_staging/20260805_admin_active_tenant_access.sql" \
  "$CONTAINER:/repo/database/migrations/managed_staging/20260805_admin_active_tenant_access.sql" >/dev/null

for _ in $(seq 1 60); do
  if docker exec "$CONTAINER" pg_isready -U postgres -d paysave_admin_access_test >/dev/null 2>&1; then
    break
  fi
  sleep 1
done

docker exec "$CONTAINER" pg_isready -U postgres -d paysave_admin_access_test >/dev/null
docker exec "$CONTAINER" \
  psql -v ON_ERROR_STOP=1 -U postgres -d paysave_admin_access_test \
  -f /repo/database/tests/managed_staging_admin_access_verify.sql

# A stale/excess allow must fail closed rather than silently broadening admin.
docker exec "$CONTAINER" \
  psql -v ON_ERROR_STOP=1 -U postgres -d paysave_admin_access_test -c \
  "INSERT INTO iam.role_permissions(partner_id,role_id,permission_id,effect)
   SELECT p.id,r.id,permission.id,'allow'
   FROM tenant.partners p
   JOIN iam.roles r ON r.partner_id=p.id AND r.code='admin'
   JOIN iam.permissions permission ON permission.code='platform.manage'
   WHERE p.code='RC_STAGING';" >/dev/null

if excess_output="$(docker exec "$CONTAINER" \
  psql -v ON_ERROR_STOP=1 -U postgres -d paysave_admin_access_test \
  -f /repo/database/migrations/managed_staging/20260805_admin_active_tenant_access.sql 2>&1)"; then
  echo "Expected migration to reject an excess RC_STAGING admin allow" >&2
  exit 1
fi

case "$excess_output" in
  *"must have exactly the 19 source-approved allows"*) ;;
  *)
    printf '%s\n' "$excess_output" >&2
    echo "Migration failed for an unexpected reason" >&2
    exit 1
    ;;
esac

echo "MANAGED_STAGING_ADMIN_EXCESS_GRANT_REJECTED"

docker exec "$CONTAINER" createdb -U postgres paysave_catalog_conflict_test
docker exec "$CONTAINER" \
  psql -v ON_ERROR_STOP=1 -U postgres -d paysave_catalog_conflict_test -c \
  "CREATE SCHEMA iam;
   CREATE TABLE iam.permissions (
     id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
     code text NOT NULL,
     resource text NOT NULL,
     action text NOT NULL,
     created_at timestamptz NOT NULL DEFAULT now(),
     updated_at timestamptz NOT NULL DEFAULT now()
   );
   INSERT INTO iam.permissions(code,resource,action)
   VALUES ('reports.read','wrong','read'),('reports.read','reports','read');" >/dev/null

if conflict_output="$(docker exec "$CONTAINER" \
  psql -v ON_ERROR_STOP=1 -U postgres -d paysave_catalog_conflict_test \
  -f /repo/database/migrations/managed_staging/20260805_000_missing_permission_catalog.sql 2>&1)"; then
  echo "Expected catalog migration to reject duplicate/conflicting permission rows" >&2
  exit 1
fi

case "$conflict_output" in
  *"permission catalog code duplicates exist"*) ;;
  *)
    printf '%s\n' "$conflict_output" >&2
    echo "Catalog migration failed for an unexpected reason" >&2
    exit 1
    ;;
esac

remaining_catalog_rows="$(docker exec "$CONTAINER" \
  psql -At -U postgres -d paysave_catalog_conflict_test -c \
  "SELECT count(*) FROM iam.permissions WHERE code IN ('reports.read','payments.read','commission.read');")"
if [[ "$remaining_catalog_rows" != "2" ]]; then
  echo "Catalog conflict rollback changed permission rows unexpectedly" >&2
  exit 1
fi

echo "MANAGED_STAGING_PERMISSION_CATALOG_CONFLICT_REJECTED"
