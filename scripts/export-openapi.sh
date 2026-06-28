#!/usr/bin/env bash
# Export the live OpenAPI document to docs/openapi/v1.json (requires API running).
set -euo pipefail
ROOT="$(cd "$(dirname "$0")/.." && pwd)"
API_URL="${LOTRIS_API_URL:-http://localhost:5153}"
OUT="$ROOT/docs/openapi/v1.json"

mkdir -p "$(dirname "$OUT")"
curl -sf "$API_URL/openapi/v1.json" -o "$OUT"
echo "Exported OpenAPI spec → $OUT ($(wc -c < "$OUT" | tr -d ' ') bytes)"
