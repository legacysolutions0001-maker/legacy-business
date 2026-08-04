import { config as loadEnv } from "dotenv";
import path from "node:path";
import { fileURLToPath } from "node:url";

// Load the monorepo root .env file before anything else runs, so
// DATABASE_URL and other backend env vars are available without requiring
// a manual `export $(grep -v '^#' .env | xargs)` step. This works the same
// way on Windows, macOS, and Linux since dotenv just parses the file and
// assigns to process.env — no shell-specific export syntax involved.
// Existing environment variables (e.g. injected by Replit) always take
// precedence over values already defined in process.env.
//
// This must happen in its own top-level module, before "./server" (and the
// app/db modules it pulls in) is even imported, otherwise the imports would
// be hoisted ahead of the env loading and DATABASE_URL would still be
// missing when the db module reads it at import time. A dynamic import
// guarantees this file finishes running first.
const currentDir = path.dirname(fileURLToPath(import.meta.url));
loadEnv({ path: path.resolve(currentDir, "../../../.env"), quiet: true });

await import("./server");
