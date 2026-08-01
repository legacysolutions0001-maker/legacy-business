import { Router } from "express";
import bcrypt from "bcryptjs";
import { db, companiesTable, usersTable, featureTogglesTable, subscriptionsTable } from "@workspace/db";
import { eq, desc, count } from "drizzle-orm";
import { requireResolvedCompany, requireSuperAdmin } from "../middlewares/auth";

const router = Router();

const DEFAULT_MODULES = ["billing","gst_billing","inventory","customers","suppliers","hr","salary","attendance","purchase","crm","expenses","projects","appointments","reports","ledger","payments","eway_bill"];

function generateCode() {
  const chars = "ABCDEFGHJKLMNPQRSTUVWXYZ23456789";
  return Array.from({ length: 6 }, () => chars[Math.floor(Math.random() * chars.length)]).join("");
}

router.get("/companies", requireSuperAdmin, async (req, res) => {
  const companies = await db.select().from(companiesTable).orderBy(desc(companiesTable.createdAt));
  const userCounts = await db.select({ companyId: usersTable.companyId, cnt: count() }).from(usersTable).groupBy(usersTable.companyId);
  const countMap = new Map(userCounts.map(u => [u.companyId, u.cnt]));
  res.json(companies.map(c => ({ ...c, userCount: countMap.get(c.id) ?? 0 })));
});

router.post("/companies", requireSuperAdmin, async (req, res) => {
  const data = req.body;
  if (!data.name) { res.status(400).json({ error: "Company name required" }); return; }
  let code = (data.code || generateCode()).toUpperCase();
  const existing = await db.select().from(companiesTable).where(eq(companiesTable.code, code)).limit(1);
  if (existing.length > 0) { res.status(409).json({ error: "Code already exists" }); return; }
  const [company] = await db.insert(companiesTable).values({ ...data, code }).returning();
  await db.insert(featureTogglesTable).values(DEFAULT_MODULES.map(module => ({ companyId: company.id, module, isEnabled: true })));
  if (data.ownerUsername && data.ownerPassword) {
    const hash = await bcrypt.hash(data.ownerPassword, 10);
    await db.insert(usersTable).values({ companyId: company.id, username: data.ownerUsername.toLowerCase(), passwordHash: hash, name: data.ownerName || data.name, email: data.email || null, role: "owner", isActive: true });
  }
  req.log.info({ companyId: company.id, code: company.code }, "Company created");
  res.status(201).json(company);
});

router.get("/companies/:id", requireSuperAdmin, async (req, res) => {
  const id = parseInt(req.params.id as string);
  const [company] = await db.select().from(companiesTable).where(eq(companiesTable.id, id)).limit(1);
  if (!company) { res.status(404).json({ error: "Not found" }); return; }
  const users = await db.select({ id: usersTable.id, username: usersTable.username, name: usersTable.name, role: usersTable.role, isActive: usersTable.isActive }).from(usersTable).where(eq(usersTable.companyId, id));
  const toggles = await db.select().from(featureTogglesTable).where(eq(featureTogglesTable.companyId, id));
  res.json({ ...company, users, features: toggles });
});

router.patch("/companies/:id", requireSuperAdmin, async (req, res) => {
  const id = parseInt(req.params.id as string);
  await db.update(companiesTable).set(req.body).where(eq(companiesTable.id, id));
  res.json({ success: true });
});

router.delete("/companies/:id", requireSuperAdmin, async (req, res) => {
  const id = parseInt(req.params.id as string);
  await db.delete(companiesTable).where(eq(companiesTable.id, id));
  res.json({ success: true });
});

router.post("/companies/:id/suspend", requireSuperAdmin, async (req, res) => {
  await db.update(companiesTable).set({ subscriptionStatus: "suspended" }).where(eq(companiesTable.id, parseInt(req.params.id as string)));
  res.json({ success: true });
});

router.post("/companies/:id/activate", requireSuperAdmin, async (req, res) => {
  await db.update(companiesTable).set({ subscriptionStatus: "active" }).where(eq(companiesTable.id, parseInt(req.params.id as string)));
  res.json({ success: true });
});

router.post("/companies/:id/renew", requireSuperAdmin, async (req, res) => {
  const id = parseInt(req.params.id as string);
  const { endDate, amount } = req.body as { endDate: string; amount: number };
  await db.update(companiesTable).set({ subscriptionEnd: endDate, subscriptionStatus: "active" }).where(eq(companiesTable.id, id));
  if (amount) await db.insert(subscriptionsTable).values({ companyId: id, modules: DEFAULT_MODULES, startDate: new Date().toISOString().split("T")[0], endDate, amount: String(amount), status: "active" });
  res.json({ success: true });
});

router.get("/companies/:id/features", requireResolvedCompany, async (req, res) => {
  const toggles = await db.select().from(featureTogglesTable).where(eq(featureTogglesTable.companyId, parseInt(req.params.id as string)));
  res.json(toggles);
});

router.patch("/companies/:id/features", requireSuperAdmin, async (req, res) => {
  const id = parseInt(req.params.id as string);
  const { module, isEnabled } = req.body as { module: string; isEnabled: boolean };
  const existing = await db.select().from(featureTogglesTable).where(eq(featureTogglesTable.companyId, id)).then(r => r.find(x => x.module === module));
  if (existing) {
    await db.update(featureTogglesTable).set({ isEnabled }).where(eq(featureTogglesTable.id, existing.id));
  } else {
    await db.insert(featureTogglesTable).values({ companyId: id, module, isEnabled });
  }
  res.json({ success: true });
});

router.get("/companies/me/info", requireResolvedCompany, async (req, res) => {
  if (!req.auth?.companyId) { res.status(403).json({ error: "Company required" }); return; }
  const [company] = await db.select().from(companiesTable).where(eq(companiesTable.id, req.auth.companyId)).limit(1);
  if (!company) { res.status(404).json({ error: "Not found" }); return; }
  res.json(company);
});

router.patch("/companies/me/info", requireResolvedCompany, async (req, res) => {
  if (!req.auth?.companyId) { res.status(403).json({ error: "Company required" }); return; }
  const allowed = ["name","ownerName","gstNumber","panNumber","address","city","state","pincode","mobile","email","logoUrl"];
  const update: any = {};
  for (const k of allowed) if (req.body[k] !== undefined) update[k] = req.body[k];
  await db.update(companiesTable).set(update).where(eq(companiesTable.id, req.auth.companyId));
  res.json({ success: true });
});

export default router;
