#!/usr/bin/env bash
# Failsafe Lotris API restart for local dev.
#
# - Ensures docker deps (mssql, redis, qdrant) are running
# - Stops any process on LOTRIS_API_PORT (default 5153)
# - Starts dotnet run (background by default; -f for foreground)
# - Waits for GET /health before exiting (background mode)
#
# Qdrant is optional — if unavailable, API still starts (keyword/SQL search fallback).
set -euo pipefail

ROOT="$(cd "$(dirname "${BASH_SOURCE[0]}")/.." && pwd)"
API_DIR="$ROOT/src/Lotris.Api"
PORT="${LOTRIS_API_PORT:-5153}"
BASE_URL="${LOTRIS_API_URL:-http://localhost:$PORT}"
COMPOSE_FILE="$ROOT/docker/docker-compose.yml"
LOG_FILE="${LOTRIS_API_LOG:-$ROOT/.lotris-api.log}"
FOREGROUND=false
SKIP_DOCKER=false
WAIT_TIMEOUT="${LOTRIS_API_WAIT_SEC:-90}"

usage() {
  cat <<EOF
Usage: $(basename "$0") [options]

Options:
  -f, --foreground   Run API in foreground (blocks terminal)
  --skip-docker      Do not start mssql/redis/qdrant via docker compose
  -h, --help         Show this help

Env:
  LOTRIS_API_PORT    API port (default: 5153)
  LOTRIS_API_URL     Health probe base URL (default: http://localhost:\$PORT)
  LOTRIS_API_LOG     Background log file (default: \$ROOT/.lotris-api.log)
  LOTRIS_API_WAIT_SEC  Health wait timeout seconds (default: 90)
EOF
}

while [[ $# -gt 0 ]]; do
  case $1 in
    -f|--foreground) FOREGROUND=true; shift ;;
    --skip-docker) SKIP_DOCKER=true; shift ;;
    -h|--help) usage; exit 0 ;;
    *) echo "Unknown option: $1" >&2; usage >&2; exit 1 ;;
  esac
done

echo "=== Lotris API restart ==="
echo "Port: $PORT"
echo ""

if [[ "$SKIP_DOCKER" != true ]]; then
  if command -v docker >/dev/null 2>&1; then
    echo "Ensuring dev docker services (mssql, redis, qdrant)…"
    docker compose -f "$COMPOSE_FILE" up -d mssql redis qdrant || {
      echo "Warning: docker compose failed — continuing (readiness may fail if deps are down)"
    }
  else
    echo "Docker not found — skipping dependency check (--skip-docker implied)"
  fi
fi

echo "Stopping process on :$PORT…"
if command -v fuser >/dev/null 2>&1; then
  fuser -k "${PORT}/tcp" 2>/dev/null || true
elif lsof -ti:"$PORT" >/dev/null 2>&1; then
  lsof -ti:"$PORT" | xargs kill -9 2>/dev/null || true
else
  echo "No process listening on :$PORT"
fi
sleep 2

export PATH="${HOME}/.dotnet:${PATH}"
export ASPNETCORE_ENVIRONMENT="${ASPNETCORE_ENVIRONMENT:-Development}"

cd "$API_DIR"

if [[ "$FOREGROUND" == true ]]; then
  echo "Starting API in foreground…"
  exec dotnet run --urls "http://localhost:$PORT" --no-launch-profile
fi

echo "Starting API in background (log: $LOG_FILE)…"
: >"$LOG_FILE"
nohup dotnet run --urls "http://localhost:$PORT" --no-launch-profile >>"$LOG_FILE" 2>&1 &
API_PID=$!
echo "PID: $API_PID"

echo "Waiting for $BASE_URL/health (timeout ${WAIT_TIMEOUT}s)…"
for ((i = 0; i < WAIT_TIMEOUT; i++)); do
  if curl -sf "$BASE_URL/health" >/dev/null 2>&1; then
    echo "API is up at $BASE_URL"
    exit 0
  fi
  if ! kill -0 "$API_PID" 2>/dev/null; then
    echo "API process exited early. Last log lines:" >&2
    tail -40 "$LOG_FILE" >&2
    exit 1
  fi
  sleep 1
done

echo "Timed out waiting for health. Last log lines:" >&2
tail -40 "$LOG_FILE" >&2
exit 1
