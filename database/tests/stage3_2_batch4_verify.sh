#!/usr/bin/env bash
set -euo pipefail
ROOT="$(cd "$(dirname "${BASH_SOURCE[0]}")/../.." && pwd)"
B1="$ROOT/database/migrations/stage3_2_batch1";B2="$ROOT/database/migrations/stage3_2_batch2";B3="$ROOT/database/migrations/stage3_2_batch3";B4="$ROOT/database/migrations/stage3_2_batch4"
RB="$ROOT/database/rollbacks/stage3_2_batch4/RB004_batch4.sql";VSQL="$ROOT/database/tests/stage3_2_batch4_verify.sql"
b1=(M001_foundation.sql M002_master_data.sql M003_iam.sql);b2=(M004_partner.sql M005_customer.sql M006_contract.sql M007_asset.sql);b3=(M008_recovery.sql M009_workflow.sql M010_workforce.sql);b4=(M011_finance.sql M012_performance.sql M013_document.sql)
for f in "${b1[@]}";do [[ -f "$B1/$f" ]]||exit 1;done;for f in "${b2[@]}";do [[ -f "$B2/$f" ]]||exit 1;done;for f in "${b3[@]}";do [[ -f "$B3/$f" ]]||exit 1;done
for f in "${b4[@]}";do [[ -f "$B4/$f" ]]||{ echo "RED: missing $B4/$f" >&2;exit 1;};done
[[ -f "$RB"&&-f "$VSQL" ]]||{ echo 'RED: Batch #4 rollback/verification missing'>&2;exit 1;}
run(){ docker exec -i "$1" psql -v ON_ERROR_STOP=1 -U postgres -d paysave_test < "$2";}
for v in 16 17;do
 c="paysave-batch4-pg$v";docker rm -f "$c">/dev/null 2>&1||true;trap 'docker rm -f "'"$c"'" >/dev/null 2>&1||true' EXIT
 docker run -d --name "$c" -e POSTGRES_PASSWORD=batch4-test -e POSTGRES_DB=paysave_test "postgres:$v-alpine">/dev/null
 for _ in $(seq 1 60);do docker exec "$c" pg_isready -U postgres -d paysave_test>/dev/null 2>&1&&break;sleep 1;done
 for f in "${b1[@]}";do run "$c" "$B1/$f";done;for f in "${b2[@]}";do run "$c" "$B2/$f";done;for f in "${b3[@]}";do run "$c" "$B3/$f";done;for f in "${b4[@]}";do run "$c" "$B4/$f";done
 run "$c" "$VSQL";if run "$c" "$RB">/dev/null 2>&1;then echo 'Rollback guard failed'>&2;exit 1;fi
 for f in "${b4[@]}";do run "$c" "$B4/$f";done;run "$c" "$VSQL"
 { printf "SET app.allow_destructive_rollback='on';\n";cat "$RB";}|docker exec -i "$c" psql -v ON_ERROR_STOP=1 -U postgres -d paysave_test
 rem="$(docker exec "$c" psql -At -U postgres -d paysave_test -c "SELECT count(*) FROM pg_class c JOIN pg_namespace n ON n.oid=c.relnamespace WHERE c.relkind IN('r','p') AND n.nspname IN('finance','performance','document_store');")";[[ "$rem"==0 ]]||{ echo "rollback left $rem";exit 1;}
 base="$(docker exec "$c" psql -At -U postgres -d paysave_test -c "SELECT count(*) FROM pg_class c JOIN pg_namespace n ON n.oid=c.relnamespace WHERE c.relkind IN('r','p') AND (n.nspname,c.relname) IN (('tenant','partners'),('recovery','cases'),('workflow','instances'),('workforce','assignments'));")";[[ "$base"==4 ]]||{ echo 'rollback damaged earlier batch';exit 1;}
 docker rm -f "$c">/dev/null;trap - EXIT;echo "POSTGRES_${v}_BATCH4_PASS"
done
echo BATCH4_ALL_VERSIONS_PASS
