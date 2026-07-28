#!/usr/bin/env bash
set -euo pipefail
ROOT="$(cd "$(dirname "${BASH_SOURCE[0]}")/../.." && pwd)"
B1="$ROOT/database/migrations/stage3_2_batch1"
B2="$ROOT/database/migrations/stage3_2_batch2"
ROLLBACK="$ROOT/database/rollbacks/stage3_2_batch2/RB002_batch2.sql"
VERIFY="$ROOT/database/tests/stage3_2_batch2_verify.sql"
b1=(M001_foundation.sql M002_master_data.sql M003_iam.sql)
b2=(M004_partner.sql M005_customer.sql M006_contract.sql M007_asset.sql)
for f in "${b1[@]}"; do [[ -f "$B1/$f" ]] || { echo "missing prerequisite $B1/$f" >&2; exit 1; }; done
for f in "${b2[@]}"; do [[ -f "$B2/$f" ]] || { echo "RED: missing $B2/$f" >&2; exit 1; }; done
[[ -f "$ROLLBACK" ]] || { echo "RED: missing $ROLLBACK" >&2; exit 1; }
run_psql(){ docker exec -i "$1" psql -v ON_ERROR_STOP=1 -U postgres -d paysave_test < "$2"; }
for version in 16 17; do
  c="paysave-batch2-pg${version}"
  docker rm -f "$c" >/dev/null 2>&1 || true
  trap 'docker rm -f "'"$c"'" >/dev/null 2>&1 || true' EXIT
  docker run -d --name "$c" -e POSTGRES_PASSWORD=batch2-test -e POSTGRES_DB=paysave_test "postgres:${version}-alpine" >/dev/null
  for _ in $(seq 1 60); do docker exec "$c" pg_isready -U postgres -d paysave_test >/dev/null 2>&1 && break; sleep 1; done
  docker exec "$c" pg_isready -U postgres -d paysave_test >/dev/null
  for f in "${b1[@]}"; do run_psql "$c" "$B1/$f"; done
  for f in "${b2[@]}"; do run_psql "$c" "$B2/$f"; done
  run_psql "$c" "$VERIFY"
  if run_psql "$c" "$ROLLBACK" >/dev/null 2>&1; then echo 'Rollback guard unexpectedly allowed destructive rollback' >&2; exit 1; fi
  for f in "${b2[@]}"; do run_psql "$c" "$B2/$f"; done
  run_psql "$c" "$VERIFY"
  { printf "SET app.allow_destructive_rollback = 'on';\n"; cat "$ROLLBACK"; } | docker exec -i "$c" psql -v ON_ERROR_STOP=1 -U postgres -d paysave_test
  remaining="$(docker exec "$c" psql -At -U postgres -d paysave_test -c "SELECT count(*) FROM pg_class c JOIN pg_namespace n ON n.oid=c.relnamespace WHERE c.relkind IN ('r','p') AND (n.nspname,c.relname) IN (('tenant','partner_settings'),('tenant','branches'),('crm','customers'),('crm','customer_identifiers'),('crm','customer_contacts'),('crm','customer_addresses'),('recovery','contracts'),('asset','asset_types'),('asset','assets'),('asset','asset_identifiers'),('asset','asset_ownership_history'),('asset','case_assets'),('asset','asset_inspections'),('asset','asset_status_history'));")"
  [[ "$remaining" == 0 ]] || { echo "Batch #2 rollback left $remaining tables" >&2; exit 1; }
  base_remaining="$(docker exec "$c" psql -At -U postgres -d paysave_test -c "SELECT count(*) FROM pg_class c JOIN pg_namespace n ON n.oid=c.relnamespace WHERE c.relkind IN ('r','p') AND (n.nspname,c.relname) IN (('tenant','partners'),('iam','users'),('master_data','catalogs'));")"
  [[ "$base_remaining" == 3 ]] || { echo 'Batch #2 rollback damaged Batch #1' >&2; exit 1; }
  docker rm -f "$c" >/dev/null; trap - EXIT
  echo "POSTGRES_${version}_BATCH2_PASS"
done
echo BATCH2_ALL_VERSIONS_PASS
