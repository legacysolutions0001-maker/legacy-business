import { migrate } from "drizzle-orm/node-postgres/migrator";
import path from "path";
import { fileURLToPath } from "url";
import fs from "fs";
import pg from "pg";
import { db, pool } from "./index";

const { Client } = pg;
const __currentDir = path.dirname(fileURLToPath(import.meta.url));

// SHA-256 hash of 0000_living_meltdown.sql as computed by Drizzle's
// readMigrationFiles() — must match exactly or Drizzle will re-apply it.
const MIGRATION_0000_HASH =
  "0a0e6c45164419aa783b7ba8225fc84434bef53177fc37b711031bbc39737440";

// Timestamp written into the journal entry; Drizzle skips a migration when
// drizzle.__drizzle_migrations.created_at >= folderMillis.
const MIGRATION_0000_MILLIS = 1783649228794n;

/**
 * Auto-create the target database (e.g. "legacy_erp") if it does not exist.
 *
 * Why this is needed: on a fresh Windows installation the PostgreSQL server is
 * running but only the default "postgres" database exists. The ERP app tries
 * to connect to "legacy_erp" and the connection fails with error code 3D000
 * ("database does not exist"), which crashes the API before it can open its
 * port. This function detects that specific error, connects to the default
 * "postgres" database as an admin, creates "legacy_erp", and returns so that
 * migrations can proceed normally.
 *
 * Safe to call on every boot — it is a no-op when the database already exists.
 */
async function ensureDatabaseExists(): Promise<void> {
  const dbUrl = process.env.DATABASE_URL;
  if (!dbUrl) return;

  // Parse target database name from the connection URL.
  let targetDb: string;
  let adminUrl: string;
  try {
    const u = new URL(dbUrl);
    targetDb = decodeURIComponent(u.pathname.replace(/^\/+/, ""));
    if (!targetDb || targetDb === "postgres") return;
    u.pathname = "/postgres";
    adminUrl = u.toString();
  } catch {
    return; // Unparseable URL — let the pool fail with its own error.
  }

  // Try connecting to the target database first.
  const testClient = new Client({
    connectionString: dbUrl,
    connectionTimeoutMillis: 8000,
  });

  try {
    await testClient.connect();
    await testClient.end();
    return; // Database exists and is reachable — nothing to do.
  } catch (err: any) {
    try {
      await testClient.end();
    } catch {}

    // 3D000 = "database does not exist" — we can create it.
    // Any other error (auth failure, host unreachable, etc.) should propagate
    // with a clear human-readable message.
    if (err.code !== "3D000") {
      if (err.code === "ECONNREFUSED" || err.message?.includes("ECONNREFUSED")) {
        throw new Error(
          `PostgreSQL is not running.\n\n` +
          `The application expects PostgreSQL at:\n  ${dbUrl.replace(/:\/\/[^@]*@/, "://<credentials>@")}\n\n` +
          `Steps to fix:\n` +
          `  1. Open "Services" (Win+R → services.msc) and start "postgresql-x64-*"\n` +
          `     OR open pgAdmin and start the server.\n` +
          `  2. If PostgreSQL is not installed, download it from:\n` +
          `     https://www.postgresql.org/download/windows/\n` +
          `  3. During installation, set the postgres user password to "postgres"\n` +
          `     or update the database URL in the app settings.\n\n` +
          `Original error: ${err.message}`,
        );
      }
      if (err.code === "28P01" || err.code === "28000") {
        throw new Error(
          `PostgreSQL authentication failed.\n\n` +
          `The username or password in the database URL is incorrect.\n` +
          `Current URL: ${dbUrl.replace(/:\/\/[^@]*@/, "://<credentials>@")}\n\n` +
          `To fix: open the app settings and update the database URL with the\n` +
          `correct PostgreSQL username and password.\n\n` +
          `Original error: ${err.message}`,
        );
      }
      throw new Error(
        `Cannot connect to PostgreSQL: ${err.message}\n\n` +
        `URL: ${dbUrl.replace(/:\/\/[^@]*@/, "://<credentials>@")}`,
      );
    }
  }

  // Database does not exist — create it via the "postgres" default database.
  const adminClient = new Client({
    connectionString: adminUrl,
    connectionTimeoutMillis: 8000,
  });

  try {
    await adminClient.connect();
    const safeName = targetDb.replace(/"/g, '""');
    await adminClient.query(`CREATE DATABASE "${safeName}"`);
    await adminClient.end();
    console.log(`[migrate] Created database: ${targetDb}`);
  } catch (createErr: any) {
    try {
      await adminClient.end();
    } catch {}
    // 42P04 = "database already exists" — race condition, safe to ignore.
    if (createErr.code === "42P04") return;
    throw new Error(
      `Database "${targetDb}" does not exist and could not be created automatically.\n\n` +
      `Please create it manually:\n` +
      `  1. Open pgAdmin or psql\n` +
      `  2. Run: CREATE DATABASE ${targetDb};\n\n` +
      `Auto-create error: ${createErr.message}`,
    );
  }
}

/**
 * Ensure the Drizzle migration-tracking table exists and contains a record
 * for every migration whose SQL has already been executed directly (i.e.
 * tables exist but were never tracked). Without this, Drizzle reruns the
 * migration and hits "relation already exists".
 *
 * Safe to call on every boot — all queries are idempotent.
 */
async function seedMigrationTracking(): Promise<void> {
  // Drizzle stores tracking state in its own schema.
  await pool.query(`CREATE SCHEMA IF NOT EXISTS drizzle`);
  await pool.query(`
    CREATE TABLE IF NOT EXISTS drizzle.__drizzle_migrations (
      id      SERIAL PRIMARY KEY,
      hash    text NOT NULL,
      created_at bigint
    )
  `);

  // Is migration 0000 already recorded?
  const { rows: existing } = await pool.query<{ id: number }>(
    `SELECT id FROM drizzle.__drizzle_migrations WHERE hash = $1 LIMIT 1`,
    [MIGRATION_0000_HASH],
  );
  if (existing.length > 0) return; // already tracked — nothing to do

  // Not tracked. Check whether the ERP tables are already present.
  const { rows: tableCheck } = await pool.query<{ exists: boolean }>(`
    SELECT EXISTS (
      SELECT 1 FROM information_schema.tables
      WHERE table_schema = 'public' AND table_name = 'lb_users'
    ) AS exists
  `);

  if (tableCheck[0]?.exists) {
    // Tables exist but were never tracked — record the migration as applied
    // so Drizzle will skip it instead of rerunning it.
    await pool.query(
      `INSERT INTO drizzle.__drizzle_migrations (hash, created_at)
       VALUES ($1, $2)`,
      [MIGRATION_0000_HASH, MIGRATION_0000_MILLIS],
    );
  }
  // If tables do NOT exist, we fall through and let migrate() create them
  // normally — it will insert the tracking row itself.
}

/**
 * Apply all pending Drizzle migrations. Safe to run on every boot.
 * Resolves the migrations folder from multiple candidate paths so it works
 * in both development (lib/db/src/) and the production bundle (dist/).
 *
 * Priority order for migrations folder:
 *   1. MIGRATIONS_DIR env var — set by the Electron main process to the
 *      extracted resources path (resources/migrations/).
 *   2. Relative ../migrations — works in development (lib/db/migrations/).
 *   3. Relative ./migrations  — works in the production bundle (dist/migrations/).
 */
export async function runMigrations(): Promise<void> {
  // Auto-create the target database if it doesn't exist yet.
  // This handles the common case on a fresh Windows install where PostgreSQL
  // is running but the "legacy_erp" database has never been created.
  await ensureDatabaseExists();

  const candidates = [
    // 1. Electron injects the resources/migrations path via env var.
    ...(process.env.MIGRATIONS_DIR ? [process.env.MIGRATIONS_DIR] : []),
    // 2. Development: lib/db/src/../migrations => lib/db/migrations/
    path.resolve(__currentDir, "../migrations"),
    // 3. Production bundle: dist/./migrations => dist/migrations/
    path.resolve(__currentDir, "./migrations"),
  ];

  const migrationsFolder = candidates.find((p) => fs.existsSync(p));
  if (!migrationsFolder) {
    throw new Error(
      `Migrations folder not found. Searched:\n  ${candidates.join("\n  ")}`,
    );
  }

  await seedMigrationTracking();
  await migrate(db, { migrationsFolder });
}
