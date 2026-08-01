import { drizzle } from "drizzle-orm/node-postgres";
import pg from "pg";
import * as schema from "./schema";

const { Pool } = pg;

// Prefer SUPABASE_DATABASE_URL (external Supabase) over Replit-managed DATABASE_URL
const dbUrl =
  process.env.SUPABASE_DATABASE_URL || process.env.DATABASE_URL;

if (!dbUrl) {
  throw new Error(
    "No database URL found. Set SUPABASE_DATABASE_URL or provision a Replit database.",
  );
}

export const pool = new Pool({
  connectionString: dbUrl,
  // Supabase requires SSL in production; Replit internal PG does not
  ssl: process.env.SUPABASE_DATABASE_URL
    ? { rejectUnauthorized: false }
    : undefined,
});
export const db = drizzle(pool, { schema });

export * from "./schema";
