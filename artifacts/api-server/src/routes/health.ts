import { Router, type IRouter } from "express";
import { pool } from "@workspace/db";
import { exec } from "node:child_process";

const router: IRouter = Router();

router.get("/healthz", (_req, res) => {
  res.json({ status: "ok" });
});

router.get("/healthz/db", async (_req, res) => {
  try {
    const result = await pool.query(
      "SELECT table_name FROM information_schema.tables WHERE table_schema='public' ORDER BY table_name"
    );
    res.json({ status: "ok", tables: result.rows.map((r: any) => r.table_name) });
  } catch (err: any) {
    res.status(500).json({
      error: err.message,
      cause: err.cause?.message || String(err.cause || ""),
      code: err.cause?.code || err.code || null,
    });
  }
});

router.post("/admin/db-reset", async (req, res) => {
  const secret = (req.query.secret as string) || (req.body as any)?.secret;
  if (secret !== "LEGACY_RESET_2024") {
    res.status(403).json({ error: "Forbidden" });
    return;
  }
  try {
    const client = await pool.connect();
    const tables = await client.query(
      "SELECT tablename FROM pg_tables WHERE schemaname='public'"
    );
    const dropped: string[] = [];
    if (tables.rows.length > 0) {
      const names = tables.rows.map((r: any) => `"${r.tablename}"`).join(", ");
      await client.query(`DROP TABLE IF EXISTS ${names} CASCADE`);
      dropped.push(...tables.rows.map((r: any) => r.tablename));
    }
    client.release();

    // Use pnpm to run drizzle-kit push (resolves correctly from workspace)
    const workspaceRoot = process.cwd();

    const output = await new Promise<string>((resolve, reject) => {
      exec(
        `pnpm --filter @workspace/db run push-force`,
        {
          cwd: workspaceRoot,
          env: { ...process.env, DATABASE_URL: process.env.DATABASE_URL || "" },
          timeout: 60000,
        },
        (err, stdout, stderr) => {
          if (err) reject(new Error(stderr || err.message));
          else resolve(stdout + stderr);
        }
      );
    });

    res.json({ success: true, dropped, drizzleOutput: output.slice(0, 2000) });
  } catch (err: any) {
    res.status(500).json({ error: err.message, stack: err.stack?.slice(0, 500) });
  }
});

router.post("/admin/db-migrate", async (req, res) => {
  const secret = (req.query.secret as string) || (req.body as any)?.secret;
  if (secret !== "LEGACY_RESET_2024") {
    res.status(403).json({ error: "Forbidden" });
    return;
  }
  try {
    const workspaceRoot = process.cwd();
    const output = await new Promise<string>((resolve, reject) => {
      exec(
        `pnpm --filter @workspace/db run push-force`,
        {
          cwd: workspaceRoot,
          env: { ...process.env, DATABASE_URL: process.env.DATABASE_URL || "" },
          timeout: 60000,
        },
        (err, stdout, stderr) => {
          if (err) reject(new Error(stderr || err.message));
          else resolve(stdout + stderr);
        }
      );
    });
    res.json({ success: true, output: output.slice(0, 2000) });
  } catch (err: any) {
    res.status(500).json({ error: err.message });
  }
});

export default router;
