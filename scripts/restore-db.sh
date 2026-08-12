#!/usr/bin/env bash
# scripts/restore-db.sh - 恢复 PostgreSQL（ARCHITECTURE.md §18.3）
set -euo pipefail

if [[ "${1:-}" == "--help" || "${1:-}" == "-h" ]]; then
  cat <<'EOF'
用法: ./scripts/restore-db.sh <dump-file> --env <name>
要求:
  - 必须指定 --env（development|staging|production）
  - production 需二次输入完整环境名确认
  - 禁止在未确认时指向生产
EOF
  exit 0
fi

DUMP="${1:?dump file required}"
shift || true
ENV_NAME=""
while [[ $# -gt 0 ]]; do
  case "$1" in
    --env) ENV_NAME="${2:-}"; shift 2 ;;
    *) echo "unknown arg: $1"; exit 1 ;;
  esac
done

: "${ENV_NAME:?--env is required}"
: "${DATABASE_URL:?DATABASE_URL is required}"

if [[ ! -f "$DUMP" ]]; then
  echo "[restore] dump not found: $DUMP" >&2
  exit 1
fi

if [[ -f "$DUMP.sha256" ]]; then
  echo "[restore] verifying checksum"
  sha256sum -c "$DUMP.sha256"
fi

if [[ "$ENV_NAME" == "production" ]]; then
  read -r -p "输入 production 以确认恢复到生产: " CONFIRM
  if [[ "$CONFIRM" != "production" ]]; then
    echo "[restore] aborted"
    exit 1
  fi
fi

SNAP_DIR="${BACKUP_DIR:-./backups}/pre-restore"
mkdir -p "$SNAP_DIR"
SNAP="$SNAP_DIR/pre-restore-$(date -u +%Y%m%dT%H%M%SZ).dump"
echo "[restore] creating pre-restore snapshot: $SNAP"
pg_dump -Fc "$DATABASE_URL" -f "$SNAP" || echo "[restore] warning: pre-snapshot failed"

echo "[restore] restoring $DUMP"
pg_restore --clean --if-exists -d "$DATABASE_URL" "$DUMP"
echo "[restore] done"
