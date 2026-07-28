#!/usr/bin/env bash
set -euo pipefail
ROOT="$(cd "$(dirname "${BASH_SOURCE[0]}")/../.." && pwd)"
B1="$ROOT/database/migrations/stage3_2_batch1"; B2="$ROOT/database/migrations/stage3_2_batch2"; B3="$ROOT/database/migrations/stage3_2_batch3"
ROLLBACK="$ROOT/database/rollbacks/stage3_2_batch3/RB003_batch3.sql"; VERIFY="$ROOT/database/tests/stage3_2_batch3_verify.sql"
b1=(M001_foundation.sql M002_master_data.sql M003_iam.sql); b2=(M004_partner.sql M005_customer.sql M006_contract.sql M007_asset.sql); b3=(M008_recovery.sql M009_workflow.sql M010_workforce.sql)
for f in "${b1[@]}"; do [[ -f "$B1/$f" ]] || exit 1; done
for f in "${b2[@]}"; do [[ -f "$B2/$f" ]] || exit 1; done
for f in "${b3[@]}"; do [[ -f "$B3/$f" ]] || { echo "RED: missing $B3/$f" >&2; exit 1; }; done
[[ -f "$ROLLBACK" && -f "$VERIFY" ]] || { echo 'RED: Batch #3 rollback/verification missing' >&2; exit 1; }
run(){ docker exec -i "$1" psql -v ON_ERROR_STOP=1 -U postgres -d paysave_test < "$2"; }
for v in 16 17; do
 c="paysave-batch3-pg$v"; docker rm -f "$c" >/dev/null 2>&1||true; trap 'docker rm -f "'"$c"'" >/dev/null 2>&1||true' EXIT
 docker run -d --name "$c" -e POSTGRES_PASSWORD=batch3-test -e POSTGRES_DB=paysave_test "postgres:$v-alpine" >/dev/null
 for _ in $(seq 1 60); do docker exec "$c" pg_isready -U postgres -d paysave_test >/dev/null 2>&1&&break;sleep 1;done
 for f in "${b1[@]}";do run "$c" "$B1/$f";done; for f in "${b2[@]}";do run "$c" "$B2/$f";done; for f in "${b3[@]}";do run "$c" "$B3/$f";done
 run "$c" "$VERIFY"
 if run "$c" "$ROLLBACK" >/dev/null 2>&1;then echo 'Rollback guard failed'>&2;exit 1;fi
 for f in "${b3[@]}";do run "$c" "$B3/$f";done; run "$c" "$VERIFY"
 { printf "SET app.allow_destructive_rollback='on';\n";cat "$ROLLBACK";}|docker exec -i "$c" psql -v ON_ERROR_STOP=1 -U postgres -d paysave_test
 rem="$(docker exec "$c" psql -At -U postgres -d paysave_test -c "SELECT count(*) FROM pg_class c JOIN pg_namespace n ON n.oid=c.relnamespace WHERE c.relkind IN('r','p') AND n.nspname IN('recovery','workflow','workforce') AND c.relname NOT IN('contracts');")"; [[ "$rem" == 0 ]]||{ echo "rollback left $rem";exit 1;}
 base="$(docker exec "$c" psql -At -U postgres -d paysave_test -c "SELECT count(*) FROM pg_class c JOIN pg_namespace n ON n.oid=c.relnamespace WHERE c.relkind IN('r','p') AND (n.nspname,c.relname) IN (('tenant','partners'),('crm','customers'),('recovery','contracts'),('asset','assets'));")"; [[ "$base" == 4 ]]||{ echo 'rollback damaged prior batches';exit 1;}
 docker rm -f "$c">/dev/null;trap - EXIT;echo "POSTGRES_${v}_BATCH3_PASS"
done
echo BATCH3_ALL_VERSIONS_PASS
