#!/usr/bin/env bash
# Verify server push: device registered → send test push or claim queue ticket.
# Usage: bash scripts/mobile-push-verify.sh [--claim]
set -euo pipefail

ROOT="$(cd "$(dirname "$0")/.." && pwd)"
BASE="${LOTRIS_API_URL:-http://192.168.100.51:5153}"
DEV_EMAIL="${LOTRIS_DEV_EMAIL:-admin-loose@test.local}"
DEV_PASS="${LOTRIS_DEV_PASS:-Test1234!}"
CLAIM=false
[[ "${1:-}" == "--claim" ]] && CLAIM=true

LOGIN=$(curl -sf -X POST "$BASE/api/v1/auth/login" \
  -H 'Content-Type: application/json' \
  -d "{\"email\":\"$DEV_EMAIL\",\"password\":\"$DEV_PASS\"}")
TOKEN=$(echo "$LOGIN" | python3 -c "import sys,json; print(json.load(sys.stdin)['accessToken'])")
AUTH="Authorization: Bearer $TOKEN"

echo ""
echo "═══════════════════════════════════════════════════════════"
echo "  Server push verification"
echo "═══════════════════════════════════════════════════════════"
echo ""

DEVICES=$(curl -sf -H "$AUTH" "$BASE/api/v1/devices")
COUNT=$(echo "$DEVICES" | python3 -c "import sys,json; print(len(json.load(sys.stdin)))" 2>/dev/null || echo "0")

echo "Registered devices: $COUNT"
if [[ "$COUNT" == "0" ]]; then
  echo ""
  echo "  ✗ No device on API — server push cannot reach your phone yet."
  echo ""
  echo "  On your phone:"
  echo "    1. Open Lotris Pager (logged in as $DEV_EMAIL)"
  echo "    2. Allow notifications when prompted"
  echo "    3. Me tab → tap 'Retry push registration'"
  echo "    4. Confirm Push shows 'Registered'"
  echo "    5. Re-run: pnpm mobile:push:verify"
  exit 1
fi

echo "$DEVICES" | python3 -m json.tool 2>/dev/null | head -20
echo ""

if $CLAIM; then
  TICKET_ID=$(curl -sf -H "$AUTH" "$BASE/api/v1/queue?limit=1" | python3 -c "
import sys,json
q=json.load(sys.stdin)
print(q[0]['id'] if q else '')
" 2>/dev/null)
  if [[ -z "$TICKET_ID" ]]; then
    echo "  ✗ No queue tickets to claim"
    exit 1
  fi
  echo "→ Claiming ticket $TICKET_ID (triggers TICKET_ASSIGNED push)…"
  CODE=$(curl -sf -o /tmp/claim.json -w '%{http_code}' -X POST -H "$AUTH" "$BASE/api/v1/queue/claim/$TICKET_ID")
  echo "  Claim response: HTTP $CODE"
  cat /tmp/claim.json | python3 -m json.tool 2>/dev/null | head -10 || true
else
  echo "→ Sending test push via API…"
  CODE=$(curl -sf -o /tmp/push-test.json -w '%{http_code}' -X POST -H "$AUTH" "$BASE/api/v1/devices/test-push")
  echo "  test-push response: HTTP $CODE"
  cat /tmp/push-test.json | python3 -m json.tool 2>/dev/null || cat /tmp/push-test.json
fi

echo ""
echo "  On phone: background the app (home button), wait ~10s for notification."
echo "  Check API log: rg 'Expo push' $ROOT/.lotris-api.log | tail -5"
echo "═══════════════════════════════════════════════════════════"
echo ""
