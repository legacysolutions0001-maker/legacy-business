import { Router } from "express";
import { db, auditLogTable } from "@workspace/db";
import { eq, sql, and, gte, lte, desc } from "drizzle-orm";
import { requireAuth } from "../middlewares/auth";

const router = Router();

export async function logAction(
  companyId: number | null,
  userId: number,
  username: string,
  action: string,
  entity?: string,
  entityId?: string | number,
  detail?: string,
  ipAddress?: string
) {
  try {
    await db.insert(auditLogTable).values({
      companyId,
      userId,
      username,
      action,
      entity: entity ?? null,
      entityId: entityId != null ? String(entityId) : null,
      detail: detail ?? null,
      ipAddress: ipAddress ?? null,
    });
  } catch {
    // Audit log failure must never break the main operation
  }
}

router.get("/audit-log", requireAuth, async (req, res) => {
  const companyId = req.auth!.companyId;
  if (!companyId) { res.status(403).json({ error: "Company required" }); return; }
  const { from, to, limit = "100" } = req.query as { from?: string; to?: string; limit?: string };
  const lim = Math.min(parseInt(limit), 500);

  let query = db.select().from(auditLogTable).where(eq(auditLogTable.companyId, companyId)).$dynamic();
  if (from) query = query.where(and(eq(auditLogTable.companyId, companyId), gte(auditLogTable.createdAt, new Date(from))));
  if (to) query = query.where(and(eq(auditLogTable.companyId, companyId), lte(auditLogTable.createdAt, new Date(to + "T23:59:59Z"))));
  const rows = await query.orderBy(desc(auditLogTable.createdAt)).limit(lim);
  res.json(rows);
});

export default router;
