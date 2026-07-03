#!/usr/bin/env bash
# Smoke test for on-prem compose stack (default proxy http://localhost:9090).
set -euo pipefail

BASE="${LOTRIS_BASE_URL:-http://localhost:9090}"
ENV_FILE="${LOTRIS_ENV_FILE:-deploy/.env.onprem}"

pass=0
fail=0

check() {
  local name="$1" expected="$2" actual="$3"
  if [ "$actual" = "$expected" ]; then
    echo "PASS  $name (HTTP $actual)"
    pass=$((pass + 1))
  else
    echo "FAIL  $name — expected HTTP $expected, got $actual"
    fail=$((fail + 1))
  fi
}

echo "=== Lotris on-prem smoke ==="
echo "Base: $BASE"
echo ""

for path in /health /health/ready /; do
  code=$(curl -s -o /dev/null -w '%{http_code}' "$BASE$path" || echo 000)
  check "GET $path" 200 "$code"
done

if [ -f "$ENV_FILE" ]; then
  # shellcheck disable=SC1090
  set -a && source "$ENV_FILE" && set +a
  LOGIN=$(curl -s -w '\nHTTP:%{http_code}' -X POST "$BASE/api/v1/auth/login" \
    -H 'Content-Type: application/json' \
    -d "{\"email\":\"${LOTRIS_ADMIN_EMAIL:-admin@lotris.local}\",\"password\":\"${LOTRIS_ADMIN_PASSWORD:-ChangeMe1!Lotris}\"}" || true)
  LOGIN_HTTP=$(echo "$LOGIN" | tail -1 | sed 's/HTTP://')
  if [ "$LOGIN_HTTP" = "200" ]; then
    echo "PASS  POST /api/v1/auth/login (HTTP 200)"
    pass=$((pass + 1))
  else
    echo "SKIP  POST /api/v1/auth/login (HTTP ${LOGIN_HTTP:-000}) — run bootstrap first"
  fi
else
  echo "SKIP  login check — $ENV_FILE not found"
fi

echo ""
echo "Result: $pass passed, $fail failed"
[ "$fail" -eq 0 ]
