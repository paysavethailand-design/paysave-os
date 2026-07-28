#!/usr/bin/env bash
set -euo pipefail
ROOT="$(cd "$(dirname "${BASH_SOURCE[0]}")/../.." && pwd)"
MIGRATIONS=(
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
  database/migrations/stage3_2_batch6/M017_event_catalog.sql
  database/migrations/stage3_2_batch6/M018_ai.sql
  database/migrations/stage3_2_batch6/M019_report.sql
  database/migrations/stage3_2_batch6/M020_seed.sql
)
for f in "${MIGRATIONS[@]}" database/tests/stage3_2_batch6_verify.sql database/rollbacks/stage3_2_batch6/RB006_batch6.sql; do
  [[ -f "$ROOT/$f" ]] || { echo "BATCH6_RED_MISSING:$f" >&2; exit 1; }
done
for version in 16 17; do
  name="paysave-batch6-pg${version}"
  port=$((56000 + version))
  docker rm -f "$name" >/dev/null 2>&1 || true
  docker run -d --name "$name" -e POSTGRES_PASSWORD=postgres -e POSTGRES_DB=paysave -p "${port}:5432" "postgres:${version}-alpine" >/dev/null
  cleanup(){ docker rm -f "$name" >/dev/null 2>&1 || true; }
  trap cleanup EXIT
  until docker exec "$name" pg_isready -U postgres -d paysave >/dev/null 2>&1; do sleep 1; done
  for f in "${MIGRATIONS[@]}"; do docker exec -i "$name" psql -v ON_ERROR_STOP=1 -U postgres -d paysave < "$ROOT/$f" >/dev/null; done
  for f in "${MIGRATIONS[@]:16}"; do docker exec -i "$name" psql -v ON_ERROR_STOP=1 -U postgres -d paysave < "$ROOT/$f" >/dev/null; done
  docker exec -i "$name" psql -v ON_ERROR_STOP=1 -U postgres -d paysave < "$ROOT/database/tests/stage3_2_batch6_verify.sql"
  docker exec -i "$name" psql -v ON_ERROR_STOP=1 -U postgres -d paysave < "$ROOT/database/rollbacks/stage3_2_batch6/RB006_batch6.sql" >/dev/null
  test "$(docker exec "$name" psql -At -U postgres -d paysave -c "select count(*) from information_schema.tables where table_schema in ('event_catalog','ai','report')")" = "0"
  for f in "${MIGRATIONS[@]:16}"; do docker exec -i "$name" psql -v ON_ERROR_STOP=1 -U postgres -d paysave < "$ROOT/$f" >/dev/null; done
  docker exec -i "$name" psql -v ON_ERROR_STOP=1 -U postgres -d paysave < "$ROOT/database/tests/stage3_2_batch6_verify.sql" >/dev/null
  echo "POSTGRESQL_${version}_BATCH6_PASS"
  cleanup
  trap - EXIT
done
echo BATCH6_VERIFICATION_PASS
