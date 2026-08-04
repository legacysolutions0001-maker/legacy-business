import { Router } from "express";
import bcrypt from "bcryptjs";
import { db, usersTable, companiesTable, subscriptionsTable, notificationsTable, invoicesTable, productsTable, customersTable, suppliersTable, productVariantsTable } from "@workspace/db";
import { eq, sql, count, ilike, or, desc } from "drizzle-orm";
import { requireSuperAdmin } from "../middlewares/auth";
import { syncCompanyToFirestore, generateLicenseKey, deleteCompanyFromFirestore } from "../lib/firebase-admin";

const router = Router();

router.get("/super/dashboard", requireSuperAdmin, async (req, res) => {
  try {
    const [totalCompanies] = await db.select({ count: count() }).from(companiesTable);
    const [activeCompanies] = await db.select({ count: count() }).from(companiesTable).where(eq(companiesTable.subscriptionStatus, "active"));
    const [totalUsers] = await db.select({ count: count() }).from(usersTable);
    const [activeSubscriptions] = await db.select({ count: count() }).from(subscriptionsTable).where(sql`status = 'active'`);
    const byPlanRaw = await db.select({ plan: companiesTable.plan, count: count() }).from(companiesTable).groupBy(companiesTable.plan);
    const byPlan = byPlanRaw.map(r => ({ label: r.plan || "free", value: Number(r.count) }));
    const recentCompanies = await db.select().from(companiesTable).orderBy(desc(companiesTable.createdAt)).limit(5);
    res.json({
      totalCompanies: Number(totalCompanies?.count ?? 0),
      activeCompanies: Number(activeCompanies?.count ?? 0),
      totalUsers: Number(totalUsers?.count ?? 0),
      activeSubscriptions: Number(activeSubscriptions?.count ?? 0),
      byPlan,
      recentCompanies,
    });
  } catch (e: any) { res.status(500).json({ error: e.message }); }
});

router.get("/super/companies", requireSuperAdmin, async (req, res) => {
  const search = req.query.search as string | undefined;
  let rows;
  if (search) {
    rows = await db.select().from(companiesTable).where(or(ilike(companiesTable.name, `%${search}%`), ilike(companiesTable.code, `%${search}%`))).orderBy(sql`${companiesTable.createdAt} DESC`);
  } else {
    rows = await db.select().from(companiesTable).orderBy(sql`${companiesTable.createdAt} DESC`);
  }
  const withUsers = await Promise.all(rows.map(async (c) => {
    const [cnt] = await db.select({ count: count() }).from(usersTable).where(eq(usersTable.companyId, c.id));
    return { ...c, userCount: Number(cnt?.count ?? 0) };
  }));
  res.json(withUsers);
});

router.post("/super/companies", requireSuperAdmin, async (req, res) => {
  const { name, code, ownerName, ownerEmail, ownerUsername, ownerPassword, owner2Name, owner2Email, owner2Username, owner2Password, plan, gstNumber, panNumber, mobile, address, city, state, logo, logoUrl } = req.body;
  if (!name || !code) { res.status(400).json({ error: "Name and code required" }); return; }
  if (!ownerUsername || !ownerPassword) { res.status(400).json({ error: "Owner username and password required" }); return; }
  const upper = (code as string).toUpperCase();
  const existing = await db.select({ id: companiesTable.id }).from(companiesTable).where(eq(companiesTable.code, upper)).limit(1);
  if (existing.length > 0) { res.status(400).json({ error: "Company code already exists" }); return; }

  // Generate a license key automatically
  const licenseKey = generateLicenseKey();
  const maxUsers = Number(req.body.maxUsers) || 5;
  const maxDevices = Number(req.body.maxDevices) || 1;
  const maxBranches = Number(req.body.maxBranches) || 1;
  const subscriptionEnd = req.body.subscriptionEnd || undefined;

  const [company] = await db.insert(companiesTable).values({
    name, code: upper,
    ownerName: ownerName || undefined,
    gstNumber: gstNumber || undefined,
    panNumber: panNumber || undefined,
    mobile: mobile || undefined,
    address: address || undefined,
    city: city || undefined,
    state: state || undefined,
    logoUrl: logoUrl || logo || undefined,
    plan: plan || "starter",
    subscriptionStatus: "active",
    subscriptionEnd: subscriptionEnd,
    licenseKey,
    maxUsers,
    maxDevices,
    maxBranches,
    activationStatus: "active",
  }).returning();

  const hash = await bcrypt.hash(ownerPassword, 10);
  await db.insert(usersTable).values({
    companyId: company.id,
    username: ownerUsername.toLowerCase(),
    passwordHash: hash,
    name: ownerName || ownerUsername,
    email: ownerEmail || undefined,
    role: "owner",
    isActive: true
  });

  if (owner2Username && owner2Password) {
    const hash2 = await bcrypt.hash(owner2Password, 10);
    await db.insert(usersTable).values({
      companyId: company.id,
      username: owner2Username.toLowerCase(),
      passwordHash: hash2,
      name: owner2Name || owner2Username,
      email: owner2Email || undefined,
      role: "owner",
      isActive: true
    });
  }

  // Sync to Firebase Firestore (non-fatal if it fails)
  try {
    const firebaseId = await syncCompanyToFirestore({
      companyCode: upper,
      companyName: name,
      licenseKey,
      maxUsers,
      maxDevices,
      maxBranches,
      subscriptionStatus: "active",
      subscriptionExpiry: subscriptionEnd ?? null,
      activationStatus: "active",
      plan: plan || "starter",
      ownerName: ownerName ?? undefined,
      email: ownerEmail ?? undefined,
      phone: mobile ?? undefined,
      createdAt: new Date().toISOString(),
      updatedAt: new Date().toISOString(),
    });
    await db.update(companiesTable).set({ firebaseId }).where(eq(companiesTable.id, company.id));
    req.log.info({ companyId: company.id, licenseKey, firebaseId }, "Company created and synced to Firebase");
  } catch (fbErr: any) {
    req.log.warn({ err: fbErr.message }, "Firebase sync failed — company saved locally");
  }

  res.json({ ...company, licenseKey });
});

router.patch("/super/companies/:id", requireSuperAdmin, async (req, res) => {
  const id = Number(req.params.id);
  const { name, plan, gstNumber, panNumber, mobile, address, city, state, logo, logoUrl, subscriptionStatus } = req.body;
  const update: any = {};
  if (name !== undefined) update.name = name;
  if (plan !== undefined) update.plan = plan;
  if (gstNumber !== undefined) update.gstNumber = gstNumber || null;
  if (panNumber !== undefined) update.panNumber = panNumber || null;
  if (mobile !== undefined) update.mobile = mobile || null;
  if (address !== undefined) update.address = address || null;
  if (city !== undefined) update.city = city || null;
  if (state !== undefined) update.state = state || null;
  if (logoUrl !== undefined || logo !== undefined) update.logoUrl = logoUrl || logo || null;
  if (subscriptionStatus !== undefined) update.subscriptionStatus = subscriptionStatus;
  const [c] = await db.update(companiesTable).set(update).where(eq(companiesTable.id, id)).returning();
  res.json(c);
});

router.delete("/super/companies/:id", requireSuperAdmin, async (req, res) => {
  const id = Number(req.params.id);
  const safe = async (q: any) => { try { await db.execute(q); } catch { /* table may not exist or have no rows */ } };
  try {
    await safe(sql`DELETE FROM lb_sales_returns WHERE company_id = ${id}`);
    await safe(sql`DELETE FROM lb_purchase_returns WHERE company_id = ${id}`);
    await safe(sql`DELETE FROM lb_cash_bank_ledger WHERE company_id = ${id}`);
    await safe(sql`DELETE FROM lb_product_variants WHERE company_id = ${id}`);
    await safe(sql`DELETE FROM lb_invoices WHERE company_id = ${id}`);
    await safe(sql`DELETE FROM lb_purchase_orders WHERE company_id = ${id}`);
    await safe(sql`DELETE FROM lb_payments WHERE company_id = ${id}`);
    await safe(sql`DELETE FROM lb_products WHERE company_id = ${id}`);
    await safe(sql`DELETE FROM lb_customers WHERE company_id = ${id}`);
    await safe(sql`DELETE FROM lb_suppliers WHERE company_id = ${id}`);
    await safe(sql`DELETE FROM lb_salary_records WHERE company_id = ${id}`);
    await safe(sql`DELETE FROM lb_attendance WHERE company_id = ${id}`);
    await safe(sql`DELETE FROM lb_employees WHERE company_id = ${id}`);
    await safe(sql`DELETE FROM lb_eway_bills WHERE company_id = ${id}`);
    await safe(sql`DELETE FROM lb_daybook WHERE company_id = ${id}`);
    await safe(sql`DELETE FROM lb_notifications WHERE company_id = ${id}`);
    await safe(sql`DELETE FROM lb_subscriptions WHERE company_id = ${id}`);
    await safe(sql`DELETE FROM lb_messages WHERE company_id = ${id}`);
    await safe(sql`DELETE FROM lb_feature_toggles WHERE company_id = ${id}`);
    await safe(sql`DELETE FROM lb_legacy_business_settings WHERE company_id = ${id}`);
    await safe(sql`DELETE FROM lb_expenses WHERE company_id = ${id}`);
    await safe(sql`DELETE FROM lb_leads WHERE company_id = ${id}`);
    await safe(sql`DELETE FROM lb_deals WHERE company_id = ${id}`);
    await safe(sql`DELETE FROM lb_appointments WHERE company_id = ${id}`);
    await safe(sql`DELETE FROM lb_projects WHERE company_id = ${id}`);
    await db.delete(usersTable).where(eq(usersTable.companyId, id));
    await db.delete(companiesTable).where(eq(companiesTable.id, id));
    res.json({ success: true });
  } catch (e: any) {
    res.status(500).json({ error: e.message });
  }
});

router.post("/super/companies/:id/suspend", requireSuperAdmin, async (req, res) => {
  const id = Number(req.params.id);
  await db.update(companiesTable).set({ subscriptionStatus: "suspended" }).where(eq(companiesTable.id, id));
  res.json({ success: true });
});

router.post("/super/companies/:id/activate", requireSuperAdmin, async (req, res) => {
  const id = Number(req.params.id);
  await db.update(companiesTable).set({ subscriptionStatus: "active" }).where(eq(companiesTable.id, id));
  res.json({ success: true });
});

router.post("/super/companies/:id/renew", requireSuperAdmin, async (req, res) => {
  const id = Number(req.params.id);
  const { endDate, plan, amount } = req.body;
  const update: any = { subscriptionStatus: "active" };
  if (endDate) update.subscriptionEnd = endDate;
  if (plan) update.plan = plan;
  await db.update(companiesTable).set(update).where(eq(companiesTable.id, id));
  if (amount) {
    const cnt = await db.select({ c: sql<number>`COUNT(*)` }).from(subscriptionsTable);
    const num = (Number((cnt[0] as any)?.c ?? 0) + 1).toString().padStart(4, "0");
    await db.insert(subscriptionsTable).values({
      companyId: id, plan: plan || "starter", modules: [], status: "active",
      paidStatus: "paid", startDate: new Date().toISOString().split("T")[0],
      endDate: endDate || "", amount: String(amount),
      invoiceNumber: `SUB-${new Date().getFullYear()}-${num}`
    });
  }
  res.json({ success: true });
});

router.get("/super/users", requireSuperAdmin, async (req, res) => {
  const search = req.query.search as string | undefined;
  if (search) {
    const rows = await db.select({ u: usersTable, companyName: companiesTable.name }).from(usersTable).leftJoin(companiesTable, eq(usersTable.companyId, companiesTable.id)).where(or(ilike(usersTable.name, `%${search}%`), ilike(usersTable.username, `%${search}%`))).orderBy(sql`${usersTable.createdAt} DESC`);
    res.json(rows.map(r => ({ ...r.u, companyName: r.companyName })));
  } else {
    const rows = await db.select({ u: usersTable, companyName: companiesTable.name }).from(usersTable).leftJoin(companiesTable, eq(usersTable.companyId, companiesTable.id)).orderBy(sql`${usersTable.createdAt} DESC`);
    res.json(rows.map(r => ({ ...r.u, companyName: r.companyName })));
  }
});

router.post("/super/users", requireSuperAdmin, async (req, res) => {
  const { username, password, name, email, phone, role, companyId } = req.body;
  if (!username || !password || !name) { res.status(400).json({ error: "username, password, name required" }); return; }
  const existing = await db.select().from(usersTable).where(eq(usersTable.username, username.toLowerCase())).limit(1);
  if (existing.length > 0) { res.status(409).json({ error: "Username already exists" }); return; }
  const hash = await bcrypt.hash(password, 10);
  const [user] = await db.insert(usersTable).values({
    username: username.toLowerCase(), passwordHash: hash, name,
    email: email || null, phone: phone || null,
    role: role || "owner", companyId: companyId ? Number(companyId) : null, isActive: true
  }).returning();
  res.status(201).json({ id: user.id, username: user.username, name: user.name, role: user.role, companyId: user.companyId });
});

router.patch("/super/users/:id", requireSuperAdmin, async (req, res) => {
  const id = Number(req.params.id);
  const { isActive, name, email, role, password } = req.body;
  const update: any = {};
  if (isActive !== undefined) update.isActive = isActive;
  if (name !== undefined) update.name = name;
  if (email !== undefined) update.email = email;
  if (role !== undefined) update.role = role;
  if (password) update.passwordHash = await bcrypt.hash(password, 10);
  const [u] = await db.update(usersTable).set(update).where(eq(usersTable.id, id)).returning();
  res.json(u);
});

router.delete("/super/users/:id", requireSuperAdmin, async (req, res) => {
  const id = Number(req.params.id);
  await db.delete(usersTable).where(eq(usersTable.id, id));
  res.json({ success: true });
});

router.get("/super/subscriptions", requireSuperAdmin, async (req, res) => {
  try {
    const rows = await db.select({ s: subscriptionsTable, companyName: companiesTable.name }).from(subscriptionsTable).leftJoin(companiesTable, eq(subscriptionsTable.companyId, companiesTable.id)).orderBy(desc(subscriptionsTable.createdAt));
    res.json(rows.map(r => ({ ...r.s, companyName: r.companyName, amount: Number(r.s.amount ?? 0) })));
  } catch { res.json([]); }
});

router.get("/super/subscriptions/summary", requireSuperAdmin, async (req, res) => {
  try {
    const rows = await db.select().from(subscriptionsTable);
    const active = rows.filter(r => r.status === "active").length;
    const expired = rows.filter(r => r.status === "expired").length;
    const paid = rows.filter(r => (r as any).paidStatus === "paid").length;
    const totalRevenue = rows.filter(r => (r as any).paidStatus === "paid").reduce((s, r) => s + Number(r.amount || 0), 0);
    res.json({ active, expired, paid, totalRevenue });
  } catch { res.json({ active: 0, expired: 0, paid: 0, totalRevenue: 0 }); }
});

router.post("/super/subscriptions", requireSuperAdmin, async (req, res) => {
  try {
    const { companyId, plan, status, paidStatus, startDate, endDate, amount } = req.body;
    const cnt = await db.select({ c: sql<number>`COUNT(*)` }).from(subscriptionsTable);
    const num = (Number((cnt[0] as any)?.c ?? 0) + 1).toString().padStart(4, "0");
    const invoiceNumber = `SUB-${new Date().getFullYear()}-${num}`;
    const [sub] = await db.insert(subscriptionsTable).values({
      companyId: Number(companyId),
      plan: plan || "starter",
      modules: [],
      status: status || "active",
      paidStatus: paidStatus || "unpaid",
      startDate, endDate,
      amount: String(amount ?? 0),
      invoiceNumber
    }).returning();
    await db.update(companiesTable).set({ plan, subscriptionStatus: status || "active", subscriptionStart: startDate, subscriptionEnd: endDate }).where(eq(companiesTable.id, Number(companyId)));
    res.json({ ...sub, amount: Number(sub.amount) });
  } catch (e: any) { res.status(500).json({ error: e.message }); }
});

router.patch("/super/subscriptions/:id", requireSuperAdmin, async (req, res) => {
  try {
    const id = Number(req.params.id);
    const { plan, status, paidStatus, startDate, endDate, amount } = req.body;
    const update: any = {};
    if (plan !== undefined) update.plan = plan;
    if (status !== undefined) update.status = status;
    if (paidStatus !== undefined) update.paidStatus = paidStatus;
    if (startDate !== undefined) update.startDate = startDate;
    if (endDate !== undefined) update.endDate = endDate;
    if (amount !== undefined) update.amount = String(amount);
    const [sub] = await db.update(subscriptionsTable).set(update).where(eq(subscriptionsTable.id, id)).returning();
    if (sub) await db.update(companiesTable).set({ plan: sub.plan, subscriptionStatus: sub.status }).where(eq(companiesTable.id, sub.companyId));
    res.json({ ...sub, amount: Number(sub?.amount ?? 0) });
  } catch (e: any) { res.status(500).json({ error: e.message }); }
});

router.get("/super/notifications", requireSuperAdmin, async (req, res) => {
  try {
    const rows = await db.select({ n: notificationsTable, companyName: companiesTable.name }).from(notificationsTable).leftJoin(companiesTable, eq(notificationsTable.companyId, companiesTable.id)).orderBy(sql`${notificationsTable.createdAt} DESC`).limit(100);
    res.json(rows.map(r => ({ ...r.n, companyName: r.companyName })));
  } catch { res.json([]); }
});

router.post("/super/notifications", requireSuperAdmin, async (req, res) => {
  try {
    const { title, message, type, companyId } = req.body;
    if (companyId) {
      const [n] = await db.insert(notificationsTable).values({ companyId: Number(companyId), title, message, type: type || "info", isRead: false }).returning();
      res.json(n);
    } else {
      const companies = await db.select({ id: companiesTable.id }).from(companiesTable);
      if (companies.length > 0) {
        await db.insert(notificationsTable).values(companies.map(c => ({ companyId: c.id, title, message, type: type || "info", isRead: false })));
      }
      res.json({ success: true, sentTo: companies.length });
    }
  } catch (e: any) { res.status(500).json({ error: e.message }); }
});

export default router;
