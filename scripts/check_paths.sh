#!/usr/bin/env bash
set -euo pipefail

echo "🔍 Checking for forbidden asset paths..."

# Check for CSS/JS assets under /api/ paths (not navigation links)
bad=$(grep -RInE '\s(src|href)="/?api/.*\.(js|css)' web-app || true)
if [ -n "$bad" ]; then
  echo "❌ CSS/JS assets under /api/ are forbidden:"
  echo "$bad"
  exit 1
fi

# Check for local relative script paths that should be absolute (exclude CDN URLs)
# Focus on staff.html for this specific fix
bad=$(grep -RInE '\ssrc="[^/h]' web-app/staff.html | grep -E '\.(js|css)"' || true)
if [ -n "$bad" ]; then
  echo "❌ Local relative asset paths found (should be absolute for production):"
  echo "$bad"
  exit 1
fi

echo "✅ No forbidden asset paths found."
