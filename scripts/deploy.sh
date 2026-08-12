#!/usr/bin/env bash
# scripts/deploy.sh - 生产部署（ARCHITECTURE.md §18.4）
set -euo pipefail

if [[ "${1:-}" == "--help" || "${1:-}" == "-h" ]]; then
  cat <<'EOF'
用法: ./scripts/deploy.sh --tag <git-tag>
步骤: 备份 -> 拉取 tag -> 构建镜像 -> migrate -> 滚动重建 -> 健康检查
EOF
  exit 0
fi

TAG=""
while [[ $# -gt 0 ]]; do
  case "$1" in
    --tag) TAG="${2:-}"; shift 2 ;;
    *) echo "unknown arg: $1"; exit 1 ;;
  esac
done
: "${TAG:?--tag is required}"

ROOT="$(cd "$(dirname "$0")/.." && pwd)"
cd "$ROOT"

echo "[deploy] current dir: $ROOT"
git fetch --tags
git checkout "$TAG"

echo "[deploy] backup database"
./scripts/backup-db.sh || {
  echo "[deploy] backup failed" >&2
  exit 1
}

PREV_IMAGE="$(docker compose -f compose.prod.yml images -q app 2>/dev/null || true)"
echo "[deploy] building"
docker compose -f compose.prod.yml build app

echo "[deploy] migrate"
docker compose -f compose.prod.yml run --rm app sh -c 'npx prisma migrate deploy' || \
  docker compose -f compose.prod.yml exec -T app sh -c 'npx prisma migrate deploy' || true

echo "[deploy] recreate app"
docker compose -f compose.prod.yml up -d --no-deps app

echo "[deploy] waiting ready"
for i in $(seq 1 30); do
  if curl -fsS "http://127.0.0.1:3000/api/health/ready" >/dev/null 2>&1 || \
     curl -fsS "${APP_URL:-http://127.0.0.1:3000}/api/health/ready" >/dev/null 2>&1; then
    echo "[deploy] ready"
    exit 0
  fi
  sleep 2
done

echo "[deploy] health check failed; attempting rollback" >&2
if [[ -n "$PREV_IMAGE" ]]; then
  docker tag "$PREV_IMAGE" eicfc-prod-app:rollback || true
  docker compose -f compose.prod.yml up -d --no-deps app || true
fi
exit 1
