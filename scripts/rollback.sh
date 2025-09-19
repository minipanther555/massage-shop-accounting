#!/usr/bin/env bash
set -euo pipefail

HOST_ALIAS="massage"
COMPOSE_DIR="/opt/massage-shop/deploy"

echo "==> Rolling back to previous image..."
ssh "${HOST_ALIAS}" bash -euo pipefail <<'EOF'
set -euo pipefail
cd /opt/massage-shop/deploy

if [ -f compose.prod.yml.bak ]; then
  echo "-> Restoring backup compose file"
  cp compose.prod.yml.bak compose.prod.yml
  echo "-> Restarting with previous image"
  docker compose up -d
  echo "-> Rollback complete"
else
  echo "❌ No backup file found (compose.prod.yml.bak)"
  echo "Available compose files:"
  ls -la compose*.yml
  exit 1
fi

echo "-> Current status:"
docker compose ps
EOF

echo "==> Rollback complete"
