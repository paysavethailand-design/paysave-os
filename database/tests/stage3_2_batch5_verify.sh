#!/usr/bin/env bash
set -euo pipefail
ROOT="$(cd "$(dirname "${BASH_SOURCE[0]}")/../.."&&pwd)";B5="$ROOT/database/migrations/stage3_2_batch5";RB="$ROOT/database/rollbacks/stage3_2_batch5/RB005_batch5.sql";VS="$ROOT/database/tests/stage3_2_batch5_verify.sql"
dirs=(stage3_2_batch1 stage3_2_batch2 stage3_2_batch3 stage3_2_batch4);files1=(M001_foundation.sql M002_master_data.sql M003_iam.sql);files2=(M004_partner.sql M005_customer.sql M006_contract.sql M007_asset.sql);files3=(M008_recovery.sql M009_workflow.sql M010_workforce.sql);files4=(M011_finance.sql M012_performance.sql M013_document.sql);b5=(M014_approval.sql M015_notification.sql M016_platform.sql)
for i in 0 1 2 3;do eval 'a=("${files'$((i+1))'[@]}")';for f in "${a[@]}";do [[ -f "$ROOT/database/migrations/${dirs[$i]}/$f" ]]||exit 1;done;done
for f in "${b5[@]}";do [[ -f "$B5/$f" ]]||{ echo "RED: missing $B5/$f" >&2;exit 1;};done;[[ -f "$RB"&&-f "$VS" ]]||{ echo 'RED: Batch #5 rollback/verification missing'>&2;exit 1;}
run(){ docker exec -i "$1" psql -v ON_ERROR_STOP=1 -U postgres -d paysave_test < "$2";}
for v in 16 17;do
 c="paysave-batch5-pg$v";docker rm -f "$c">/dev/null 2>&1||true;trap 'docker rm -f "'"$c"'" >/dev/null 2>&1||true' EXIT;docker run -d --name "$c" -e POSTGRES_PASSWORD=batch5-test -e POSTGRES_DB=paysave_test "postgres:$v-alpine">/dev/null
 for _ in $(seq 1 60);do docker exec "$c" pg_isready -U postgres -d paysave_test>/dev/null 2>&1&&break;sleep 1;done
 for i in 0 1 2 3;do eval 'a=("${files'$((i+1))'[@]}")';for f in "${a[@]}";do run "$c" "$ROOT/database/migrations/${dirs[$i]}/$f";done;done;for f in "${b5[@]}";do run "$c" "$B5/$f";done
 run "$c" "$VS";if run "$c" "$RB">/dev/null 2>&1;then echo 'Rollback guard failed'>&2;exit 1;fi;for f in "${b5[@]}";do run "$c" "$B5/$f";done;run "$c" "$VS"
 { printf "SET app.allow_destructive_rollback='on';\n";cat "$RB";}|docker exec -i "$c" psql -v ON_ERROR_STOP=1 -U postgres -d paysave_test
 rem="$(docker exec "$c" psql -At -U postgres -d paysave_test -c "SELECT count(*) FROM pg_class c JOIN pg_namespace n ON n.oid=c.relnamespace WHERE c.relkind IN('r','p') AND n.nspname IN('approval','communication','platform');")";[[ "$rem"==0 ]]||{ echo "rollback left $rem";exit 1;}
 base="$(docker exec "$c" psql -At -U postgres -d paysave_test -c "SELECT count(*) FROM pg_class c JOIN pg_namespace n ON n.oid=c.relnamespace WHERE c.relkind IN('r','p') AND (n.nspname,c.relname) IN (('workflow','business_objects'),('finance','payments'),('document_store','legal_holds'));")";[[ "$base"==3 ]]||{ echo 'rollback damaged prior batches';exit 1;}
 docker rm -f "$c">/dev/null;trap - EXIT;echo "POSTGRES_${v}_BATCH5_PASS"
done
echo BATCH5_ALL_VERSIONS_PASS
