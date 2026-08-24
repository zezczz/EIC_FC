#!/bin/sh
set -eu

mc alias set local http://minio:9000 "$S3_ACCESS_KEY_ID" "$S3_SECRET_ACCESS_KEY"
mc mb --ignore-existing "local/${S3_BUCKET}"
mc anonymous set none "local/${S3_BUCKET}"
if ! mc cors set "local/${S3_BUCKET}" /cors.json; then
  echo "cors set skipped (same-origin IP access does not require CORS)"
fi
echo "bucket ${S3_BUCKET} ready"
