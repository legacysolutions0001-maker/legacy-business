import { Router, type IRouter } from "express";
import { eq, sql, and } from "drizzle-orm";
import { db, expensesTable } from "@workspace/db";
import {
  CreateExpenseBody,
  UpdateExpenseBody,
  UpdateExpenseParams,
  DeleteExpenseParams,
  ListExpensesQueryParams,
} from "@workspace/api-zod";
import { count, sum } from "drizzle-orm";
import { requireAuth } from "../middlewares/auth";

const router: IRouter = Router();

router.get("/expenses/by-category", requireAuth, async (req, res): Promise<void> => {
  const companyId = req.auth!.companyId;
  if (!companyId) { res.status(403).json({ error: "Company required" }); return; }
  const rows = await db
    .select({ category: expensesTable.category, total: sum(expensesTable.amount), count: count() })
    .from(expensesTable)
    .where(eq(expensesTable.companyId, companyId))
    .groupBy(expensesTable.category)
    .orderBy(sql`SUM(${expensesTable.amount}) DESC`);
  res.json(rows.map(r => ({ category: r.category, total: Number(r.total ?? 0), count: r.count })));
});

router.get("/expenses", requireAuth, async (req, res): Promise<void> => {
  const companyId = req.auth!.companyId;
  if (!companyId) { res.status(403).json({ error: "Company required" }); return; }
  const parsed = ListExpensesQueryParams.safeParse(req.query);
  const params = parsed.success ? parsed.data : {};

  let query = db.select().from(expensesTable).where(eq(expensesTable.companyId, companyId)).$dynamic();
  if (params.category) {
    query = query.where(and(eq(expensesTable.companyId, companyId), eq(expensesTable.category, params.category)));
  }

  const rows = await query.orderBy(sql`${expensesTable.createdAt} DESC`);
  res.json(rows.map(r => ({ ...r, amount: Number(r.amount) })));
});

router.post("/expenses", requireAuth, async (req, res): Promise<void> => {
  const companyId = req.auth!.companyId!;
  const parsed = CreateExpenseBody.safeParse(req.body);
  if (!parsed.success) { res.status(400).json({ error: parsed.error.message }); return; }
  const [row] = await db.insert(expensesTable).values({
    ...parsed.data,
    companyId,
    amount: String(parsed.data.amount),
  }).returning();
  res.status(201).json({ ...row, amount: Number(row.amount) });
});

router.patch("/expenses/:id", requireAuth, async (req, res): Promise<void> => {
  const companyId = req.auth!.companyId;
  if (!companyId) { res.status(403).json({ error: "Company required" }); return; }
  const params = UpdateExpenseParams.safeParse(req.params);
  if (!params.success) { res.status(400).json({ error: "Invalid id" }); return; }
  const parsed = UpdateExpenseBody.safeParse(req.body);
  if (!parsed.success) { res.status(400).json({ error: parsed.error.message }); return; }
  const [row] = await db.update(expensesTable).set({
    ...parsed.data,
    amount: parsed.data.amount != null ? String(parsed.data.amount) : undefined,
  }).where(and(eq(expensesTable.id, params.data.id), eq(expensesTable.companyId, companyId))).returning();
  if (!row) { res.status(404).json({ error: "Not found" }); return; }
  res.json({ ...row, amount: Number(row.amount) });
});

router.delete("/expenses/:id", requireAuth, async (req, res): Promise<void> => {
  const companyId = req.auth!.companyId;
  if (!companyId) { res.status(403).json({ error: "Company required" }); return; }
  const params = DeleteExpenseParams.safeParse(req.params);
  if (!params.success) { res.status(400).json({ error: "Invalid id" }); return; }
  await db.delete(expensesTable).where(and(eq(expensesTable.id, params.data.id), eq(expensesTable.companyId, companyId)));
  res.sendStatus(204);
});

export default router;
