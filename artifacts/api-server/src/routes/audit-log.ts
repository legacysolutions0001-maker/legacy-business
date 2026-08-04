import { Router } from "express";
import { db, auditLogTable } from "@workspace/db";
import { eq, and, gte, lte, desc } from "drizzle-orm";
import { requireResolvedCompany, resolveCompanyId } from "../middlewares/auth";

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

router.get("/audit-log", requireResolvedCompany, async (req, res) => {
  const companyId = resolveCompanyId(req);
  if (!companyId) { res.status(403).json({ error: "Company required" }); return; }

  const { from, to, limit = "100" } = req.query as { from?: string; to?: string; limit?: string };

  // Validate limit
  const rawLimit = parseInt(limit, 10);
  if (isNaN(rawLimit) || rawLimit <= 0) {
    res.status(400).json({ error: "Invalid limit parameter" });
    return;
  }
  const lim = Math.min(rawLimit, 500);

  // Validate optional date params
  let fromDate: Date | undefined;
  let toDate: Date | undefined;
  if (from) {
    fromDate = new Date(from);
    if (isNaN(fromDate.getTime())) {
      res.status(400).json({ error: "Invalid 'from' date" });
      return;
    }
  }
  if (to) {
    toDate = new Date(to + "T23:59:59Z");
    if (isNaN(toDate.getTime())) {
      res.status(400).json({ error: "Invalid 'to' date" });
      return;
    }
  }

  // Build all conditions upfront and combine with and() so they compose
  // correctly. Chaining multiple .where() calls replaces rather than ANDs.
  const conditions = [eq(auditLogTable.companyId, companyId)];
  if (fromDate) conditions.push(gte(auditLogTable.createdAt, fromDate));
  if (toDate) conditions.push(lte(auditLogTable.createdAt, toDate));

  const rows = await db
    .select()
    .from(auditLogTable)
    .where(and(...conditions))
    .orderBy(desc(auditLogTable.createdAt))
    .limit(lim);
  res.json(rows);
});

export default router;
