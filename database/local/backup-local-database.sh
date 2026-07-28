#!/usr/bin/env bash
set -euo pipefail

ROOT="$(cd "$(dirname "${BASH_SOURCE[0]}")/../.." && pwd)"
ENV_FILE="${PAYSAVE_LOCAL_DB_ENV_FILE:-$ROOT/.env.local-db}"
COMPOSE_FILE="$ROOT/docker/postgres.local.yml"
BACKUP_DIR="${PAYSAVE_LOCAL_DB_BACKUP_DIR:-$HOME/.paysave/local-db/backups}"

mkdir -p "$BACKUP_DIR"
chmod 700 "$BACKUP_DIR"

compose=(docker compose --env-file "$ENV_FILE" -f "$COMPOSE_FILE")
timestamp="$(date -u +%Y%m%dT%H%M%SZ)"
final="$BACKUP_DIR/paysave_local_$timestamp.dump"
temporary="$final.partial"

cleanup() {
  rm -f "$temporary"
}
trap cleanup EXIT

"${compose[@]}" exec -T postgres sh -c \
  'PGPASSWORD="$POSTGRES_PASSWORD" pg_dump -Fc --no-password -U "$POSTGRES_USER" -d "$POSTGRES_DB"' \
  > "$temporary"

test -s "$temporary"
"${compose[@]}" exec -T postgres pg_restore --list < "$temporary" > /dev/null
chmod 600 "$temporary"
mv "$temporary" "$final"
trap - EXIT

printf 'PAYSAVE_LOCAL_BACKUP_PASS %s\n' "$final"
