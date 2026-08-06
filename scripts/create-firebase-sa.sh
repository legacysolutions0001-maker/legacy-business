#!/bin/bash
# Creates the bundled firebase-service-account.json in both electron resource folders.
# Run this script from the repo root before building the EXEs.
#
# Usage:
#   FIREBASE_SERVICE_ACCOUNT_JSON='{ ... }' bash scripts/create-firebase-sa.sh
#
# Or pass the JSON as the first argument:
#   bash scripts/create-firebase-sa.sh "$(cat path/to/serviceAccount.json)"

set -e

SA_JSON="${1:-$FIREBASE_SERVICE_ACCOUNT_JSON}"

if [ -z "$SA_JSON" ]; then
  echo "ERROR: No Firebase Service Account JSON provided."
  echo "Usage: FIREBASE_SERVICE_ACCOUNT_JSON='{ ... }' bash scripts/create-firebase-sa.sh"
  exit 1
fi

# Write to electron resources
mkdir -p electron/resources electron-owner/resources

echo "$SA_JSON" > electron/resources/firebase-service-account.json
echo "$SA_JSON" > electron-owner/resources/firebase-service-account.json

echo "✓ firebase-service-account.json written to:"
echo "  electron/resources/firebase-service-account.json"
echo "  electron-owner/resources/firebase-service-account.json"
