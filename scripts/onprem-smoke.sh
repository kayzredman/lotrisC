#!/usr/bin/env bash
# Smoke test for on-prem compose stack (default proxy http://localhost:9090).
set -euo pipefail

BASE="${LOTRIS_BASE_URL:-http://localhost:9090}"
ENV_FILE="${LOTRIS_ENV_FILE:-deploy/.env.onprem}"
CURL="${CURL:-/usr/bin/curl}"
PY="${PY:-/usr/bin/python3}"

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

echo "=== Lotris on-prem smoke ==="
echo "Base: $BASE"
echo ""

for path in /health /health/ready /; do
  code=$($CURL -s -o /dev/null -w '%{http_code}' "$BASE$path" || echo 000)
  check "GET $path" 200 "$code"
done

TOKEN=""
if [ -f "$ENV_FILE" ]; then
  # shellcheck disable=SC1090
  set -a && source "$ENV_FILE" && set +a
  ADMIN_EMAIL="${LOTRIS_ADMIN_EMAIL:-admin@lotris.local}"
  ADMIN_PASS="${LOTRIS_ADMIN_PASSWORD:-ChangeMe1!Lotris}"

  LOGIN=$($CURL -s -w '\nHTTP:%{http_code}' -X POST "$BASE/api/v1/auth/login" \
    -H 'Content-Type: application/json' \
    -d "{\"email\":\"$ADMIN_EMAIL\",\"password\":\"$ADMIN_PASS\"}" || true)
  LOGIN_HTTP=$(echo "$LOGIN" | tail -1 | sed 's/HTTP://')
  LOGIN_JSON=$(echo "$LOGIN" | sed '$d')

  if [ "$LOGIN_HTTP" = "200" ]; then
    echo "PASS  POST /api/v1/auth/login (HTTP 200)"
    pass=$((pass + 1))
    TOKEN=$($PY -c "import json,sys; print(json.load(sys.stdin).get('accessToken',''))" <<< "$LOGIN_JSON" 2>/dev/null || true)
  else
    echo "FAIL  POST /api/v1/auth/login (HTTP ${LOGIN_HTTP:-000}) — run bootstrap first"
    fail=$((fail + 1))
  fi
else
  echo "SKIP  login — $ENV_FILE not found"
fi

if [ -n "$TOKEN" ]; then
  AUTH="Authorization: Bearer $TOKEN"

  for path in /api/v1/admin/analytics-jobs/config /api/v1/admin/analytics-jobs/status; do
    outfile="/tmp/onprem-smoke$(echo "$path" | tr '/' '-').json"
    code=$($CURL -s -o "$outfile" -w '%{http_code}' -H "$AUTH" "$BASE$path" || echo 000)
    check "GET $path" 200 "$code" "$(head -c 120 "$outfile" 2>/dev/null)"
  done

  # PATCH config (toggle rollup interval for idempotency)
  INTERVAL=$($PY -c "
import json
try:
  c=json.load(open('/tmp/onprem-smoke-api-v1-admin-analytics-jobs-config.json'))
  print(10 if c.get('incrementalRollupIntervalMinutes') != 10 else 5)
except Exception:
  print(10)
" 2>/dev/null || echo "10")
  PATCH_BODY=$($PY -c "import json; print(json.dumps({'incrementalRollupIntervalMinutes': $INTERVAL}))")
  code=$($CURL -s -o /tmp/onprem-smoke-patch.json -w '%{http_code}' -X PATCH "$BASE/api/v1/admin/analytics-jobs/config" \
    -H "$AUTH" -H 'Content-Type: application/json' -d "$PATCH_BODY" || echo 000)
  check "PATCH /api/v1/admin/analytics-jobs/config" 200 "$code" "$(head -c 120 /tmp/onprem-smoke-patch.json 2>/dev/null)"

  code=$($CURL -s -o /tmp/onprem-smoke-run.json -w '%{http_code}' -X POST \
    "$BASE/api/v1/admin/analytics-jobs/incremental-rollup/run-now" -H "$AUTH" || echo 000)
  check "POST /api/v1/admin/analytics-jobs/incremental-rollup/run-now" 200 "$code" "$(cat /tmp/onprem-smoke-run.json 2>/dev/null)"

  code=$($CURL -s -o /tmp/onprem-smoke-run2.json -w '%{http_code}' -X POST \
    "$BASE/api/v1/admin/analytics-jobs/incremental-rollup/run-now" -H "$AUTH" || echo 000)
  check "POST run-now cooldown (2nd)" 429 "$code" "$(cat /tmp/onprem-smoke-run2.json 2>/dev/null)"
fi

echo ""
echo "Result: $pass passed, $fail failed"
[ "$fail" -eq 0 ]
