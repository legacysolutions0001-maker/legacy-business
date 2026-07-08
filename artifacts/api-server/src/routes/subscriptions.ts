import { Router } from "express";
import { db, subscriptionsTable, companiesTable, legacyBusinessSettingsTable, subscriptionPricingTable } from "@workspace/db";
import { eq, sql, desc } from "drizzle-orm";
import { requireAuth, requireSuperAdmin } from "../middlewares/auth";

const router = Router();
const toNum = (v: any) => v != null ? Number(v) : 0;

const DEFAULT_PRICING = [
  { plan: "starter", price: "1500" },
  { plan: "professional", price: "3000" },
  { plan: "enterprise", price: "4500" },
];

async function ensurePricing() {
  const existing = await db.select().from(subscriptionPricingTable);
  if (existing.length === 0) {
    await db.insert(subscriptionPricingTable).values(DEFAULT_PRICING);
  }
}

router.get("/subscriptions", requireSuperAdmin, async (req, res) => {
  const rows = await db.select().from(subscriptionsTable).orderBy(desc(subscriptionsTable.createdAt));
  res.json(rows.map(r => ({ ...r, amount: toNum(r.amount) })));
});

router.get("/subscriptions/pricing", requireAuth, async (req, res) => {
  await ensurePricing();
  const rows = await db.select().from(subscriptionPricingTable);
  res.json(rows.map(r => ({ ...r, price: toNum(r.price) })));
});

router.patch("/subscriptions/pricing/:plan", requireSuperAdmin, async (req, res) => {
  const plan = req.params.plan as string;
  const { price } = req.body;
  await ensurePricing();
  const existing = await db.select().from(subscriptionPricingTable).where(eq(subscriptionPricingTable.plan, plan)).limit(1);
  if (existing.length > 0) {
    await db.update(subscriptionPricingTable).set({ price: String(price) }).where(eq(subscriptionPricingTable.plan, plan));
  } else {
    await db.insert(subscriptionPricingTable).values({ plan, price: String(price) });
  }
  res.json({ success: true });
});

router.post("/subscriptions", requireSuperAdmin, async (req, res) => {
  const { companyId, plan, modules, startDate, endDate, amount, notes } = req.body;
  const cnt = await db.select({ c: sql<number>`COUNT(*)` }).from(subscriptionsTable);
  const num = (Number((cnt[0] as any)?.c ?? 0) + 1).toString().padStart(4, "0");
  const invoiceNumber = `SUB-${new Date().getFullYear()}-${num}`;
  const [row] = await db.insert(subscriptionsTable).values({
    companyId, plan: plan || "starter", modules: modules ?? [],
    startDate, endDate, amount: String(amount), status: "active",
    paidStatus: "unpaid", invoiceNumber, notes
  }).returning();
  await db.update(companiesTable).set({ subscriptionStart: startDate, subscriptionEnd: endDate, subscriptionStatus: "active", plan: plan || "starter" }).where(eq(companiesTable.id, companyId));
  res.status(201).json({ ...row, amount: toNum(row.amount) });
});

router.patch("/subscriptions/:id", requireSuperAdmin, async (req, res) => {
  const id = parseInt(req.params.id as string);
  const { plan, status, paidStatus, startDate, endDate, amount } = req.body;
  const update: any = {};
  if (plan !== undefined) update.plan = plan;
  if (status !== undefined) update.status = status;
  if (paidStatus !== undefined) update.paidStatus = paidStatus;
  if (startDate !== undefined) update.startDate = startDate;
  if (endDate !== undefined) update.endDate = endDate;
  if (amount !== undefined) update.amount = String(amount);
  const [row] = await db.update(subscriptionsTable).set(update).where(eq(subscriptionsTable.id, id)).returning();
  if (!row) { res.status(404).json({ error: "Not found" }); return; }
  res.json({ ...row, amount: toNum(row.amount) });
});

router.get("/subscriptions/:id", requireSuperAdmin, async (req, res) => {
  const [row] = await db.select().from(subscriptionsTable).where(eq(subscriptionsTable.id, parseInt(req.params.id as string))).limit(1);
  if (!row) { res.status(404).json({ error: "Not found" }); return; }
  const [settings] = await db.select().from(legacyBusinessSettingsTable).limit(1);
  const [company] = await db.select().from(companiesTable).where(eq(companiesTable.id, row.companyId)).limit(1);
  res.json({ ...row, amount: toNum(row.amount), settings: settings ?? {}, company: company ?? {} });
});

router.get("/company/subscription", requireAuth, async (req, res) => {
  if (!req.auth?.companyId) { res.status(403).json({ error: "Company required" }); return; }
  const [row] = await db.select().from(subscriptionsTable).where(eq(subscriptionsTable.companyId, req.auth.companyId)).orderBy(desc(subscriptionsTable.createdAt)).limit(1);
  res.json(row ? { ...row, amount: toNum(row.amount) } : null);
});

export default router;
