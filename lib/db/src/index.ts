import { drizzle } from "drizzle-orm/node-postgres";
import pg from "pg";
import * as schema from "./schema";

const { Pool } = pg;

// In development (Replit sandbox) use the Replit-managed DATABASE_URL.
// In production deployments, override with SUPABASE_DATABASE_URL.
// Supabase hostnames are unreachable from the Replit sandbox network, so
// SUPABASE_DATABASE_URL is intentionally skipped here during dev.
const isProduction = process.env.NODE_ENV === "production";
const dbUrl = (isProduction && process.env.SUPABASE_DATABASE_URL)
  ? process.env.SUPABASE_DATABASE_URL
  : process.env.DATABASE_URL;

if (!dbUrl) {
  throw new Error(
    "No database URL found. Ensure DATABASE_URL is set (or SUPABASE_DATABASE_URL in production).",
  );
}

export const pool = new Pool({
  connectionString: dbUrl,
  ssl: (isProduction && process.env.SUPABASE_DATABASE_URL)
    ? { rejectUnauthorized: false }
    : undefined,
});
export const db = drizzle(pool, { schema });

export * from "./schema";
