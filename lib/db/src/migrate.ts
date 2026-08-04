import { migrate } from "drizzle-orm/node-postgres/migrator";
import path from "path";
import { fileURLToPath } from "url";
import fs from "fs";
import { db, pool } from "./index";

const __currentDir = path.dirname(fileURLToPath(import.meta.url));

// SHA-256 hash of 0000_living_meltdown.sql as computed by Drizzle's
// readMigrationFiles() — must match exactly or Drizzle will re-apply it.
const MIGRATION_0000_HASH =
  "0a0e6c45164419aa783b7ba8225fc84434bef53177fc37b711031bbc39737440";

// Timestamp written into the journal entry; Drizzle skips a migration when
// drizzle.__drizzle_migrations.created_at >= folderMillis.
const MIGRATION_0000_MILLIS = 1783649228794n;

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
 */
export async function runMigrations(): Promise<void> {
  // Candidate paths in priority order:
  //   1. dev:  lib/db/src/../migrations  => lib/db/migrations/
  //   2. prod: dist/./migrations          => dist/migrations/ (copied by build.mjs)
  const candidates = [
    path.resolve(__currentDir, "../migrations"),
    path.resolve(__currentDir, "./migrations"),
  ];

  const migrationsFolder = candidates.find((p) => fs.existsSync(p));
  if (!migrationsFolder) {
    throw new Error(
      `Migrations folder not found. Searched: ${candidates.join(", ")}`,
    );
  }

  await seedMigrationTracking();
  await migrate(db, { migrationsFolder });
}
