import { Router, type IRouter } from "express";
import { eq, ilike, or, sql, and } from "drizzle-orm";
import { db, leadsTable, activityTable } from "@workspace/db";
import {
  CreateLeadBody,
  UpdateLeadBody,
  UpdateLeadParams,
  GetLeadParams,
  DeleteLeadParams,
  ListLeadsQueryParams,
} from "@workspace/api-zod";
import { requireResolvedCompany, resolveCompanyId } from "../middlewares/auth";

const router: IRouter = Router();

router.get("/leads/pipeline", requireResolvedCompany, async (req, res): Promise<void> => {
  const companyId = resolveCompanyId(req);
  if (!companyId) { res.status(403).json({ error: "Company required" }); return; }
  const STAGES = ["new", "contacted", "qualified", "won", "lost"];
  const rows = await db
    .select({ status: leadsTable.status, count: sql<number>`COUNT(*)`, totalValue: sql<string>`COALESCE(SUM(${leadsTable.value}::numeric), 0)` })
    .from(leadsTable)
    .where(eq(leadsTable.companyId, companyId))
    .groupBy(leadsTable.status);
  const pipeline = STAGES.map(stage => {
    const row = rows.find(r => r.status === stage);
    return { stage, count: Number(row?.count ?? 0), totalValue: Number(row?.totalValue ?? 0) };
  });
  res.json(pipeline);
});

router.get("/leads", requireResolvedCompany, async (req, res): Promise<void> => {
  const companyId = resolveCompanyId(req);
  if (!companyId) { res.status(403).json({ error: "Company required" }); return; }

  const parsed = ListLeadsQueryParams.safeParse(req.query);
  const params = parsed.success ? parsed.data : {};

  let query = db.select().from(leadsTable).where(eq(leadsTable.companyId, companyId)).$dynamic();
  if (params.status) {
    query = query.where(and(eq(leadsTable.companyId, companyId), eq(leadsTable.status, params.status)));
  } else if (params.search) {
    query = query.where(
      and(
        eq(leadsTable.companyId, companyId),
        or(
          ilike(leadsTable.name, `%${params.search}%`),
          ilike(leadsTable.email, `%${params.search}%`),
        ),
      ),
    );
  }

  const rows = await query.orderBy(sql`${leadsTable.createdAt} DESC`);
  res.json(rows.map(r => ({
    ...r,
    value: r.value != null ? Number(r.value) : null,
  })));
});

router.post("/leads", requireResolvedCompany, async (req, res): Promise<void> => {
  const companyId = resolveCompanyId(req);
  if (!companyId) { res.status(403).json({ error: "Company required" }); return; }
  const parsed = CreateLeadBody.safeParse(req.body);
  if (!parsed.success) {
    res.status(400).json({ error: parsed.error.message });
    return;
  }
  const [row] = await db.insert(leadsTable).values({
    ...parsed.data,
    companyId,
    value: parsed.data.value != null ? String(parsed.data.value) : undefined,
  }).returning();
  await db.insert(activityTable).values({
    type: "lead",
    title: "New lead added",
    description: `${row.name} was added as a lead`,
  });
  res.status(201).json({ ...row, value: row.value != null ? Number(row.value) : null });
});

router.get("/leads/:id", requireResolvedCompany, async (req, res): Promise<void> => {
  const companyId = resolveCompanyId(req);
  if (!companyId) { res.status(403).json({ error: "Company required" }); return; }
  const params = GetLeadParams.safeParse(req.params);
  if (!params.success) { res.status(400).json({ error: "Invalid id" }); return; }
  const [row] = await db.select().from(leadsTable).where(and(eq(leadsTable.id, params.data.id), eq(leadsTable.companyId, companyId)));
  if (!row) { res.status(404).json({ error: "Not found" }); return; }
  res.json({ ...row, value: row.value != null ? Number(row.value) : null });
});

router.patch("/leads/:id", requireResolvedCompany, async (req, res): Promise<void> => {
  const companyId = resolveCompanyId(req);
  if (!companyId) { res.status(403).json({ error: "Company required" }); return; }
  const params = UpdateLeadParams.safeParse(req.params);
  if (!params.success) { res.status(400).json({ error: "Invalid id" }); return; }
  const parsed = UpdateLeadBody.safeParse(req.body);
  if (!parsed.success) { res.status(400).json({ error: parsed.error.message }); return; }
  const [row] = await db.update(leadsTable).set({
    ...parsed.data,
    value: parsed.data.value != null ? String(parsed.data.value) : undefined,
  }).where(and(eq(leadsTable.id, params.data.id), eq(leadsTable.companyId, companyId))).returning();
  if (!row) { res.status(404).json({ error: "Not found" }); return; }
  res.json({ ...row, value: row.value != null ? Number(row.value) : null });
});

router.delete("/leads/:id", requireResolvedCompany, async (req, res): Promise<void> => {
  const companyId = resolveCompanyId(req);
  if (!companyId) { res.status(403).json({ error: "Company required" }); return; }
  const params = DeleteLeadParams.safeParse(req.params);
  if (!params.success) { res.status(400).json({ error: "Invalid id" }); return; }
  await db.delete(leadsTable).where(and(eq(leadsTable.id, params.data.id), eq(leadsTable.companyId, companyId)));
  res.sendStatus(204);
});

export default router;
