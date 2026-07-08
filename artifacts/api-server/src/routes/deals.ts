import { Router, type IRouter } from "express";
import { eq, sql, and } from "drizzle-orm";
import { db, dealsTable, customersTable } from "@workspace/db";
import {
  CreateDealBody,
  UpdateDealBody,
  UpdateDealParams,
  DeleteDealParams,
  ListDealsQueryParams,
} from "@workspace/api-zod";
import { count, sum } from "drizzle-orm";
import { requireAuth } from "../middlewares/auth";

const router: IRouter = Router();

router.get("/deals", requireAuth, async (req, res): Promise<void> => {
  const companyId = req.auth!.companyId;
  if (!companyId) { res.status(403).json({ error: "Company required" }); return; }

  const parsed = ListDealsQueryParams.safeParse(req.query);
  const params = parsed.success ? parsed.data : {};

  let query = db
    .select({
      id: dealsTable.id,
      title: dealsTable.title,
      stage: dealsTable.stage,
      value: dealsTable.value,
      probability: dealsTable.probability,
      customerId: dealsTable.customerId,
      customerName: customersTable.name,
      expectedCloseDate: dealsTable.expectedCloseDate,
      notes: dealsTable.notes,
      createdAt: dealsTable.createdAt,
      updatedAt: dealsTable.updatedAt,
    })
    .from(dealsTable)
    .leftJoin(customersTable, eq(dealsTable.customerId, customersTable.id))
    .where(eq(dealsTable.companyId, companyId))
    .$dynamic();

  if (params.stage) {
    query = query.where(and(eq(dealsTable.companyId, companyId), eq(dealsTable.stage, params.stage)));
  }

  const rows = await query.orderBy(sql`${dealsTable.createdAt} DESC`);
  res.json(rows.map(r => ({ ...r, value: Number(r.value) })));
});

router.post("/deals", requireAuth, async (req, res): Promise<void> => {
  const companyId = req.auth!.companyId!;
  const parsed = CreateDealBody.safeParse(req.body);
  if (!parsed.success) { res.status(400).json({ error: parsed.error.message }); return; }
  const [row] = await db.insert(dealsTable).values({
    ...parsed.data,
    companyId,
    value: String(parsed.data.value),
  }).returning();
  res.status(201).json({ ...row, value: Number(row.value), customerName: null });
});

router.patch("/deals/:id", requireAuth, async (req, res): Promise<void> => {
  const companyId = req.auth!.companyId;
  if (!companyId) { res.status(403).json({ error: "Company required" }); return; }
  const params = UpdateDealParams.safeParse(req.params);
  if (!params.success) { res.status(400).json({ error: "Invalid id" }); return; }
  const parsed = UpdateDealBody.safeParse(req.body);
  if (!parsed.success) { res.status(400).json({ error: parsed.error.message }); return; }
  const [row] = await db.update(dealsTable).set({
    ...parsed.data,
    value: parsed.data.value != null ? String(parsed.data.value) : undefined,
  }).where(and(eq(dealsTable.id, params.data.id), eq(dealsTable.companyId, companyId))).returning();
  if (!row) { res.status(404).json({ error: "Not found" }); return; }
  res.json({ ...row, value: Number(row.value), customerName: null });
});

router.delete("/deals/:id", requireAuth, async (req, res): Promise<void> => {
  const companyId = req.auth!.companyId;
  if (!companyId) { res.status(403).json({ error: "Company required" }); return; }
  const params = DeleteDealParams.safeParse(req.params);
  if (!params.success) { res.status(400).json({ error: "Invalid id" }); return; }
  await db.delete(dealsTable).where(and(eq(dealsTable.id, params.data.id), eq(dealsTable.companyId, companyId)));
  res.sendStatus(204);
});

router.get("/crm/pipeline", requireAuth, async (req, res): Promise<void> => {
  const companyId = req.auth!.companyId;
  if (!companyId) { res.status(403).json({ error: "Company required" }); return; }
  const rows = await db
    .select({
      stage: dealsTable.stage,
      count: count(),
      totalValue: sum(dealsTable.value),
    })
    .from(dealsTable)
    .where(eq(dealsTable.companyId, companyId))
    .groupBy(dealsTable.stage);
  res.json(rows.map(r => ({ stage: r.stage, count: r.count, totalValue: Number(r.totalValue ?? 0) })));
});

export default router;
