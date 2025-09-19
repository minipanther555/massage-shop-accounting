#!/bin/bash
set -e

# Fast staging sync script
# Usage: ./scripts/stage-sync.sh [staging-url]

STAGING_URL=${1:-"https://109.123.238.197.sslip.io/stage"}
TIMESTAMP=$(date +%s)

echo "🚀 Syncing web-app to staging..."
rsync -av --delete web-app/ massage:/opt/massage-shop/STAGE/web-app/

echo "🔍 Verifying staging version..."
VERSION_URL="${STAGING_URL}/_stage_version.json?v=${TIMESTAMP}"
VERSION_RESPONSE=$(curl -s "$VERSION_URL")
echo "Version response: $VERSION_RESPONSE"

echo "🏥 Checking health endpoint..."
HEALTH_URL="${STAGING_URL}/api/_health?v=${TIMESTAMP}"
HEALTH_RESPONSE=$(curl -s "$HEALTH_URL")
echo "Health response: $HEALTH_RESPONSE"

echo "🧪 Running smoke tests..."
BASE_URL="$STAGING_URL" PWTEST=1 npx playwright test tests/e2e/staff-roster.smoke.spec.js --project=e2e

echo "✅ Staging sync complete!"
echo "🌐 Staging URL: ${STAGING_URL}/staff.html?PWTEST=1&v=${TIMESTAMP}"
