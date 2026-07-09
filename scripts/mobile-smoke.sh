#!/usr/bin/env bash
# Mobile API smoke — auth lifecycle, queue, devices, optional lead workload.
set -euo pipefail

BASE="${LOTRIS_API_URL:-http://192.168.100.51:5153}"
DEV_EMAIL="${LOTRIS_DEV_EMAIL:-admin-loose@test.local}"
DEV_PASS="${LOTRIS_DEV_PASS:-Test1234!}"
PASS=0
FAIL=0

check() {
  local name="$1" expect="$2" got="$3"
  if [[ "$got" == "$expect" ]]; then
    echo "  ✓ $name"
    PASS=$((PASS + 1))
  else
    echo "  ✗ $name (expected $expect, got $got)"
    FAIL=$((FAIL + 1))
  fi
}

echo ""
echo "Mobile API smoke"
echo "================"

LOGIN=$(curl -sf -X POST "$BASE/api/v1/auth/login" -H 'Content-Type: application/json' \
  -d "{\"email\":\"$DEV_EMAIL\",\"password\":\"$DEV_PASS\"}")
TOKEN=$(echo "$LOGIN" | python3 -c "import sys,json; print(json.load(sys.stdin)['accessToken'])")
REFRESH=$(echo "$LOGIN" | python3 -c "import sys,json; print(json.load(sys.stdin)['refreshToken'])")
AUTH="Authorization: Bearer $TOKEN"
ROLE=$(curl -sf -H "$AUTH" "$BASE/api/v1/users/me" | python3 -c "import sys,json; print(json.load(sys.stdin).get('roleName',''))" 2>/dev/null || true)

check "POST /auth/login" "ok" "ok"
check "GET /health" "200" "$(curl -sf -o /dev/null -w '%{http_code}' "$BASE/health")"
check "GET /users/me" "200" "$(curl -sf -o /dev/null -w '%{http_code}' -H "$AUTH" "$BASE/api/v1/users/me")"
check "GET /tickets" "200" "$(curl -sf -o /dev/null -w '%{http_code}' -H "$AUTH" "$BASE/api/v1/tickets?limit=5")"
check "GET /queue" "200" "$(curl -sf -o /dev/null -w '%{http_code}' -H "$AUTH" "$BASE/api/v1/queue?limit=5")"
check "GET /devices" "200" "$(curl -sf -o /dev/null -w '%{http_code}' -H "$AUTH" "$BASE/api/v1/devices")"
check "GET /auth/providers" "200" "$(curl -sf -o /dev/null -w '%{http_code}' "$BASE/api/v1/auth/providers")"

REFRESHED=$(curl -sf -X POST "$BASE/api/v1/auth/refresh" -H 'Content-Type: application/json' \
  -d "{\"refreshToken\":\"$REFRESH\"}")
REFRESHED_TOKEN=$(echo "$REFRESHED" | python3 -c "import sys,json; print(json.load(sys.stdin)['accessToken'])")
REFRESHED_REFRESH=$(echo "$REFRESHED" | python3 -c "import sys,json; print(json.load(sys.stdin)['refreshToken'])")
REFRESHED_AUTH="Authorization: Bearer $REFRESHED_TOKEN"
check "POST /auth/refresh" "ok" "ok"
check "GET /users/me (refreshed token)" "200" "$(curl -sf -o /dev/null -w '%{http_code}' -H "$REFRESHED_AUTH" "$BASE/api/v1/users/me")"

TEAM_ID=$(curl -sf -H "$AUTH" "$BASE/api/v1/queue?limit=1" | python3 -c "
import sys,json
q=json.load(sys.stdin)
print(q[0].get('teamId','') if q else '')
" 2>/dev/null || true)

if [[ -n "$TEAM_ID" ]] && [[ "$ROLE" =~ ^(ADMIN|TEAM_LEAD|IT_MANAGER|SUPER_ADMIN)$ ]]; then
  code=$(curl -sf -o /dev/null -w '%{http_code}' -H "$AUTH" "$BASE/api/v1/analytics/team-workload?teamId=$TEAM_ID")
  check "GET /analytics/team-workload (lead)" "200" "$code"
fi

check "POST /auth/logout" "204" "$(curl -sf -o /dev/null -w '%{http_code}' -X POST "$BASE/api/v1/auth/logout" -H 'Content-Type: application/json' \
  -d "{\"refreshToken\":\"$REFRESHED_REFRESH\"}")"
check "POST /auth/refresh after logout" "401" "$(curl -s -o /dev/null -w '%{http_code}' -X POST "$BASE/api/v1/auth/refresh" -H 'Content-Type: application/json' \
  -d "{\"refreshToken\":\"$REFRESHED_REFRESH\"}")"

echo ""
echo "Result: $PASS passed, $FAIL failed"
[[ $FAIL -eq 0 ]]
