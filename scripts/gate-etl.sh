#!/usr/bin/env bash
# Phase 7 ETL gate — analytics job config, status, run-now cooldown.
set -euo pipefail

BASE="${LOTRIS_API_URL:-http://localhost:5153}"
CURL=/usr/bin/curl
PY=/usr/bin/python3
PASS='Test1234!'

pass=0
fail=0

check() {
  local name="$1" expected="$2" actual="$3" detail="${4:-}"
  if [ "$actual" = "$expected" ]; then
    echo "PASS  $name (HTTP $actual)"
    pass=$((pass + 1))
  else
    echo "FAIL  $name — expected HTTP $expected, got $actual"
    [ -n "$detail" ] && echo "      $detail"
    fail=$((fail + 1))
  fi
}

echo "=== Lotris ETL / Analytics Jobs Gate ==="
echo "Base: $BASE"
echo ""

LOGIN_BODY=$($CURL -s -w '\nHTTP:%{http_code}' -X POST "$BASE/api/v1/auth/login" \
  -H 'Content-Type: application/json' \
  -d "{\"email\":\"admin-loose@test.local\",\"password\":\"$PASS\"}")
LOGIN_HTTP=$(echo "$LOGIN_BODY" | tail -1 | cut -d: -f2)
LOGIN_JSON=$(echo "$LOGIN_BODY" | sed '$d')

if [ "$LOGIN_HTTP" != "200" ]; then
  echo "FAIL  login — HTTP ${LOGIN_HTTP:-000} (need admin-loose@test.local seeded)"
  exit 1
fi

TOKEN=$($PY -c "import json,sys; print(json.load(sys.stdin).get('accessToken',''))" <<< "$LOGIN_JSON")
if [ -z "$TOKEN" ]; then
  echo "FAIL  no access token from login"
  exit 1
fi

echo "PASS  login (HTTP 200)"
pass=$((pass + 1))

AUTH="Authorization: Bearer $TOKEN"

code=$($CURL -s -o /tmp/gate-etl-config.json -w '%{http_code}' -H "$AUTH" "$BASE/api/v1/admin/analytics-jobs/config")
check "GET /api/v1/admin/analytics-jobs/config" 200 "$code" "$(head -c 120 /tmp/gate-etl-config.json)"

code=$($CURL -s -o /tmp/gate-etl-status.json -w '%{http_code}' -H "$AUTH" "$BASE/api/v1/admin/analytics-jobs/status")
check "GET /api/v1/admin/analytics-jobs/status" 200 "$code" "$(head -c 120 /tmp/gate-etl-status.json)"

# PATCH config — bump rollup interval (idempotent if already 10)
INTERVAL=$($PY -c "
import json
c=json.load(open('/tmp/gate-etl-config.json'))
print(10 if c.get('incrementalRollupIntervalMinutes') != 10 else 5)
" 2>/dev/null || echo "10")

PATCH_BODY=$($PY -c "import json; print(json.dumps({'incrementalRollupIntervalMinutes': $INTERVAL}))")
code=$($CURL -s -o /tmp/gate-etl-patch.json -w '%{http_code}' -X PATCH "$BASE/api/v1/admin/analytics-jobs/config" \
  -H "$AUTH" -H 'Content-Type: application/json' -d "$PATCH_BODY")
check "PATCH /api/v1/admin/analytics-jobs/config" 200 "$code" "$(head -c 120 /tmp/gate-etl-patch.json)"

code=$($CURL -s -o /tmp/gate-etl-run1.json -w '%{http_code}' -X POST "$BASE/api/v1/admin/analytics-jobs/incremental-rollup/run-now" -H "$AUTH")
check "POST run-now/incremental-rollup (1st)" 200 "$code" "$(cat /tmp/gate-etl-run1.json)"

code=$($CURL -s -o /tmp/gate-etl-run2.json -w '%{http_code}' -X POST "$BASE/api/v1/admin/analytics-jobs/incremental-rollup/run-now" -H "$AUTH")
check "POST run-now/incremental-rollup (cooldown)" 429 "$code" "$(cat /tmp/gate-etl-run2.json)"

code=$($CURL -s -o /dev/null -w '%{http_code}' -H 'Authorization: Bearer invalid' "$BASE/api/v1/admin/analytics-jobs/config")
check "GET config (bad token)" 401 "$code" ""

echo ""
echo "=== Summary: $pass passed, $fail failed ==="
exit "$fail"
