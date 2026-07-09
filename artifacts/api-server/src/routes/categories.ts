import { Router } from "express";
import { db, categoriesTable } from "@workspace/db";
import { eq, ilike, and, sql } from "drizzle-orm";
import { requireAuth } from "../middlewares/auth";

const router = Router();

router.get("/categories", requireAuth, async (req, res) => {
  const companyId = req.auth!.companyId;
  if (!companyId) { res.status(403).json({ error: "Company required" }); return; }
  const { search } = req.query as { search?: string };
  let query = db.select().from(categoriesTable).where(eq(categoriesTable.companyId, companyId)).$dynamic();
  if (search) {
    query = query.where(and(eq(categoriesTable.companyId, companyId), ilike(categoriesTable.name, `%${search}%`)));
  }
  const rows = await query.orderBy(sql`${categoriesTable.name} ASC`);
  res.json(rows);
});

router.post("/categories", requireAuth, async (req, res) => {
  const companyId = req.auth!.companyId;
  if (!companyId) { res.status(403).json({ error: "Company required" }); return; }
  const { name, description } = req.body as { name?: string; description?: string };
  if (!name?.trim()) { res.status(400).json({ error: "name is required" }); return; }
  const [row] = await db.insert(categoriesTable).values({ companyId, name: name.trim(), description }).returning();
  res.status(201).json(row);
});

router.get("/categories/:id", requireAuth, async (req, res) => {
  const companyId = req.auth!.companyId;
  const id = parseInt(req.params.id as string);
  if (isNaN(id)) { res.status(400).json({ error: "Invalid id" }); return; }
  const [row] = await db.select().from(categoriesTable)
    .where(and(eq(categoriesTable.id, id), eq(categoriesTable.companyId, companyId!)))
    .limit(1);
  if (!row) { res.status(404).json({ error: "Not found" }); return; }
  res.json(row);
});

router.patch("/categories/:id", requireAuth, async (req, res) => {
  const companyId = req.auth!.companyId;
  const id = parseInt(req.params.id as string);
  if (isNaN(id)) { res.status(400).json({ error: "Invalid id" }); return; }
  const { name, description } = req.body as { name?: string; description?: string };
  const updates: Record<string, unknown> = {};
  if (name) updates.name = name.trim();
  if (description !== undefined) updates.description = description;
  if (!Object.keys(updates).length) { res.status(400).json({ error: "Nothing to update" }); return; }
  const [row] = await db.update(categoriesTable)
    .set(updates)
    .where(and(eq(categoriesTable.id, id), eq(categoriesTable.companyId, companyId!)))
    .returning();
  if (!row) { res.status(404).json({ error: "Not found" }); return; }
  res.json(row);
});

router.delete("/categories/:id", requireAuth, async (req, res) => {
  const companyId = req.auth!.companyId;
  const id = parseInt(req.params.id as string);
  if (isNaN(id)) { res.status(400).json({ error: "Invalid id" }); return; }
  await db.delete(categoriesTable).where(and(eq(categoriesTable.id, id), eq(categoriesTable.companyId, companyId!)));
  res.sendStatus(204);
});

export default router;
