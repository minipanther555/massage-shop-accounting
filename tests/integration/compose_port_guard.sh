#!/usr/bin/env bash
set -euo pipefail
BAD=$(grep -RIn --include='*.yml' --include='*.yaml' -E '(^|[^0-9])3007([^0-9]|$)' ./ || true)
if [[ -n "$BAD" ]]; then
  echo "❌ Found forbidden port 3007 in compose files:"
  echo "$BAD"
  exit 1
fi
echo "✅ No forbidden 3007 ports"
