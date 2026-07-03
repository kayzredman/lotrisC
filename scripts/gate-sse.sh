#!/usr/bin/env bash
set -euo pipefail

BASE="${LOTRIS_API_URL:-http://localhost:5153}"
CURL=/usr/bin/curl
PY=/usr/bin/python3
PASS='Test1234!'

pass=0
fail=0

check() {
  local name="$1" expected="$2" actual="$3" detail="$4"
  if [ "$actual" = "$expected" ]; then
    echo "PASS  $name (HTTP $actual)"
    pass=$((pass + 1))
  else
    echo "FAIL  $name — expected HTTP $expected, got $actual"
    echo "      $detail"
    fail=$((fail + 1))
  fi
}

echo "=== Lotris Phase 7 SSE Gate ==="
echo "Base: $BASE"
echo ""

LOGIN_BODY=$($CURL -s -w '\nHTTP:%{http_code}' -X POST "$BASE/api/v1/auth/login" \
  -H 'Content-Type: application/json' \
  -d '{"email":"admin-loose@test.local","password":"'"$PASS"'"}')
LOGIN_HTTP=$(echo "$LOGIN_BODY" | tail -1 | cut -d: -f2)
LOGIN_JSON=$(echo "$LOGIN_BODY" | sed '$d')

if [ "$LOGIN_HTTP" != "200" ]; then
  echo "FAIL  login — HTTP $LOGIN_HTTP (need admin-loose@test.local seeded)"
  exit 1
fi

TOKEN=$($PY -c "import json,sys; print(json.load(sys.stdin).get('accessToken',''))" <<< "$LOGIN_JSON")
if [ -z "$TOKEN" ]; then
  echo "FAIL  no access token from login"
  exit 1
fi

echo "PASS  login (HTTP 200)"
pass=$((pass + 1))

# ── Health SSE (ADMIN) ──────────────────────────────────────────────────────
HEALTH_HEADERS=$($CURL -sS -D - -o /tmp/gate-health-sse.txt \
  -H "Authorization: Bearer $TOKEN" \
  -H "Accept: text/event-stream" \
  --max-time 3 \
  "$BASE/health/sse" 2>/dev/null || true)

HEALTH_CT=$(echo "$HEALTH_HEADERS" | rg -i "^content-type:" | head -1 | tr -d '\r' || true)
if echo "$HEALTH_CT" | rg -qi "text/event-stream"; then
  echo "PASS  GET /health/sse content-type (text/event-stream)"
  pass=$((pass + 1))
else
  echo "FAIL  GET /health/sse — expected text/event-stream, got: ${HEALTH_CT:-none}"
  fail=$((fail + 1))
fi

if rg -q "^data: " /tmp/gate-health-sse.txt 2>/dev/null; then
  echo "PASS  GET /health/sse received data frame"
  pass=$((pass + 1))
else
  echo "FAIL  GET /health/sse — no data frame in first 3s"
  head -c 200 /tmp/gate-health-sse.txt 2>/dev/null | tr '\n' ' '
  echo ""
  fail=$((fail + 1))
fi

# ── Notifications SSE (authenticated) ─────────────────────────────────────────
NOTIF_HEADERS=$($CURL -sS -D - -o /tmp/gate-notif-sse.txt \
  -H "Authorization: Bearer $TOKEN" \
  -H "Accept: text/event-stream" \
  --max-time 8 \
  "$BASE/api/v1/notifications/sse" 2>/dev/null || true)

NOTIF_CT=$(echo "$NOTIF_HEADERS" | rg -i "^content-type:" | head -1 | tr -d '\r' || true)
if echo "$NOTIF_CT" | rg -qi "text/event-stream"; then
  echo "PASS  GET /api/v1/notifications/sse content-type (text/event-stream)"
  pass=$((pass + 1))
else
  echo "FAIL  GET /api/v1/notifications/sse — expected text/event-stream, got: ${NOTIF_CT:-none}"
  fail=$((fail + 1))
fi

# Stream may only send keep-alive comments until an event fires — either is OK
if rg -q "(: connected|: keep-alive|data: )" /tmp/gate-notif-sse.txt 2>/dev/null; then
  echo "PASS  GET /api/v1/notifications/sse stream open (connected, keep-alive, or data)"
  pass=$((pass + 1))
else
  echo "FAIL  GET /api/v1/notifications/sse — stream did not respond in 3s"
  fail=$((fail + 1))
fi

# ── Unauthorized SSE rejected ─────────────────────────────────────────────────
code=$($CURL -s -o /dev/null -w '%{http_code}' --max-time 3 "$BASE/health/sse")
check "GET /health/sse (no auth)" 401 "$code" ""

echo ""
echo "=== Summary: $pass passed, $fail failed ==="
exit "$fail"
