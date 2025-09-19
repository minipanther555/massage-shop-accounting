#!/usr/bin/env bash
set -euo pipefail

APP_NAME="massage-app"
HOST_ALIAS="massage"                   # your SSH host alias
REMOTE_DIR="/opt/massage-shop"
COMPOSE_DIR="${REMOTE_DIR}/deploy"
TAG="main28-$(date +%Y%m%d-%H%M%S)"
TARBALL="${APP_NAME}-${TAG}.tar.gz"
GIT_SHA="$(git rev-parse --short HEAD || echo unknown)"

echo "==> Preflight: show build context size (sanity)"
# If this shows huge numbers, fix .dockerignore first
du -sh . | awk '{print "Context size:", $1}'

echo "==> Context size guard (bail if too large)"
CTX_BYTES=$(tar -czf - $(git ls-files -co --exclude-standard) 2>/dev/null | wc -c | awk "{print \$1}")
echo "Approx build context (gzip) bytes: ${CTX_BYTES}"
# ~150MB gzipped is already big; tune threshold to your repo
if [ "${CTX_BYTES}" -gt 250000000 ]; then
  echo "Context looks huge (>250MB gz). Fix .dockerignore before deploying."
  exit 1
fi

echo "==> Build linux/amd64 image (pull fresh base, embed git sha)"
docker buildx create --use >/dev/null 2>&1 || true
docker buildx build \
  --platform linux/amd64 \
  --pull \
  -t "${APP_NAME}:${TAG}" \
  -f docker/Dockerfile \
  --build-arg GIT_SHA="${GIT_SHA}" \
  --provenance=false \
  --load \
  .

echo "==> Save & compress tarball"
docker save "${APP_NAME}:${TAG}" | gzip > "${TARBALL}"
ls -lh "${TARBALL}"

echo "==> Copy tarball to server (resumable)"
rsync --partial --progress "${TARBALL}" "${HOST_ALIAS}:${REMOTE_DIR}/"

echo "==> Load image, update compose tag, restart (server-side)"
ssh "${HOST_ALIAS}" bash -euo pipefail <<EOF
set -euo pipefail
cd "${REMOTE_DIR}"
echo "-> Load image from tarball"
gunzip -c "${TARBALL}" | docker load

echo "-> Show loaded image"
docker images | grep "${APP_NAME}" | head -n 5

echo "-> Update compose image tag (in-place, backup first)"
cd "${COMPOSE_DIR}"
cp compose.prod.yml compose.prod.yml.bak
sed -i "s#image: ${APP_NAME}:.*#image: ${APP_NAME}:${TAG}#g" compose.prod.yml

echo "-> Restart app"
docker compose up -d

echo "-> Wait & quick health probe (if /api/_health exists)"
sleep 2
curl -skf https://109.123.238.197.sslip.io/api/_health || true

echo "-> Show recent logs"
docker compose logs --since=30s app || true
EOF

echo "==> Done. Deployed ${APP_NAME}:${TAG}"
