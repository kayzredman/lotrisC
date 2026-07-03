#!/usr/bin/env bash
set -euo pipefail

BASE="${LOTRIS_API_URL:-http://localhost:5153}"
PASS='Lotris@Smoke2024!'
EMAIL="smoke-$(date +%s)@lotris.local"
CURL=/usr/bin/curl
PY=/usr/bin/python3

pass=0
fail=0

check() {
  local name="$1" expected="$2" actual="$3" body="$4"
  if [ "$actual" = "$expected" ]; then
    echo "PASS  $name (HTTP $actual)"
    pass=$((pass + 1))
  else
    echo "FAIL  $name — expected HTTP $expected, got $actual"
    echo "      $(echo "$body" | tr '\n' ' ' | head -c 240)"
    fail=$((fail + 1))
  fi
}

echo "=== Lotris Phase 5 API Smoke ==="
echo "Base: $BASE"
echo ""

for path in /health /health/live /health/ready /openapi/v1.json; do
  code=$($CURL -s -o /tmp/smoke-body.json -w '%{http_code}' "$BASE$path")
  check "GET $path" 200 "$code" "$(cat /tmp/smoke-body.json)"
done

LOGIN_BODY=$($CURL -s -w '\nHTTP:%{http_code}' -X POST "$BASE/api/v1/auth/login" \
  -H 'Content-Type: application/json' \
  -d '{"email":"admin-loose@test.local","password":"Test1234!"}')
LOGIN_HTTP=$(echo "$LOGIN_BODY" | tail -1 | cut -d: -f2)
LOGIN_JSON=$(echo "$LOGIN_BODY" | sed '$d')

if [ "$LOGIN_HTTP" != "200" ]; then
  REG=$($CURL -s -w '\nHTTP:%{http_code}' -X POST "$BASE/api/v1/auth/register" \
    -H 'Content-Type: application/json' \
    -d "{\"email\":\"$EMAIL\",\"password\":\"$PASS\",\"fullName\":\"Smoke Admin\",\"tenantName\":\"Smoke Tenant\",\"tenantSlug\":\"smoke-$(date +%s)\",\"role\":2}")
  REG_HTTP=$(echo "$REG" | tail -1 | cut -d: -f2)
  REG_JSON=$(echo "$REG" | sed '$d')
  check "POST /api/v1/auth/register" 201 "$REG_HTTP" "$REG_JSON"
  LOGIN_JSON="$REG_JSON"
else
  echo "PASS  POST /api/v1/auth/login (admin-loose@test.local) (HTTP $LOGIN_HTTP)"
  pass=$((pass + 1))
fi

TOKEN=$($PY -c "import json,sys; d=json.load(sys.stdin); print(d.get('accessToken',''))" <<< "$LOGIN_JSON")
if [ -z "$TOKEN" ]; then
  echo "FAIL  Could not obtain access token"
  exit 1
fi
AUTH="Authorization: Bearer $TOKEN"

code=$($CURL -s -o /tmp/smoke-body.json -w '%{http_code}' -H "$AUTH" "$BASE/api/v1/users/me")
check "GET /api/v1/users/me" 200 "$code" "$(cat /tmp/smoke-body.json)"

for path in \
  /api/v1/dashboard/summary \
  /api/v1/dashboard/queue-health \
  /api/v1/dashboard/engineer-perf \
  /api/v1/dashboard/team-workload \
  '/api/v1/dashboard/ticket-analytics?days=7'; do
  code=$($CURL -s -o /tmp/smoke-body.json -w '%{http_code}' -H "$AUTH" "$BASE$path")
  check "GET $path" 200 "$code" "$(cat /tmp/smoke-body.json)"
done

code=$($CURL -s -o /tmp/smoke-body.json -w '%{http_code}' -H "$AUTH" "$BASE/api/v1/analytics/sla-warnings")
check "GET /api/v1/analytics/sla-warnings" 200 "$code" "$(cat /tmp/smoke-body.json)"

for path in '/api/v1/tickets?page=1&limit=5' /api/v1/queue '/api/v1/tasks?page=1&limit=5'; do
  code=$($CURL -s -o /tmp/smoke-body.json -w '%{http_code}' -H "$AUTH" "$BASE$path")
  check "GET $path" 200 "$code" "$(cat /tmp/smoke-body.json)"
done

for path in /api/v1/kpi/definitions '/api/v1/kpi/actuals?page=1&limit=5' /api/v1/analytics/kpi-trends; do
  code=$($CURL -s -o /tmp/smoke-body.json -w '%{http_code}' -H "$AUTH" "$BASE$path")
  check "GET $path" 200 "$code" "$(cat /tmp/smoke-body.json)"
done

for path in /api/v1/reports /api/v1/reports/schedules /api/v1/reports/config; do
  code=$($CURL -s -o /tmp/smoke-body.json -w '%{http_code}' -H "$AUTH" "$BASE$path")
  check "GET $path" 200 "$code" "$(cat /tmp/smoke-body.json)"
done

code=$($CURL -s -o /tmp/smoke-body.json -w '%{http_code}' -H "$AUTH" "$BASE/api/v1/audit-logs?limit=10")
check "GET /api/v1/audit-logs" 200 "$code" "$(cat /tmp/smoke-body.json)"

code=$($CURL -s -o /tmp/smoke-body.json -w '%{http_code}' -H "$AUTH" "$BASE/health/snapshot")
check "GET /health/snapshot" 200 "$code" "$(cat /tmp/smoke-body.json)"

code=$($CURL -s -o /tmp/smoke-body.json -w '%{http_code}' -H 'Authorization: Bearer invalid' "$BASE/api/v1/dashboard/summary")
check "GET /dashboard/summary (bad token)" 401 "$code" "$(cat /tmp/smoke-body.json)"

echo ""
echo "=== Summary: $pass passed, $fail failed ==="
exit "$fail"
