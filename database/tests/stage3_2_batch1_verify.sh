#!/usr/bin/env bash
set -euo pipefail

ROOT="$(cd "$(dirname "${BASH_SOURCE[0]}")/../.." && pwd)"
MIG_DIR="$ROOT/database/migrations/stage3_2_batch1"
ROLLBACK="$ROOT/database/rollbacks/stage3_2_batch1/RB001_batch1.sql"
VERIFY="$ROOT/database/tests/stage3_2_batch1_verify.sql"

required=(M001_foundation.sql M002_master_data.sql M003_iam.sql)
for f in "${required[@]}"; do
  [[ -f "$MIG_DIR/$f" ]] || { echo "RED: missing $MIG_DIR/$f" >&2; exit 1; }
done
[[ -f "$ROLLBACK" ]] || { echo "RED: missing $ROLLBACK" >&2; exit 1; }

run_psql() {
  local container="$1" file="$2"
  docker exec -i "$container" psql -v ON_ERROR_STOP=1 -U postgres -d paysave_test < "$file"
}

for version in 16 17; do
  container="paysave-batch1-pg${version}"
  docker rm -f "$container" >/dev/null 2>&1 || true
  trap 'docker rm -f "'"$container"'" >/dev/null 2>&1 || true' EXIT
  docker run -d --name "$container" -e POSTGRES_PASSWORD=batch1-test -e POSTGRES_DB=paysave_test "postgres:${version}-alpine" >/dev/null
  for _ in $(seq 1 60); do
    docker exec "$container" pg_isready -U postgres -d paysave_test >/dev/null 2>&1 && break
    sleep 1
  done
  docker exec "$container" pg_isready -U postgres -d paysave_test >/dev/null

  for f in "${required[@]}"; do run_psql "$container" "$MIG_DIR/$f"; done
  run_psql "$container" "$VERIFY"

  # The destructive rollback must fail closed unless the explicit test-only guard is set.
  if run_psql "$container" "$ROLLBACK" >/dev/null 2>&1; then
    echo "Rollback safety guard unexpectedly allowed destructive rollback" >&2
    exit 1
  fi

  # Replay proves idempotency on a populated schema.
  for f in "${required[@]}"; do run_psql "$container" "$MIG_DIR/$f"; done
  run_psql "$container" "$VERIFY"

  { printf "SET app.allow_destructive_rollback = 'on';\n"; cat "$ROLLBACK"; } | docker exec -i "$container" psql -v ON_ERROR_STOP=1 -U postgres -d paysave_test
  remaining="$(docker exec "$container" psql -At -U postgres -d paysave_test -c "SELECT count(*) FROM pg_class c JOIN pg_namespace n ON n.oid=c.relnamespace WHERE c.relkind IN ('r','p') AND n.nspname IN ('tenant','master_data','iam');")"
  [[ "$remaining" == "0" ]] || { echo "Rollback left $remaining Batch #1 tables" >&2; exit 1; }

  docker rm -f "$container" >/dev/null
  trap - EXIT
  echo "POSTGRES_${version}_BATCH1_PASS"
done

echo "BATCH1_ALL_VERSIONS_PASS"
