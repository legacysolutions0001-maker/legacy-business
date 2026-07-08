import { Router } from "express";
import { db, notificationsTable } from "@workspace/db";
import { eq, sql, and, count } from "drizzle-orm";
import { requireAuth } from "../middlewares/auth";

const router = Router();

router.get("/notifications", requireAuth, async (req, res) => {
  const { companyId, userId } = req.auth!;
  const rows = await db.select().from(notificationsTable)
    .where(companyId ? eq(notificationsTable.companyId, companyId) : sql`company_id IS NULL`)
    .orderBy(sql`${notificationsTable.createdAt} DESC`).limit(50);
  res.json(rows);
});

router.get("/notifications/unread-count", requireAuth, async (req, res) => {
  const { companyId } = req.auth!;
  const [r] = await db.select({ cnt: count() }).from(notificationsTable)
    .where(and(companyId ? eq(notificationsTable.companyId, companyId) : sql`company_id IS NULL`, eq(notificationsTable.isRead, false)));
  res.json({ count: r?.cnt ?? 0 });
});

router.post("/notifications/read-all", requireAuth, async (req, res) => {
  const { companyId } = req.auth!;
  await db.update(notificationsTable).set({ isRead: true })
    .where(companyId ? eq(notificationsTable.companyId, companyId) : sql`company_id IS NULL`);
  res.json({ success: true });
});

router.patch("/notifications/:id/read", requireAuth, async (req, res) => {
  await db.update(notificationsTable).set({ isRead: true }).where(eq(notificationsTable.id, parseInt(req.params.id as string)));
  res.json({ success: true });
});

router.post("/notifications", requireAuth, async (req, res) => {
  const { companyId } = req.auth!;
  const [row] = await db.insert(notificationsTable).values({ ...req.body, companyId: req.body.companyId ?? companyId }).returning();
  res.status(201).json(row);
});

export default router;
