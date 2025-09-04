#!/bin/bash
# Pre-commit hook to prevent raw fetch calls to /api/ endpoints

echo "🔍 Checking for raw fetch calls to /api/ endpoints..."

# Check staged changes in web-app directory for raw fetch calls to /api/
# Ignore lines that already involve APIClient
if git diff --cached -U0 -- 'web-app/**/*.js' \
  | grep -E "^\+.*fetch\(\s*['\"]/api/" \
  | grep -vq "APIClient"; then
  echo "❌ ERROR: Raw fetch calls to /api/ endpoints detected!"
  echo "   Use APIClient for /api/ calls to ensure proper CSRF token handling and authentication."
  echo "   Example: const api = new APIClient(); await api.request('/api/endpoint', { method: 'POST', body: data });"
  exit 1
fi

echo "✅ No raw fetch calls to /api/ endpoints found."
exit 0
