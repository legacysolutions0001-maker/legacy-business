import { Router, type IRouter } from "express";
import { pool } from "@workspace/db";
import { exec } from "node:child_process";
import { requireSuperAdmin } from "../middlewares/auth";

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

// Protected by super-admin JWT — no hardcoded secrets, no shared query params.
router.post("/admin/db-reset", requireSuperAdmin, async (_req, res) => {
  const client = await pool.connect();
  try {
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
    client.release();
    res.status(500).json({ error: err.message });
  }
});

router.post("/admin/db-migrate", requireSuperAdmin, async (_req, res) => {
  const workspaceRoot = process.cwd();
  try {
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
