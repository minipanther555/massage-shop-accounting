#!/bin/bash

# Production 429 Diagnosis Script
# This script runs definitive tests against production to identify the root cause

set -e

# Configuration - UPDATE THESE FOR YOUR PRODUCTION
BASE='https://109.123.238.197.sslip.io'
JAR=$(mktemp)

echo "🔍 Production 429 Diagnosis Starting..."
echo "🌐 Target: $BASE"
echo "📁 Cookie jar: $JAR"
echo ""

# Cleanup function
cleanup() {
    rm -f "$JAR"
}
trap cleanup EXIT

# Test 1: Get CSRF token and check initial rate limit
echo "=== STEP 1: Initial CSRF and Rate Limit Check ==="
echo "Getting CSRF token..."

CSRF_RESPONSE=$(curl -sk -c "$JAR" "$BASE/csrf")
TOKEN=$(echo "$CSRF_RESPONSE" | jq -r .token 2>/dev/null || echo "FAILED")

if [ "$TOKEN" = "FAILED" ] || [ "$TOKEN" = "null" ]; then
    echo "❌ Failed to get CSRF token"
    echo "Response: $CSRF_RESPONSE"
    exit 1
fi

echo "✅ CSRF token: ${TOKEN:0:20}..."

# Check initial rate limit headers
echo ""
echo "Initial rate limit status:"
curl -sk -b "$JAR" "$BASE/csrf" -D - -o /dev/null | grep -i "ratelimit\|x-ratelimit" || echo "No rate limit headers found"

echo ""
echo "=== STEP 2: Staff Roster Add Sequence (10 attempts) ==="

# Test 2: Sequential adds with rate limit monitoring
for i in $(seq 1 10); do
    POS=$i
    NAME="TestUser_$i"
    
    echo ""
    echo "---- ADD $i (PUT /api/main/staff-roster/$POS) ----"
    
    # PUT request
    PUT_RESPONSE=$(curl -sk -b "$JAR" \
        -H "Content-Type: application/json" \
        -H "X-CSRF-Token: $TOKEN" \
        -X PUT "$BASE/api/main/staff-roster/$POS" \
        -d "{\"masseuse_name\":\"$NAME\",\"status\":null}" \
        -D - -o /dev/null 2>&1)
    
    echo "PUT Response Headers:"
    echo "$PUT_RESPONSE" | grep -E "(HTTP|RateLimit|X-RateLimit|Content-Type)" || echo "No relevant headers"
    
    # Check if we got 429
    if echo "$PUT_RESPONSE" | grep -q "429"; then
        echo "🚨 429 DETECTED on PUT request #$i"
        break
    fi
    
    echo ""
    echo "---- REFRESH (GET /api/main/staff-roster) ----"
    
    # GET request
    GET_RESPONSE=$(curl -sk -b "$JAR" \
        "$BASE/api/main/staff-roster" \
        -D - -o /dev/null 2>&1)
    
    echo "GET Response Headers:"
    echo "$GET_RESPONSE" | grep -E "(HTTP|RateLimit|X-RateLimit|Content-Type)" || echo "No relevant headers"
    
    # Check if we got 429
    if echo "$GET_RESPONSE" | grep -q "429"; then
        echo "🚨 429 DETECTED on GET request #$i"
        break
    fi
    
    # Extract and display rate limit info
    REMAINING=$(echo "$GET_RESPONSE" | grep -i "ratelimit-remaining" | head -1 | cut -d: -f2 | tr -d ' \r' || echo "unknown")
    LIMIT=$(echo "$GET_RESPONSE" | grep -i "ratelimit-limit" | head -1 | cut -d: -f2 | tr -d ' \r' || echo "unknown")
    
    echo "📊 Rate Limit Status: $REMAINING/$LIMIT remaining"
    
    # Small delay to avoid overwhelming
    sleep 0.2
done

echo ""
echo "=== STEP 3: Proxy IP Key Test ==="
echo "Testing if rate limiter keys by proxy IP vs client IP..."

# Test with different X-Forwarded-For headers
for ip in "1.1.1.1" "2.2.2.2"; do
    echo ""
    echo "== Testing with X-Forwarded-For: $ip =="
    
    XFF_RESPONSE=$(curl -sk -H "X-Forwarded-For: $ip" \
        "$BASE/api/main/staff-roster" \
        -D - -o /dev/null 2>&1)
    
    echo "Response Headers:"
    echo "$XFF_RESPONSE" | grep -E "(HTTP|RateLimit|X-RateLimit)" || echo "No rate limit headers"
    
    REMAINING=$(echo "$XFF_RESPONSE" | grep -i "ratelimit-remaining" | head -1 | cut -d: -f2 | tr -d ' \r' || echo "unknown")
    echo "Remaining: $REMAINING"
done

echo ""
echo "=== STEP 4: CSRF Per-Click Check ==="
echo "Testing if CSRF is fetched on every add..."

# Get fresh CSRF and try one add
echo "Getting fresh CSRF token..."
FRESH_CSRF=$(curl -sk -b "$JAR" "$BASE/csrf")
FRESH_TOKEN=$(echo "$FRESH_CSRF" | jq -r .csrfToken 2>/dev/null || echo "FAILED")

echo "Fresh token: ${FRESH_TOKEN:0:20}..."

# Try one add and monitor for CSRF calls
echo "Performing one add operation..."
curl -sk -b "$JAR" \
    -H "Content-Type: application/json" \
    -H "X-CSRF-Token: $FRESH_TOKEN" \
    -X PUT "$BASE/api/main/staff-roster/99" \
    -d "{\"masseuse_name\":\"TestUser_99\",\"status\":null}" \
    -D - -o /dev/null 2>&1 | grep -E "(HTTP|RateLimit|X-RateLimit)" || echo "No rate limit headers"

echo ""
echo "✅ Production diagnosis complete!"
echo "📊 Summary:"
echo "  - Check above for 429 occurrences and which request triggered it"
echo "  - Compare rate limit remaining counts between X-Forwarded-For tests"
echo "  - If remaining counts are identical, proxy IP keying is the issue"
