#!/usr/bin/env bash
# scripts/verify-backup.sh - 验证最新备份可恢复（ARCHITECTURE.md §18.7）
set -euo pipefail

if [[ "${1:-}" == "--help" || "${1:-}" == "-h" ]]; then
  echo "用法: ./scripts/verify-backup.sh [dump-file]"
  exit 0
fi

BACKUP_DIR="${BACKUP_DIR:-./backups}"
DUMP="${1:-}"
if [[ -z "$DUMP" ]]; then
  DUMP="$(ls -1t "$BACKUP_DIR"/eicfc-*.dump 2>/dev/null | head -n1 || true)"
fi
: "${DUMP:?no dump found}"

TMP_DB="eicfc_verify_$(date -u +%Y%m%d%H%M%S)"
echo "[verify] using dump $DUMP into temp db $TMP_DB"
createdb "$TMP_DB"
pg_restore --clean --if-exists -d "$TMP_DB" "$DUMP"
psql -d "$TMP_DB" -c 'SELECT COUNT(*) AS users FROM "User";'
psql -d "$TMP_DB" -c 'SELECT COUNT(*) AS articles FROM "Article";'
psql -d "$TMP_DB" -c 'SELECT COUNT(*) AS relays FROM "Relay";'
dropdb "$TMP_DB"
echo "[verify] OK $(date -u +%Y-%m-%dT%H:%M:%SZ)"
