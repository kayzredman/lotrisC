#!/usr/bin/env bash
# Start Expo for Lotris Pager with correct LAN hostname for phone testing.
# Usage: bash scripts/mobile-start.sh [--clear] [--tunnel]
set -euo pipefail

ROOT="$(cd "$(dirname "$0")/.." && pwd)"
LAN_IP="$(hostname -I 2>/dev/null | awk '{print $1}')"
CLEAR=false
TUNNEL=false

for arg in "$@"; do
  case "$arg" in
    --clear) CLEAR=true ;;
    --tunnel) TUNNEL=true ;;
  esac
done

export REACT_NATIVE_PACKAGER_HOSTNAME="${LAN_IP:-127.0.0.1}"

# Free :8081 if a previous Metro/Expo session is still running (avoids interactive prompt).
if ss -tlnp 2>/dev/null | grep -q ':8081'; then
  echo "→ Stopping previous Metro on :8081…"
  fuser -k 8081/tcp 2>/dev/null || true
  pkill -f "expo start" 2>/dev/null || true
  pkill -f "ngrok start" 2>/dev/null || true
  sleep 1
fi

echo "Lotris Pager — Expo"
echo "  LAN IP: ${REACT_NATIVE_PACKAGER_HOSTNAME}"
echo "  API:    http://${REACT_NATIVE_PACKAGER_HOSTNAME}:5153"
if $TUNNEL; then
  echo "  Mode:   tunnel (use if LAN QR times out)"
else
  echo "  Mode:   LAN — phone must reach http://${REACT_NATIVE_PACKAGER_HOSTNAME}:8081"
  echo "  Tip:    if timeout, retry: pnpm mobile:start:tunnel"
fi
echo ""

print_connect_info() {
  local exp_url="$1"
  echo ""
  echo "═══════════════════════════════════════════════════════════"
  echo "  Connect in Expo Go (QR is hidden in background mode)"
  echo "═══════════════════════════════════════════════════════════"
  echo ""
  echo "  exp:// URL:  ${exp_url}"
  if [[ "$exp_url" == *exp.direct* ]]; then
    echo "  https URL:   https://${exp_url#exp://}"
  fi
  echo ""
  echo "  Expo Go → Enter URL manually, or run: pnpm mobile:url"
  echo "═══════════════════════════════════════════════════════════"
  echo ""
}

cd "$ROOT/apps/mobile"
ARGS=(start)
$TUNNEL && ARGS+=(--tunnel) || ARGS+=(--lan)
$CLEAR && ARGS+=(--clear)

if $TUNNEL; then
  (
    if exp_url="$(bash "$ROOT/scripts/mobile-tunnel-url.sh" --wait 90)"; then
      print_connect_info "$exp_url"
    fi
  ) &
elif [[ -n "${REACT_NATIVE_PACKAGER_HOSTNAME:-}" ]]; then
  print_connect_info "exp://${REACT_NATIVE_PACKAGER_HOSTNAME}:8081"
fi

exec pnpm exec expo "${ARGS[@]}"
