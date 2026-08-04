import { Router } from "express";
import bcrypt from "bcryptjs";
import { db, usersTable } from "@workspace/db";
import { eq, and } from "drizzle-orm";
import { requireResolvedCompany, requireSuperAdmin } from "../middlewares/auth";

const router = Router();

router.get("/users", requireSuperAdmin, async (req, res) => {
  const users = await db.select({ id: usersTable.id, username: usersTable.username, name: usersTable.name, email: usersTable.email, phone: usersTable.phone, role: usersTable.role, companyId: usersTable.companyId, isActive: usersTable.isActive, createdAt: usersTable.createdAt }).from(usersTable);
  res.json(users);
});

router.post("/users", requireSuperAdmin, async (req, res) => {
  const { username, password, name, email, phone, role, companyId } = req.body;
  if (!username || !password || !name) { res.status(400).json({ error: "username, password, name required" }); return; }
  const existing = await db.select().from(usersTable).where(eq(usersTable.username, username.toLowerCase())).limit(1);
  if (existing.length > 0) { res.status(409).json({ error: "Username already exists" }); return; }
  const hash = await bcrypt.hash(password, 10);
  const [user] = await db.insert(usersTable).values({ username: username.toLowerCase(), passwordHash: hash, name, email, phone, role: role || "owner", companyId: companyId || null, isActive: true }).returning();
  res.status(201).json({ id: user.id, username: user.username, name: user.name, role: user.role, companyId: user.companyId });
});

router.patch("/users/:id", requireSuperAdmin, async (req, res) => {
  const id = parseInt(req.params.id as string);
  const { name, email, phone, role, isActive, password } = req.body;
  const update: any = {};
  if (name) update.name = name;
  if (email !== undefined) update.email = email;
  if (phone !== undefined) update.phone = phone;
  if (role) update.role = role;
  if (isActive !== undefined) update.isActive = isActive;
  if (password) update.passwordHash = await bcrypt.hash(password, 10);
  await db.update(usersTable).set(update).where(eq(usersTable.id, id));
  res.json({ success: true });
});

router.delete("/users/:id", requireSuperAdmin, async (req, res) => {
  await db.delete(usersTable).where(eq(usersTable.id, parseInt(req.params.id as string)));
  res.json({ success: true });
});

router.get("/company/users", requireResolvedCompany, async (req, res) => {
  if (!req.auth?.companyId) { res.status(403).json({ error: "Company required" }); return; }
  const users = await db.select({ id: usersTable.id, username: usersTable.username, name: usersTable.name, email: usersTable.email, role: usersTable.role, isActive: usersTable.isActive }).from(usersTable).where(eq(usersTable.companyId, req.auth.companyId));
  res.json(users);
});

router.post("/company/users", requireResolvedCompany, async (req, res) => {
  if (!req.auth?.companyId || !["owner","sub_admin"].includes(req.auth.role)) { res.status(403).json({ error: "Insufficient permissions" }); return; }
  const { username, password, name, email, role } = req.body;
  if (!username || !password || !name) { res.status(400).json({ error: "username, password, name required" }); return; }
  const existing = await db.select().from(usersTable).where(eq(usersTable.username, username.toLowerCase())).limit(1);
  if (existing.length > 0) { res.status(409).json({ error: "Username already exists" }); return; }
  const hash = await bcrypt.hash(password, 10);
  const [user] = await db.insert(usersTable).values({ username: username.toLowerCase(), passwordHash: hash, name, email, role: role || "worker", companyId: req.auth.companyId, isActive: true }).returning();
  res.status(201).json({ id: user.id, username: user.username, name: user.name, role: user.role });
});

export default router;
