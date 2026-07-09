#!/usr/bin/env bash
# One-time EAS setup for iOS Expo Go server push.
# Usage: bash scripts/mobile-eas-setup.sh
set -euo pipefail

ROOT="$(cd "$(dirname "$0")/.." && pwd)"
MOBILE="$ROOT/apps/mobile"
ENV_FILE="$MOBILE/.env"

echo ""
echo "Lotris Pager — EAS push setup (iPhone / Expo Go)"
echo "================================================="
echo ""

if npx --yes eas-cli whoami >/dev/null 2>&1; then
  echo "✓ Logged in as: $(npx --yes eas-cli whoami 2>/dev/null)"
else
  echo "Step 1: Log in to Expo (browser opens)"
  echo "  cd apps/mobile && npx eas-cli login"
  echo ""
  read -r -p "Press Enter to run eas login now, or Ctrl+C to do it yourself…" _
  cd "$MOBILE" && npx eas-cli login
fi

echo ""
echo "Step 2: Link project (creates eas.json + project ID)"
cd "$MOBILE"
npx eas-cli init

PROJECT_ID=$(node -e "
const fs=require('fs');
try {
  const j=JSON.parse(fs.readFileSync('app.json','utf8'));
  console.log(j.expo?.extra?.eas?.projectId||'');
} catch(e) { console.log(''); }
" 2>/dev/null)

if [[ -z "$PROJECT_ID" && -f "$MOBILE/app.config.js" ]]; then
  PROJECT_ID=$(grep -oE 'EXPO_PUBLIC_EAS_PROJECT_ID' "$ENV_FILE" 2>/dev/null && true)
fi

# eas init often writes to app.json
PROJECT_ID=$(node -e "
const fs=require('fs');
for (const f of ['app.json','app.config.js']) {
  try {
    if (f==='app.json') {
      const j=JSON.parse(fs.readFileSync('app.json','utf8'));
      if (j.expo?.extra?.eas?.projectId) { console.log(j.expo.extra.eas.projectId); process.exit(0); }
    }
  } catch(e) {}
}
" 2>/dev/null)

if [[ -z "$PROJECT_ID" ]]; then
  echo ""
  echo "Copy the project ID from expo.dev or app.json → extra.eas.projectId"
  read -r -p "Paste EAS project ID: " PROJECT_ID
fi

if [[ -n "$PROJECT_ID" ]]; then
  if grep -q '^EXPO_PUBLIC_EAS_PROJECT_ID=' "$ENV_FILE" 2>/dev/null; then
    sed -i "s/^EXPO_PUBLIC_EAS_PROJECT_ID=.*/EXPO_PUBLIC_EAS_PROJECT_ID=$PROJECT_ID/" "$ENV_FILE"
  else
    echo "EXPO_PUBLIC_EAS_PROJECT_ID=$PROJECT_ID" >> "$ENV_FILE"
  fi
  echo ""
  echo "✓ Wrote EXPO_PUBLIC_EAS_PROJECT_ID to apps/mobile/.env"
fi

echo ""
echo "Step 3: Restart Expo and on iPhone:"
echo "  pnpm mobile:start:tunnel"
echo "  Reload app → Me → Retry push registration"
echo "  Then: pnpm mobile:push:verify"
echo ""
