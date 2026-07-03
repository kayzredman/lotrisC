#!/usr/bin/env bash
# Reset the Next.js dev server when .next cache is stale (e.g. after `pnpm build` while dev is running).
# Symptom: HTTP 500, "Cannot find module './NNN.js'" in next dev logs.
set -euo pipefail

ROOT="$(cd "$(dirname "${BASH_SOURCE[0]}")/.." && pwd)"
WEB_DIR="$ROOT/apps/web"
PORT="${LOTRIS_WEB_PORT:-3000}"

echo "=== Lotris web dev reset ==="
echo "Port: $PORT"
echo ""

if lsof -ti:"$PORT" >/dev/null 2>&1; then
  echo "Stopping process on :$PORT…"
  lsof -ti:"$PORT" | xargs kill -9 2>/dev/null || true
  sleep 1
else
  echo "No process listening on :$PORT"
fi

if [ -d "$WEB_DIR/.next" ]; then
  echo "Removing $WEB_DIR/.next…"
  rm -rf "$WEB_DIR/.next"
else
  echo "No .next cache to remove"
fi

echo ""
echo "Starting dev server…"
cd "$ROOT"
exec pnpm --filter @lotris/web dev
