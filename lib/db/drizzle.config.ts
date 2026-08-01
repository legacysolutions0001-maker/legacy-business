import { defineConfig } from "drizzle-kit";
import path from "path";
import fs from "fs";
import { config as loadEnv } from "dotenv";

function findRepoRoot(startDir: string): string {
  let dir = startDir;
  while (true) {
    if (fs.existsSync(path.join(dir, "pnpm-workspace.yaml"))) return dir;
    const parent = path.dirname(dir);
    if (parent === dir) return startDir;
    dir = parent;
  }
}

loadEnv({ path: path.join(findRepoRoot(__dirname), ".env"), quiet: true });

const isProduction = process.env.NODE_ENV === "production";
const dbUrl = (isProduction && process.env.SUPABASE_DATABASE_URL)
  ? process.env.SUPABASE_DATABASE_URL
  : process.env.DATABASE_URL;

if (!dbUrl) {
  throw new Error("DATABASE_URL must be set. Ensure the database is provisioned.");
}

export default defineConfig({
  schema: path.join(__dirname, "./src/schema/index.ts"),
  out: path.join(__dirname, "./migrations"),
  dialect: "postgresql",
  dbCredentials: {
    url: dbUrl,
    ...((isProduction && process.env.SUPABASE_DATABASE_URL) ? { ssl: true } : {}),
  },
});
