import { Router } from "express";
import { db, branchesTable } from "@workspace/db";
import { eq, and, sql } from "drizzle-orm";
import { requireAuth } from "../middlewares/auth";

const router = Router();

router.get("/branches", requireAuth, async (req, res) => {
  const companyId = req.auth!.companyId;
  if (!companyId) { res.status(403).json({ error: "Company required" }); return; }
  const rows = await db.select().from(branchesTable)
    .where(eq(branchesTable.companyId, companyId))
    .orderBy(sql`${branchesTable.name} ASC`);
  res.json(rows);
});

router.post("/branches", requireAuth, async (req, res) => {
  const companyId = req.auth!.companyId;
  if (!companyId) { res.status(403).json({ error: "Company required" }); return; }
  const { name, code, address, city, state, pincode, phone, isMain, isActive } = req.body as {
    name?: string; code?: string; address?: string; city?: string;
    state?: string; pincode?: string; phone?: string;
    isMain?: boolean; isActive?: boolean;
  };
  if (!name?.trim()) { res.status(400).json({ error: "name is required" }); return; }
  const [row] = await db.insert(branchesTable)
    .values({ companyId, name: name.trim(), code: code?.trim() || null, address: address || null, city: city || null, state: state || null, pincode: pincode || null, phone: phone || null, isMain: isMain ?? false, isActive: isActive ?? true })
    .returning();
  res.status(201).json(row);
});

router.get("/branches/:id", requireAuth, async (req, res) => {
  const companyId = req.auth!.companyId;
  const id = parseInt(req.params.id as string);
  if (isNaN(id)) { res.status(400).json({ error: "Invalid id" }); return; }
  const [row] = await db.select().from(branchesTable)
    .where(and(eq(branchesTable.id, id), eq(branchesTable.companyId, companyId!)))
    .limit(1);
  if (!row) { res.status(404).json({ error: "Not found" }); return; }
  res.json(row);
});

router.patch("/branches/:id", requireAuth, async (req, res) => {
  const companyId = req.auth!.companyId;
  const id = parseInt(req.params.id as string);
  if (isNaN(id)) { res.status(400).json({ error: "Invalid id" }); return; }
  const allowed = ["name", "code", "address", "city", "state", "pincode", "phone", "isMain", "isActive"] as const;
  const updates: Record<string, unknown> = {};
  for (const key of allowed) {
    if (req.body[key] !== undefined) updates[key] = req.body[key];
  }
  if (updates.name) updates.name = (updates.name as string).trim();
  if (!Object.keys(updates).length) { res.status(400).json({ error: "Nothing to update" }); return; }
  const [row] = await db.update(branchesTable)
    .set(updates)
    .where(and(eq(branchesTable.id, id), eq(branchesTable.companyId, companyId!)))
    .returning();
  if (!row) { res.status(404).json({ error: "Not found" }); return; }
  res.json(row);
});

router.delete("/branches/:id", requireAuth, async (req, res) => {
  const companyId = req.auth!.companyId;
  const id = parseInt(req.params.id as string);
  if (isNaN(id)) { res.status(400).json({ error: "Invalid id" }); return; }
  await db.delete(branchesTable).where(and(eq(branchesTable.id, id), eq(branchesTable.companyId, companyId!)));
  res.sendStatus(204);
});

export default router;
