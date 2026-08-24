#!/usr/bin/env bash
# 生产宿主机备份：PostgreSQL dump + 可选 MinIO 数据卷归档
set -euo pipefail

ROOT="${EICFC_ROOT:-/opt/eicfc}"
cd "$ROOT"
if [[ -f "$ROOT/.env" ]]; then
  set -a
  # shellcheck disable=SC1091
  source "$ROOT/.env"
  set +a
fi

BACKUP_DIR="${BACKUP_DIR:-$ROOT/backups}"
mkdir -p "$BACKUP_DIR"

STAMP="$(date -u +%Y%m%dT%H%M%SZ)"
DUMP="$BACKUP_DIR/eicfc-${STAMP}.dump"

echo "[backup] dumping postgres to $DUMP"
docker compose -f compose.prod.yml exec -T postgres \
  pg_dump -U "${POSTGRES_USER:-eicfc}" -Fc "${POSTGRES_DB:-eicfc}" > "$DUMP"
sha256sum "$DUMP" | tee "$DUMP.sha256"

# 本地保留最近 7 份数据库备份
ls -1t "$BACKUP_DIR"/eicfc-*.dump 2>/dev/null | tail -n +8 | xargs -r rm -f
ls -1t "$BACKUP_DIR"/eicfc-*.dump.sha256 2>/dev/null | tail -n +8 | xargs -r rm -f

if [[ "${BACKUP_MINIO:-1}" == "1" ]]; then
  MINIO_TAR="$BACKUP_DIR/minio-${STAMP}.tar.gz"
  echo "[backup] archiving minio volume to $MINIO_TAR"
  docker run --rm \
    -v eicfc-prod_miniodata:/data:ro \
    -v "$BACKUP_DIR":/backup \
    alpine:3.21 \
    tar -czf "/backup/minio-${STAMP}.tar.gz" -C /data .
  sha256sum "$MINIO_TAR" | tee "$MINIO_TAR.sha256"
  ls -1t "$BACKUP_DIR"/minio-*.tar.gz 2>/dev/null | tail -n +4 | xargs -r rm -f
  ls -1t "$BACKUP_DIR"/minio-*.tar.gz.sha256 2>/dev/null | tail -n +4 | xargs -r rm -f
fi

echo "[backup] done"
