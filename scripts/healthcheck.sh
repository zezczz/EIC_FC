#!/usr/bin/env bash
# scripts/healthcheck.sh - 健康检查（ARCHITECTURE.md §18.5）
set -euo pipefail

if [[ "${1:-}" == "--help" || "${1:-}" == "-h" ]]; then
  echo "用法: APP_URL=https://czzczzzez.cloud ./scripts/healthcheck.sh"
  exit 0
fi

APP_URL="${APP_URL:?APP_URL is required}"
APP_URL="${APP_URL%/}"

fail=0
check() {
  local name="$1" url="$2"
  code="$(curl -sS -o /dev/null -w "%{http_code}" "$url" || true)"
  if [[ "$code" == "200" || "$code" == "204" ]]; then
    echo "[ok] $name"
  else
    echo "[fail] $name ($url) status=$code" >&2
    fail=1
  fi
}

check live "$APP_URL/api/health/live"
check ready "$APP_URL/api/health/ready"
check home "$APP_URL/"
check login "$APP_URL/login"

if [[ "$APP_URL" == https://* ]]; then
  host="${APP_URL#https://}"
  host="${host%%/*}"
  end_date="$(echo | openssl s_client -servername "$host" -connect "$host:443" 2>/dev/null | openssl x509 -noout -enddate | cut -d= -f2 || true)"
  if [[ -n "$end_date" ]]; then
    echo "[ok] tls enddate: $end_date"
  else
    echo "[fail] tls cert check" >&2
    fail=1
  fi
fi

exit "$fail"
