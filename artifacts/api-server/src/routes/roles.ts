import { Router } from "express";
import { db, rolesTable, permissionsTable, rolePermissionsTable } from "@workspace/db";
import { eq, and, sql } from "drizzle-orm";
import { requireResolvedCompany, resolveCompanyId } from "../middlewares/auth";

const router = Router();

// ─── Permissions catalog ──────────────────────────────────────────────────────

router.get("/permissions", requireResolvedCompany, async (_req, res) => {
  const rows = await db.select().from(permissionsTable)
    .orderBy(sql`${permissionsTable.module} ASC, ${permissionsTable.key} ASC`);
  res.json(rows);
});

// ─── Roles ────────────────────────────────────────────────────────────────────

router.get("/roles", requireResolvedCompany, async (req, res) => {
  const companyId = resolveCompanyId(req);
  if (!companyId) { res.status(403).json({ error: "Company required" }); return; }
  const rows = await db.select().from(rolesTable)
    .where(eq(rolesTable.companyId, companyId))
    .orderBy(sql`${rolesTable.name} ASC`);
  res.json(rows);
});

router.post("/roles", requireResolvedCompany, async (req, res) => {
  const companyId = resolveCompanyId(req);
  if (!companyId) { res.status(403).json({ error: "Company required" }); return; }
  const { name, description, permissionIds } = req.body as {
    name?: string; description?: string; permissionIds?: unknown[];
  };
  if (!name?.trim()) { res.status(400).json({ error: "name is required" }); return; }
  const validPermIds = Array.isArray(permissionIds)
    ? permissionIds.map(Number).filter(n => !isNaN(n) && n > 0)
    : [];

  const [role] = await db.insert(rolesTable)
    .values({ companyId, name: name.trim(), description: description || null })
    .returning();

  if (validPermIds.length) {
    await db.insert(rolePermissionsTable)
      .values(validPermIds.map(pid => ({ roleId: role.id, permissionId: pid })))
      .onConflictDoNothing();
  }

  res.status(201).json(role);
});

router.get("/roles/:id", requireResolvedCompany, async (req, res) => {
  const companyId = resolveCompanyId(req);
  const id = parseInt(req.params.id as string);
  if (isNaN(id)) { res.status(400).json({ error: "Invalid id" }); return; }
  const [role] = await db.select().from(rolesTable)
    .where(and(eq(rolesTable.id, id), eq(rolesTable.companyId, companyId!)))
    .limit(1);
  if (!role) { res.status(404).json({ error: "Not found" }); return; }

  const perms = await db
    .select({ permission: permissionsTable })
    .from(rolePermissionsTable)
    .innerJoin(permissionsTable, eq(rolePermissionsTable.permissionId, permissionsTable.id))
    .where(eq(rolePermissionsTable.roleId, id));

  res.json({ ...role, permissions: perms.map(p => p.permission) });
});

router.patch("/roles/:id", requireResolvedCompany, async (req, res) => {
  const companyId = resolveCompanyId(req);
  const id = parseInt(req.params.id as string);
  if (isNaN(id)) { res.status(400).json({ error: "Invalid id" }); return; }
  const { name, description, permissionIds } = req.body as {
    name?: string; description?: string; permissionIds?: unknown[];
  };

  const updates: Record<string, unknown> = {};
  if (name) updates.name = name.trim();
  if (description !== undefined) updates.description = description;

  let role;
  if (Object.keys(updates).length) {
    const [updated] = await db.update(rolesTable)
      .set(updates)
      .where(and(eq(rolesTable.id, id), eq(rolesTable.companyId, companyId!)))
      .returning();
    if (!updated) { res.status(404).json({ error: "Not found" }); return; }
    role = updated;
  } else {
    const [existing] = await db.select().from(rolesTable)
      .where(and(eq(rolesTable.id, id), eq(rolesTable.companyId, companyId!)))
      .limit(1);
    if (!existing) { res.status(404).json({ error: "Not found" }); return; }
    role = existing;
  }

  if (Array.isArray(permissionIds)) {
    const validPermIds = permissionIds.map(Number).filter(n => !isNaN(n) && n > 0);
    await db.delete(rolePermissionsTable).where(eq(rolePermissionsTable.roleId, id));
    if (validPermIds.length) {
      await db.insert(rolePermissionsTable)
        .values(validPermIds.map(pid => ({ roleId: id, permissionId: pid })))
        .onConflictDoNothing();
    }
  }

  res.json(role);
});

router.delete("/roles/:id", requireResolvedCompany, async (req, res) => {
  const companyId = resolveCompanyId(req);
  const id = parseInt(req.params.id as string);
  if (isNaN(id)) { res.status(400).json({ error: "Invalid id" }); return; }
  const [role] = await db.select().from(rolesTable)
    .where(and(eq(rolesTable.id, id), eq(rolesTable.companyId, companyId!)))
    .limit(1);
  if (!role) { res.status(404).json({ error: "Not found" }); return; }
  await db.delete(rolePermissionsTable).where(eq(rolePermissionsTable.roleId, id));
  await db.delete(rolesTable).where(eq(rolesTable.id, id));
  res.sendStatus(204);
});

export default router;
