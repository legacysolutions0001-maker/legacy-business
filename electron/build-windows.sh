#!/usr/bin/env bash
# ============================================================================
# Legacy Business ERP — Windows Build Script
# Run this on a Windows machine (Git Bash / WSL2 / GitHub Actions)
# ============================================================================
set -e

REPO_ROOT="$(cd "$(dirname "${BASH_SOURCE[0]}")/.." && pwd)"
ELECTRON_DIR="$REPO_ROOT/electron"
OUTPUT_DIR="$REPO_ROOT/dist-electron"

echo ""
echo "╔══════════════════════════════════════════════════════╗"
echo "║       Legacy Business ERP — Windows Build            ║"
echo "╚══════════════════════════════════════════════════════╝"
echo ""

# ── Step 1: Check prerequisites ──────────────────────────────────────────────
echo "▶ [1/7] Checking prerequisites..."

command -v node  >/dev/null 2>&1 || { echo "❌ Node.js not found. Install from https://nodejs.org"; exit 1; }
command -v pnpm  >/dev/null 2>&1 || { echo "❌ pnpm not found. Run: npm install -g pnpm"; exit 1; }

NODE_VER=$(node -e "process.stdout.write(process.version)")
echo "   ✓ Node.js $NODE_VER"

# ── Step 2: Verify icons exist ───────────────────────────────────────────────
echo "▶ [2/7] Checking icons..."
if [ ! -f "$ELECTRON_DIR/icons/icon.ico" ]; then
  echo "   ❌ Missing: electron/icons/icon.ico"
  echo "   See electron/icons/README.md for instructions."
  exit 1
fi
echo "   ✓ Icons found"

# ── Step 3: Install workspace dependencies ───────────────────────────────────
echo "▶ [3/7] Installing workspace dependencies..."
cd "$REPO_ROOT"
pnpm install --frozen-lockfile
echo "   ✓ Dependencies installed"

# ── Step 4: Build API server ─────────────────────────────────────────────────
echo "▶ [4/7] Building API server..."
PORT=8080 BASE_PATH=/ pnpm --filter @workspace/api-server run build
echo "   ✓ API server built → artifacts/api-server/dist/"

# ── Step 5: Build frontend ────────────────────────────────────────────────────
echo "▶ [5/7] Building frontend..."
PORT=21973 BASE_PATH=/ pnpm --filter @workspace/legacy-business run build
echo "   ✓ Frontend built → artifacts/legacy-business/dist/public/"

# ── Step 6: Install Electron dependencies ────────────────────────────────────
echo "▶ [6/7] Installing Electron dependencies..."
cd "$ELECTRON_DIR"
npm install
echo "   ✓ Electron dependencies installed"

# ── Step 7: Build Windows installer ──────────────────────────────────────────
echo "▶ [7/7] Building Windows installer..."
npx electron-builder --win --x64
echo ""
echo "╔══════════════════════════════════════════════════════╗"
echo "║  ✅  Build Complete!                                 ║"
echo "╚══════════════════════════════════════════════════════╝"
echo ""
echo "Output files in: $OUTPUT_DIR"
echo ""

# List output files
if [ -d "$OUTPUT_DIR" ]; then
  ls -lh "$OUTPUT_DIR"/*.exe 2>/dev/null || echo "(No .exe files found)"
fi

echo ""
echo "Files produced:"
echo "  • Legacy Business Setup.exe        — Windows installer"
echo "  • Legacy Business Portable.exe     — Portable version (no install needed)"
echo ""
echo "Next steps:"
echo "  1. Test the installer on a clean Windows machine"
echo "  2. Optionally sign the .exe with a code signing certificate"
echo "  3. Distribute to users"
