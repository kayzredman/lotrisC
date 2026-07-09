#!/usr/bin/env bash
# Print Expo tunnel exp:// URL from a running @expo/ngrok instance.
# Usage: bash scripts/mobile-tunnel-url.sh [--wait [seconds]]
set -euo pipefail

WAIT_SEC=0
if [[ "${1:-}" == "--wait" ]]; then
  WAIT_SEC="${2:-45}"
fi

find_tunnel_url() {
  local p json pub host
  for p in 4040 4041 4042 4043 4044 4045; do
    json="$(curl -sf --connect-timeout 1 "http://127.0.0.1:${p}/api/tunnels" 2>/dev/null)" || continue
    pub="$(echo "$json" | python3 -c "
import sys, json
try:
    tunnels = json.load(sys.stdin).get('tunnels', [])
    for t in tunnels:
        u = t.get('public_url', '')
        if 'exp.direct' in u:
            print(u)
            break
except Exception:
    pass
" 2>/dev/null)"
    if [[ -n "$pub" ]]; then
      host="${pub#https://}"
      host="${host#http://}"
      echo "exp://${host}"
      return 0
    fi
  done
  return 1
}

deadline=$((SECONDS + WAIT_SEC))
while true; do
  if find_tunnel_url; then
    exit 0
  fi
  if (( WAIT_SEC == 0 || SECONDS >= deadline )); then
    exit 1
  fi
  sleep 2
done
