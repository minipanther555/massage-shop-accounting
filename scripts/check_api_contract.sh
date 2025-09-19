#!/usr/bin/env bash
set -euo pipefail
echo 'Checking for forbidden API method names...'
if grep -RIn --line-number -E '(^|[^A-Za-z0-9_])deleteStaffRoster\s\(' web-app backend; then
  echo '❌ Found forbidden deleteStaffRoster(...). Use removeStaffFromRoster(...) instead.'
  exit 1
fi
echo '✅ OK: no forbidden method names found.'
