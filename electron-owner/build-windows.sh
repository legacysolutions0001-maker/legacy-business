#!/usr/bin/env bash
# ============================================================================
# Legacy Business Owner — Windows Build Script
# Run this on a Windows machine (Git Bash)
# ============================================================================
set -e

REPO_ROOT="$(cd "$(dirname "${BASH_SOURCE[0]}")/.." && pwd)"
ELECTRON_DIR="$REPO_ROOT/electron-owner"
OUTPUT_DIR="$REPO_ROOT/dist-electron-owner"

echo ""
echo "╔══════════════════════════════════════════════════════╗"
echo "║     Legacy Business Owner — Windows Build            ║"
echo "╚══════════════════════════════════════════════════════╝"
echo ""

# ── Step 1: Check prerequisites ──────────────────────────────────────────────
echo "▶ [1/8] Checking prerequisites..."

command -v node  >/dev/null 2>&1 || { echo "❌ Node.js not found. Install from https://nodejs.org"; exit 1; }
command -v pnpm  >/dev/null 2>&1 || { echo "❌ pnpm not found. Run: npm install -g pnpm"; exit 1; }

NODE_VER=$(node -e "process.stdout.write(process.version)")
echo "   ✓ Node.js $NODE_VER"

# ── Step 2: Verify icons exist ───────────────────────────────────────────────
echo "▶ [2/8] Checking icons..."
if [ ! -f "$ELECTRON_DIR/icons/icon.ico" ]; then
  echo "   ❌ Missing: electron-owner/icons/icon.ico"
  echo "   See electron-owner/icons/README.md for instructions."
  exit 1
fi
echo "   ✓ Icons found"

# ── Step 3: Create firebase-service-account.json ─────────────────────────────
echo "▶ [3/8] Creating firebase-service-account.json..."
if [ ! -f "$REPO_ROOT/firebase-service-account.json" ]; then
  if [ -z "$FIREBASE_SERVICE_ACCOUNT_JSON" ]; then
    echo "   ❌ firebase-service-account.json not found and FIREBASE_SERVICE_ACCOUNT_JSON not set."
    echo "   Create firebase-service-account.json in the repo root, or set:"
    echo "     export FIREBASE_SERVICE_ACCOUNT_JSON='{\"type\":\"service_account\",...}'"
    exit 1
  fi
  printf '%s' "$FIREBASE_SERVICE_ACCOUNT_JSON" > "$REPO_ROOT/firebase-service-account.json"
  echo "   ✓ firebase-service-account.json created from env var"
else
  echo "   ✓ firebase-service-account.json already exists"
fi

# ── Step 4: Install workspace dependencies ───────────────────────────────────
echo "▶ [4/8] Installing workspace dependencies..."
cd "$REPO_ROOT"
pnpm install --frozen-lockfile
echo "   ✓ Dependencies installed"

# ── Step 5: Build API server ─────────────────────────────────────────────────
echo "▶ [5/8] Building API server..."
PORT=8090 BASE_PATH=/ pnpm --filter @workspace/api-server run build
echo "   ✓ API server built → artifacts/api-server/dist/"

# ── Step 6: Build frontend ────────────────────────────────────────────────────
echo "▶ [6/8] Building frontend..."
PORT=21974 BASE_PATH=/ pnpm --filter @workspace/legacy-business run build
echo "   ✓ Frontend built → artifacts/legacy-business/dist/public/"

# ── Step 7: Install Electron dependencies ────────────────────────────────────
echo "▶ [7/8] Installing Electron dependencies..."
cd "$ELECTRON_DIR"
npm install
echo "   ✓ Electron dependencies installed"

# ── Step 8: Build Windows installer ──────────────────────────────────────────
echo "▶ [8/8] Building Windows installer..."
npx electron-builder --win --x64
echo ""
echo "╔══════════════════════════════════════════════════════╗"
echo "║  ✅  Build Complete!                                 ║"
echo "╚══════════════════════════════════════════════════════╝"
echo ""
echo "Output files in: $OUTPUT_DIR"
echo ""

if [ -d "$OUTPUT_DIR" ]; then
  ls -lh "$OUTPUT_DIR"/*.exe 2>/dev/null || echo "(No .exe files found)"
fi

echo ""
echo "Files produced:"
echo "  • 'Legacy Business Owner Setup.exe'    — Windows installer"
echo "  • 'Legacy Business Owner Portable.exe' — Portable version"
echo ""
echo "Next steps:"
echo "  1. Test the installer on a clean Windows machine"
echo "  2. Verify Firebase license verification works"
echo "  3. Verify super admin login works"
