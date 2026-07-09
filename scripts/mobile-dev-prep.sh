#!/usr/bin/env bash
# Check mobile dev prerequisites for Lotris Pager (Linux).
# Usage: bash scripts/mobile-dev-prep.sh [--install-adb]
set -euo pipefail

ROOT="$(cd "$(dirname "$0")/.." && pwd)"
INSTALL_ADB=false
[[ "${1:-}" == "--install-adb" ]] && INSTALL_ADB=true

pass=0
warn=0
fail=0

ok()   { echo "  ✓ $1"; pass=$((pass + 1)); }
note() { echo "  ○ $1"; warn=$((warn + 1)); }
bad()  { echo "  ✗ $1"; fail=$((fail + 1)); }

echo ""
echo "Lotris Mobile Pager — dev prerequisite check"
echo "============================================="
echo ""

echo "Core toolchain"
if command -v node >/dev/null && [[ "$(node -p 'process.versions.node.split(".")[0]')" -ge 20 ]]; then
  ok "Node $(node -v)"
else
  bad "Node 20+ required (https://nodejs.org)"
fi

if command -v pnpm >/dev/null; then
  ok "pnpm $(pnpm -v)"
else
  bad "pnpm 9+ required (npm i -g pnpm)"
fi

if command -v java >/dev/null; then
  ok "Java $(java -version 2>&1 | head -1)"
  note "Android Studio bundles JDK 17 — prefer that for emulator builds"
else
  note "Java not found — Android Studio will install JDK 17"
fi

echo ""
echo "Expo / React Native"
if npx --yes expo --version >/dev/null 2>&1; then
  ok "Expo CLI via npx ($(npx --yes expo --version 2>/dev/null | tail -1))"
else
  bad "Expo CLI unavailable — run: npx expo --version"
fi

if [[ -d "$ROOT/apps/mobile" ]]; then
  ok "apps/mobile exists"
else
  note "apps/mobile not scaffolded yet — see docs/MOBILE-IMPLEMENTATION-PHASES.md Phase 1"
fi

echo ""
echo "Android (emulator path — optional if using phone + Expo Go)"
if [[ -n "${ANDROID_HOME:-}" && -d "${ANDROID_HOME}/platform-tools" ]]; then
  ok "ANDROID_HOME=$ANDROID_HOME"
else
  note "ANDROID_HOME not set — install Android Studio (Phase 0)"
fi

if command -v adb >/dev/null; then
  ok "adb $(adb --version 2>/dev/null | head -1)"
else
  if $INSTALL_ADB && command -v apt-get >/dev/null; then
    echo "  → installing android-tools-adb..."
    sudo apt-get update -qq && sudo apt-get install -y android-tools-adb
    ok "adb installed"
  else
    note "adb not found — apt: android-tools-adb OR Android Studio SDK"
  fi
fi

if groups 2>/dev/null | grep -q '\bkvm\b'; then
  ok "user in kvm group (fast emulator)"
else
  note "not in kvm group — emulator will be slower (sudo usermod -aG kvm \$USER)"
fi

echo ""
echo "Lotris backend (required for API testing)"
if curl -sf http://localhost:5153/health >/dev/null 2>&1; then
  ok "API health http://localhost:5153/health"
else
  note "API not running — pnpm api:restart"
fi

if docker info >/dev/null 2>&1; then
  ok "Docker running"
else
  note "Docker not running — needed for MSSQL/Redis dev stack"
fi

LAN_IP="$(hostname -I 2>/dev/null | awk '{print $1}')"
if [[ -n "$LAN_IP" ]]; then
  if curl -sf --connect-timeout 3 "http://${LAN_IP}:5153/health" >/dev/null 2>&1; then
    ok "LAN API health http://${LAN_IP}:5153/health"
  elif curl -sf http://localhost:5153/health >/dev/null 2>&1; then
    bad "API on localhost only — restart with pnpm api:restart (binds 0.0.0.0 for phone testing)"
  else
    note "LAN IP $LAN_IP — API not reachable (pnpm api:restart)"
  fi
  if curl -sf --connect-timeout 3 "http://${LAN_IP}:8081/status" >/dev/null 2>&1; then
    ok "Metro reachable http://${LAN_IP}:8081 (Expo Go LAN mode)"
  elif ss -tlnp 2>/dev/null | grep -q ':8081'; then
    note "Metro on :8081 but LAN probe failed — try pnpm mobile:start:tunnel"
  else
    note "Metro not running — pnpm mobile:start"
  fi
else
  note "Could not detect LAN IP — phone must reach PC API over Wi-Fi"
fi

echo ""
echo "Summary: $pass ok, $warn optional/missing, $fail required"
echo ""
if [[ $fail -gt 0 ]]; then
  echo "Fix required items before mobile scaffold."
  exit 1
fi
echo "Next: docs/MOBILE-IMPLEMENTATION-PHASES.md"
exit 0
