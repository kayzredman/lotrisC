#!/usr/bin/env bash
# Tail Lotris mobile dev logs (Metro terminal + API + Expo JSONL).
# Usage: bash scripts/mobile-logs.sh [api|expo|all]
set -euo pipefail

ROOT="$(cd "$(dirname "$0")/.." && pwd)"
MODE="${1:-all}"
API_LOG="${LOTRIS_API_LOG:-$ROOT/.lotris-api.log}"
EXPO_LOG="$ROOT/apps/mobile/.expo/dev/logs/start.log"

tail_api() {
  if [[ -f "$API_LOG" ]]; then
    echo "── API ($API_LOG) ──"
    tail -n 40 "$API_LOG" | rg -i "error|fail|exception|/api/v1|401|500" || tail -n 20 "$API_LOG"
  else
    echo "API log not found: $API_LOG"
  fi
}

tail_expo() {
  if [[ -f "$EXPO_LOG" ]]; then
    echo "── Expo JSONL ($EXPO_LOG) ──"
    tail -n 15 "$EXPO_LOG" | python3 -c "
import sys, json
for line in sys.stdin:
    line = line.strip()
    if not line: continue
    try:
        o = json.loads(line)
        if o.get('level') == 'error' or o.get('_e') == 'metro:client_log':
            print(line[:500])
    except Exception:
        pass
" || tail -n 10 "$EXPO_LOG"
  fi
  echo ""
  echo "── Metro / Expo (live terminal) ──"
  echo "  Watch the terminal running: pnpm mobile:start:tunnel"
  echo "  Or: pnpm mobile:url  for tunnel link"
}

case "$MODE" in
  api) tail_api ;;
  expo) tail_expo ;;
  all)
    echo "Lotris mobile dev logs"
    echo "========================"
    echo ""
    tail_expo
    echo ""
    tail_api
    ;;
  *) echo "Usage: bash scripts/mobile-logs.sh [api|expo|all]"; exit 1 ;;
esac
