#!/usr/bin/env bash
# scripts/backup-db.sh - PostgreSQL 备份（ARCHITECTURE.md §18.2）
set -euo pipefail

if [[ "${1:-}" == "--help" || "${1:-}" == "-h" ]]; then
  cat <<'EOF'
用法: ./scripts/backup-db.sh
环境变量:
  DATABASE_URL 或 PG* 连接参数
  BACKUP_DIR（默认 ./backups）
  BACKUP_S3_*（可选，上传异地）
  BACKUP_RETENTION_DAILY/WEEKLY/MONTHLY
EOF
  exit 0
fi

: "${DATABASE_URL:?DATABASE_URL is required}"
BACKUP_DIR="${BACKUP_DIR:-./backups}"
mkdir -p "$BACKUP_DIR"

STAMP="$(date -u +%Y%m%dT%H%M%SZ)"
OUT="$BACKUP_DIR/eicfc-${STAMP}.dump"
echo "[backup] dumping to $OUT"
pg_dump -Fc "$DATABASE_URL" -f "$OUT"
sha256sum "$OUT" | tee "$OUT.sha256"

if [[ -n "${BACKUP_S3_BUCKET:-}" ]]; then
  echo "[backup] uploading to s3://${BACKUP_S3_BUCKET}/db/"
  aws --endpoint-url "${BACKUP_S3_ENDPOINT}" s3 cp "$OUT" "s3://${BACKUP_S3_BUCKET}/db/$(basename "$OUT")"
  aws --endpoint-url "${BACKUP_S3_ENDPOINT}" s3 cp "$OUT.sha256" "s3://${BACKUP_S3_BUCKET}/db/$(basename "$OUT").sha256"
fi

# 简单本地保留：保留最近 7 个 dump
ls -1t "$BACKUP_DIR"/eicfc-*.dump 2>/dev/null | tail -n +8 | xargs -r rm -f
ls -1t "$BACKUP_DIR"/eicfc-*.dump.sha256 2>/dev/null | tail -n +8 | xargs -r rm -f
echo "[backup] done"
