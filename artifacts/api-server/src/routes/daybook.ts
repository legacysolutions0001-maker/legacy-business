import { Router } from "express";
import { db, daybookTable } from "@workspace/db";
import { eq, sql, and, gte, lte, sum } from "drizzle-orm";
import { requireAuth } from "../middlewares/auth";

const router = Router();
const toNum = (v: any) => v != null ? Number(v) : 0;

const DAYBOOK_CATEGORIES = ["petrol", "tea", "delivery", "labour", "miscellaneous"];

router.get("/daybook", requireAuth, async (req, res) => {
  const companyId = req.auth!.companyId;
  if (!companyId) { res.status(403).json({ error: "Company required" }); return; }
  const { from, to, category } = req.query as { from?: string; to?: string; category?: string };
  let query = db.select().from(daybookTable).where(eq(daybookTable.companyId, companyId)).$dynamic();
  if (from) query = query.where(and(eq(daybookTable.companyId, companyId), gte(daybookTable.date, from)));
  if (to) query = query.where(and(eq(daybookTable.companyId, companyId), lte(daybookTable.date, to)));
  if (category) query = query.where(and(eq(daybookTable.companyId, companyId), eq(daybookTable.category, category)));
  const rows = await query.orderBy(sql`${daybookTable.date} DESC, ${daybookTable.createdAt} DESC`);
  res.json(rows.map(r => ({ ...r, amount: toNum(r.amount) })));
});

router.get("/daybook/summary", requireAuth, async (req, res) => {
  const companyId = req.auth!.companyId;
  if (!companyId) { res.status(403).json({ error: "Company required" }); return; }

  const today = new Date().toISOString().split("T")[0];
  const monthStart = new Date(new Date().getFullYear(), new Date().getMonth(), 1).toISOString().split("T")[0];
  const yearStart = `${new Date().getFullYear()}-01-01`;

  const [dailyRows, monthlyRows, yearlyRows, byCategory] = await Promise.all([
    db.select({ total: sum(daybookTable.amount) }).from(daybookTable)
      .where(and(eq(daybookTable.companyId, companyId), eq(daybookTable.date, today))),
    db.select({ total: sum(daybookTable.amount) }).from(daybookTable)
      .where(and(eq(daybookTable.companyId, companyId), gte(daybookTable.date, monthStart))),
    db.select({ total: sum(daybookTable.amount) }).from(daybookTable)
      .where(and(eq(daybookTable.companyId, companyId), gte(daybookTable.date, yearStart))),
    db.select({ category: daybookTable.category, total: sum(daybookTable.amount) })
      .from(daybookTable).where(eq(daybookTable.companyId, companyId)).groupBy(daybookTable.category),
  ]);

  res.json({
    daily: toNum(dailyRows[0]?.total),
    monthly: toNum(monthlyRows[0]?.total),
    yearly: toNum(yearlyRows[0]?.total),
    byCategory: byCategory.map(r => ({ category: r.category, total: toNum(r.total) })),
  });
});

router.post("/daybook", requireAuth, async (req, res) => {
  const companyId = req.auth!.companyId;
  if (!companyId) { res.status(403).json({ error: "Company required" }); return; }
  const { date, category, description, amount, notes } = req.body;
  if (!date || !category || !amount) { res.status(400).json({ error: "Date, category, and amount are required" }); return; }
  const [row] = await db.insert(daybookTable).values({
    companyId, date, category, description: description || null, amount: String(amount), notes: notes || null
  }).returning();
  res.status(201).json({ ...row, amount: toNum(row.amount) });
});

router.patch("/daybook/:id", requireAuth, async (req, res) => {
  const companyId = req.auth!.companyId;
  const id = parseInt(req.params.id as string);
  const { date, category, description, amount, notes } = req.body;
  const update: any = {};
  if (date !== undefined) update.date = date;
  if (category !== undefined) update.category = category;
  if (description !== undefined) update.description = description;
  if (amount !== undefined) update.amount = String(amount);
  if (notes !== undefined) update.notes = notes;
  const [row] = await db.update(daybookTable).set(update)
    .where(and(eq(daybookTable.id, id), eq(daybookTable.companyId, companyId!)))
    .returning();
  if (!row) { res.status(404).json({ error: "Not found" }); return; }
  res.json({ ...row, amount: toNum(row.amount) });
});

router.delete("/daybook/:id", requireAuth, async (req, res) => {
  const companyId = req.auth!.companyId;
  const id = parseInt(req.params.id as string);
  await db.delete(daybookTable).where(and(eq(daybookTable.id, id), eq(daybookTable.companyId, companyId!)));
  res.json({ success: true });
});

export { DAYBOOK_CATEGORIES };
export default router;
