import { Router } from "express";
import { db, suppliersTable, purchaseOrdersTable } from "@workspace/db";
import { eq, ilike, sql, and } from "drizzle-orm";
import { requireAuth } from "../middlewares/auth";

const router = Router();

router.get("/suppliers", requireAuth, async (req, res) => {
  const companyId = req.auth!.companyId;
  if (!companyId) { res.status(403).json({ error: "Company required" }); return; }
  const { search } = req.query as { search?: string };
  let query = db.select().from(suppliersTable).where(eq(suppliersTable.companyId, companyId)).$dynamic();
  if (search) query = query.where(and(eq(suppliersTable.companyId, companyId), ilike(suppliersTable.name, `%${search}%`)));
  const rows = await query.orderBy(sql`${suppliersTable.createdAt} DESC`);
  res.json(rows);
});

router.post("/suppliers", requireAuth, async (req, res) => {
  const companyId = req.auth!.companyId;
  if (!companyId) { res.status(403).json({ error: "Company required" }); return; }
  const [row] = await db.insert(suppliersTable).values({ ...req.body, companyId }).returning();
  res.status(201).json(row);
});

router.get("/suppliers/:id", requireAuth, async (req, res) => {
  const companyId = req.auth!.companyId;
  const id = parseInt(req.params.id as string);
  const [row] = await db.select().from(suppliersTable).where(and(eq(suppliersTable.id, id), eq(suppliersTable.companyId, companyId!))).limit(1);
  if (!row) { res.status(404).json({ error: "Not found" }); return; }
  const purchases = await db.select().from(purchaseOrdersTable).where(and(eq(purchaseOrdersTable.supplierId, id), eq(purchaseOrdersTable.companyId, companyId!))).orderBy(sql`${purchaseOrdersTable.createdAt} DESC`).limit(10);
  res.json({ ...row, purchases: purchases.map(p => ({ ...p, total: Number(p.total) })) });
});

router.patch("/suppliers/:id", requireAuth, async (req, res) => {
  const companyId = req.auth!.companyId;
  const [row] = await db.update(suppliersTable).set(req.body).where(and(eq(suppliersTable.id, parseInt(req.params.id as string)), eq(suppliersTable.companyId, companyId!))).returning();
  if (!row) { res.status(404).json({ error: "Not found" }); return; }
  res.json(row);
});

router.delete("/suppliers/:id", requireAuth, async (req, res) => {
  const companyId = req.auth!.companyId;
  await db.delete(suppliersTable).where(and(eq(suppliersTable.id, parseInt(req.params.id as string)), eq(suppliersTable.companyId, companyId!)));
  res.sendStatus(204);
});

export default router;
