#!/usr/bin/env bash
# ============================================================================
# Create firebase-service-account.json from environment variable
#
# Call this BEFORE building the Electron apps.
# The file is gitignored and must be re-created on each machine.
#
# Usage:
#   FIREBASE_SERVICE_ACCOUNT_JSON='{"type":"service_account",...}' bash scripts/create-firebase-sa.sh
#   OR set it in a local .env file and run: source .env && bash scripts/create-firebase-sa.sh
# ============================================================================
set -e

REPO_ROOT="$(cd "$(dirname "${BASH_SOURCE[0]}")/.." && pwd)"
OUT="$REPO_ROOT/firebase-service-account.json"

if [ -z "$FIREBASE_SERVICE_ACCOUNT_JSON" ]; then
  echo "❌ FIREBASE_SERVICE_ACCOUNT_JSON is not set."
  echo ""
  echo "Set it as an environment variable before running this script:"
  echo "   export FIREBASE_SERVICE_ACCOUNT_JSON='{\"type\":\"service_account\",...}'"
  echo ""
  echo "Or create a .env file in the repo root with that variable and source it:"
  echo "   source .env && bash scripts/create-firebase-sa.sh"
  exit 1
fi

printf '%s' "$FIREBASE_SERVICE_ACCOUNT_JSON" > "$OUT"

# Validate JSON
node -e "JSON.parse(require('fs').readFileSync('$OUT','utf8'))" 2>/dev/null || {
  rm -f "$OUT"
  echo "❌ FIREBASE_SERVICE_ACCOUNT_JSON is not valid JSON. File not created."
  exit 1
}

echo "✓ firebase-service-account.json written to: $OUT"
echo "  (This file is gitignored — never commit it)"
