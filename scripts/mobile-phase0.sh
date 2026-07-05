#!/usr/bin/env bash
# Phase 0 — mobile dev environment gate (workstation + phone checklist).
# Usage: bash scripts/mobile-phase0.sh [--ensure-api]
set -euo pipefail

ROOT="$(cd "$(dirname "$0")/.." && pwd)"
ENSURE_API=false
[[ "${1:-}" == "--ensure-api" ]] && ENSURE_API=true

LAN_IP="$(hostname -I 2>/dev/null | awk '{print $1}')"
API_PORT="${LOTRIS_API_PORT:-5153}"
DEV_EMAIL="admin-loose@test.local"
DEV_PASS="Test1234!"

echo ""
echo "═══════════════════════════════════════════════════════════"
echo "  Lotris Mobile Pager — Phase 0"
echo "═══════════════════════════════════════════════════════════"
echo ""

# ── 0.5 Backend ─────────────────────────────────────────────────────────────
if [[ "$ENSURE_API" == true ]] || ! curl -sf "http://localhost:${API_PORT}/health" >/dev/null 2>&1; then
  echo "→ Starting docker deps + API…"
  docker compose -f "$ROOT/docker/docker-compose.yml" up -d mssql redis qdrant 2>/dev/null || true
  bash "$ROOT/scripts/restart-api.sh" --skip-docker
  echo ""
fi

# ── Automated checks ────────────────────────────────────────────────────────
echo "Workstation checks"
echo "──────────────────"
bash "$ROOT/scripts/mobile-dev-prep.sh" || exit 1
echo ""

echo "LAN connectivity (from this PC)"
echo "────────────────────────────────"
LAN_OK=true

if [[ -z "$LAN_IP" ]]; then
  echo "  ✗ Could not detect LAN IP"
  LAN_OK=false
else
  echo "  LAN IP: $LAN_IP"
  if curl -sf --connect-timeout 3 "http://${LAN_IP}:${API_PORT}/health" >/dev/null; then
    echo "  ✓ GET http://${LAN_IP}:${API_PORT}/health"
  else
    echo "  ✗ GET http://${LAN_IP}:${API_PORT}/health — failed"
    echo "    Fix: pnpm api:restart  (binds 0.0.0.0)"
    LAN_OK=false
  fi

  LOGIN_RESP="$(curl -sf --connect-timeout 5 -X POST "http://${LAN_IP}:${API_PORT}/api/v1/auth/login" \
    -H 'Content-Type: application/json' \
    -d "{\"email\":\"${DEV_EMAIL}\",\"password\":\"${DEV_PASS}\"}" 2>/dev/null || true)"
  if echo "$LOGIN_RESP" | grep -q accessToken; then
    echo "  ✓ POST /api/v1/auth/login (dev credentials)"
  else
    echo "  ✗ Dev login via LAN failed"
    LAN_OK=false
  fi
fi
echo ""

# ── Phone checklist (manual) ────────────────────────────────────────────────
echo "Phone checklist (you do these on device)"
echo "──────────────────────────────────────────"
echo "  1. Install Expo Go:"
echo "     Android: https://play.google.com/store/apps/details?id=host.exp.exponent"
echo "     iOS:     https://apps.apple.com/app/expo-go/id982107779"
echo ""
echo "  2. Phone on same Wi‑Fi as this PC (not mobile data)"
echo ""
if [[ -n "$LAN_IP" ]]; then
  echo "  3. Open in phone browser:"
  echo "     http://${LAN_IP}:${API_PORT}/health"
  echo "     → expect JSON: {\"status\":\"Healthy\",...}"
  echo ""
  echo "  4. Phase 1 env (save for scaffold):"
  echo "     EXPO_PUBLIC_API_URL=http://${LAN_IP}:${API_PORT}"
fi
echo ""
echo "  5. Dev login (Phase 1 app): ${DEV_EMAIL} / ${DEV_PASS}"
echo ""
echo "  6. Management approval — MOBILE-PAGER-SCOPE.md §14 (when ready)"
echo ""

# ── Gate ────────────────────────────────────────────────────────────────────
if [[ "$LAN_OK" != true ]]; then
  echo "Phase 0 BLOCKED — fix workstation/LAN items above."
  exit 1
fi

echo "═══════════════════════════════════════════════════════════"
echo "  Workstation Phase 0: PASS"
echo "  Complete phone steps 1–3, then reply ready for Phase 1."
echo "═══════════════════════════════════════════════════════════"
echo ""
