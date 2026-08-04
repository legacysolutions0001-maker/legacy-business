import { Router } from "express";
import { db, unitsTable } from "@workspace/db";
import { eq, ilike, and, sql } from "drizzle-orm";
import { requireResolvedCompany, resolveCompanyId } from "../middlewares/auth";

const router = Router();

router.get("/units", requireResolvedCompany, async (req, res) => {
  const companyId = resolveCompanyId(req);
  if (!companyId) { res.status(403).json({ error: "Company required" }); return; }
  const { search } = req.query as { search?: string };
  let query = db.select().from(unitsTable).where(eq(unitsTable.companyId, companyId)).$dynamic();
  if (search) {
    query = query.where(and(eq(unitsTable.companyId, companyId), ilike(unitsTable.name, `%${search}%`)));
  }
  const rows = await query.orderBy(sql`${unitsTable.name} ASC`);
  res.json(rows);
});

router.post("/units", requireResolvedCompany, async (req, res) => {
  const companyId = resolveCompanyId(req);
  if (!companyId) { res.status(403).json({ error: "Company required" }); return; }
  const { name, shortCode } = req.body as { name?: string; shortCode?: string };
  if (!name?.trim()) { res.status(400).json({ error: "name is required" }); return; }
  const [row] = await db.insert(unitsTable).values({ companyId, name: name.trim(), shortCode: shortCode?.trim() || null }).returning();
  res.status(201).json(row);
});

router.get("/units/:id", requireResolvedCompany, async (req, res) => {
  const companyId = resolveCompanyId(req);
  const id = parseInt(req.params.id as string);
  if (isNaN(id)) { res.status(400).json({ error: "Invalid id" }); return; }
  const [row] = await db.select().from(unitsTable)
    .where(and(eq(unitsTable.id, id), eq(unitsTable.companyId, companyId!)))
    .limit(1);
  if (!row) { res.status(404).json({ error: "Not found" }); return; }
  res.json(row);
});

router.patch("/units/:id", requireResolvedCompany, async (req, res) => {
  const companyId = resolveCompanyId(req);
  const id = parseInt(req.params.id as string);
  if (isNaN(id)) { res.status(400).json({ error: "Invalid id" }); return; }
  const { name, shortCode } = req.body as { name?: string; shortCode?: string };
  const updates: Record<string, unknown> = {};
  if (name) updates.name = name.trim();
  if (shortCode !== undefined) updates.shortCode = shortCode?.trim() || null;
  if (!Object.keys(updates).length) { res.status(400).json({ error: "Nothing to update" }); return; }
  const [row] = await db.update(unitsTable)
    .set(updates)
    .where(and(eq(unitsTable.id, id), eq(unitsTable.companyId, companyId!)))
    .returning();
  if (!row) { res.status(404).json({ error: "Not found" }); return; }
  res.json(row);
});

router.delete("/units/:id", requireResolvedCompany, async (req, res) => {
  const companyId = resolveCompanyId(req);
  const id = parseInt(req.params.id as string);
  if (isNaN(id)) { res.status(400).json({ error: "Invalid id" }); return; }
  await db.delete(unitsTable).where(and(eq(unitsTable.id, id), eq(unitsTable.companyId, companyId!)));
  res.sendStatus(204);
});

export default router;
