#!/usr/bin/env sh
# Lotris on-prem bootstrap — seed admin, default team, SLA, optional skip onboarding.
# Runs inside the bootstrap compose service (curl image) after stack is healthy.
set -eu

BASE="${LOTRIS_BASE_URL:-http://proxy}"
SKIP="${LOTRIS_SKIP_ONBOARDING:-false}"
EMAIL="${LOTRIS_ADMIN_EMAIL:-admin@lotris.local}"
PASSWORD="${LOTRIS_ADMIN_PASSWORD:-ChangeMe1!Lotris}"
FULL_NAME="${LOTRIS_ADMIN_NAME:-Lotris Admin}"
TENANT_NAME="${LOTRIS_TENANT_NAME:-Lotris}"
TENANT_SLUG="${LOTRIS_TENANT_SLUG:-lotris}"
TEAM_NAME="${LOTRIS_DEFAULT_TEAM:-General Support}"

echo "=== Lotris bootstrap ==="
echo "Base URL: $BASE"
echo "Admin:    $EMAIL"
echo "Skip onboarding: $SKIP"
echo ""

wait_ready() {
  n=0
  until curl -sf "$BASE/health/ready" >/dev/null 2>&1; do
    n=$((n + 1))
    if [ "$n" -gt 60 ]; then
      echo "ERROR: API not ready after 5 minutes"
      exit 1
    fi
    echo "Waiting for API readiness… ($n)"
    sleep 5
  done
  echo "API ready."
}

json_field() {
  # portable JSON string extract (no python/jq required)
  body="$1"
  key="$2"
  echo "$body" | tr -d '\n' | sed -n "s/.*\"${key}\":\"\\([^\"]*\\)\".*/\\1/p"
}

wait_ready

# ── Login or register ────────────────────────────────────────────────────────
LOGIN=$(curl -sf -w '\nHTTP:%{http_code}' -X POST "$BASE/api/v1/auth/login" \
  -H 'Content-Type: application/json' \
  -d "{\"email\":\"$EMAIL\",\"password\":\"$PASSWORD\"}" 2>/dev/null || true)

LOGIN_HTTP=$(echo "$LOGIN" | tail -1 | sed 's/HTTP://')
LOGIN_BODY=$(echo "$LOGIN" | sed '$d')

if [ "$LOGIN_HTTP" = "200" ]; then
  echo "Admin already exists — logged in."
  TOKEN=$(json_field "$LOGIN_BODY" accessToken)
else
  echo "Registering tenant + admin…"
  REG=$(curl -sf -w '\nHTTP:%{http_code}' -X POST "$BASE/api/v1/auth/register" \
    -H 'Content-Type: application/json' \
    -d "{\"email\":\"$EMAIL\",\"password\":\"$PASSWORD\",\"fullName\":\"$FULL_NAME\",\"tenantName\":\"$TENANT_NAME\",\"tenantSlug\":\"$TENANT_SLUG\",\"role\":2}")

  REG_HTTP=$(echo "$REG" | tail -1 | sed 's/HTTP://')
  REG_BODY=$(echo "$REG" | sed '$d')

  if [ "$REG_HTTP" != "201" ] && [ "$REG_HTTP" != "200" ]; then
    echo "ERROR: register failed (HTTP $REG_HTTP)"
    echo "$REG_BODY"
    exit 1
  fi
  TOKEN=$(json_field "$REG_BODY" accessToken)
  echo "Registered."
fi

if [ -z "$TOKEN" ]; then
  echo "ERROR: no access token"
  exit 1
fi

AUTH="Authorization: Bearer $TOKEN"

# ── Org + team + SLA ─────────────────────────────────────────────────────────
curl -sf -X POST "$BASE/api/v1/onboarding/org" \
  -H "Content-Type: application/json" -H "$AUTH" \
  -d "{\"name\":\"$TENANT_NAME\",\"slug\":\"$TENANT_SLUG\"}" >/dev/null || true

TEAMS=$(curl -sf -H "$AUTH" "$BASE/api/v1/admin/teams" || echo '[]')
if echo "$TEAMS" | tr -d ' \n' | grep -q '^\[\]$'; then
  TEAM_COUNT=0
else
  TEAM_COUNT=1
fi

if [ "$TEAM_COUNT" = "0" ]; then
  echo "Creating default team: $TEAM_NAME"
  curl -sf -X POST "$BASE/api/v1/admin/teams" \
    -H "Content-Type: application/json" -H "$AUTH" \
    -d "{\"name\":\"$TEAM_NAME\",\"maxTicketsPerEngineer\":15,\"pickupSlaMinutes\":60}" >/dev/null
else
  echo "Team(s) already exist ($TEAM_COUNT)."
fi

curl -sf -X POST "$BASE/api/v1/onboarding/sla" \
  -H "Content-Type: application/json" -H "$AUTH" \
  -d '{"pickupSlaMinutes":60,"resolutionSlaMinutes":240}' >/dev/null || true

if [ "$SKIP" = "true" ] || [ "$SKIP" = "1" ]; then
  echo "Completing onboarding (skip wizard)…"
  curl -sf -X POST "$BASE/api/v1/onboarding/complete" -H "$AUTH" >/dev/null || true
else
  echo "Onboarding wizard left open — first admin login will redirect to /onboarding"
fi

# ── Smoke ────────────────────────────────────────────────────────────────────
curl -sf "$BASE/health" >/dev/null
curl -sf "$BASE/" >/dev/null
echo ""
echo "Bootstrap complete."
echo "  Web:   $BASE/"
echo "  Ops:   $BASE/ops"
echo "  Login: $EMAIL"
