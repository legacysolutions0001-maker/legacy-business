import { Router } from "express";
import { db, customersTable, invoicesTable } from "@workspace/db";
import { eq, ilike, sql, and, or } from "drizzle-orm";
import { requireResolvedCompany, resolveCompanyId } from "../middlewares/auth";

const router = Router();

let customersMigrated = false;
async function ensureCustomerColumns() {
  if (customersMigrated) return;
  try { await db.execute(sql`ALTER TABLE lb_customers ADD COLUMN IF NOT EXISTS whatsapp_number TEXT`); } catch {}
  customersMigrated = true;
}

router.get("/customers", requireResolvedCompany, async (req, res) => {
  const companyId = resolveCompanyId(req);
  if (!companyId) { res.status(403).json({ error: "Company required" }); return; }
  await ensureCustomerColumns();
  const { search, phone } = req.query as { search?: string; phone?: string };
  let query = db.select().from(customersTable).where(eq(customersTable.companyId, companyId)).$dynamic();
  if (phone) query = query.where(and(eq(customersTable.companyId, companyId), ilike(customersTable.mobile, `%${phone}%`)));
  else if (search) query = query.where(and(eq(customersTable.companyId, companyId), or(ilike(customersTable.name, `%${search}%`), ilike(customersTable.mobile, `%${search}%`))));
  const rows = await query.orderBy(sql`${customersTable.createdAt} DESC`);
  res.json(rows.map(r => ({ ...r, totalRevenue: r.totalRevenue ? Number(r.totalRevenue) : 0, pendingDues: r.pendingDues ? Number(r.pendingDues) : 0 })));
});

router.post("/customers", requireResolvedCompany, async (req, res) => {
  const companyId = resolveCompanyId(req);
  if (!companyId) { res.status(403).json({ error: "Company required" }); return; }
  const [row] = await db.insert(customersTable).values({ ...req.body, companyId }).returning();
  res.status(201).json({ ...row, totalRevenue: Number(row.totalRevenue ?? 0), pendingDues: Number(row.pendingDues ?? 0) });
});

router.get("/customers/:id", requireResolvedCompany, async (req, res) => {
  const companyId = resolveCompanyId(req);
  const id = parseInt(req.params.id as string);
  const [row] = await db.select().from(customersTable).where(and(eq(customersTable.id, id), eq(customersTable.companyId, companyId!))).limit(1);
  if (!row) { res.status(404).json({ error: "Not found" }); return; }
  const invoices = await db.select().from(invoicesTable).where(and(eq(invoicesTable.customerId, id), eq(invoicesTable.companyId, companyId!))).orderBy(sql`${invoicesTable.createdAt} DESC`).limit(10);
  res.json({ ...row, totalRevenue: Number(row.totalRevenue ?? 0), pendingDues: Number(row.pendingDues ?? 0), invoices: invoices.map(i => ({ ...i, total: Number(i.total) })) });
});

router.patch("/customers/:id", requireResolvedCompany, async (req, res) => {
  const companyId = resolveCompanyId(req);
  const id = parseInt(req.params.id as string);
  const [row] = await db.update(customersTable).set(req.body).where(and(eq(customersTable.id, id), eq(customersTable.companyId, companyId!))).returning();
  if (!row) { res.status(404).json({ error: "Not found" }); return; }
  res.json({ ...row, totalRevenue: Number(row.totalRevenue ?? 0) });
});

router.delete("/customers/:id", requireResolvedCompany, async (req, res) => {
  const companyId = resolveCompanyId(req);
  await db.delete(customersTable).where(and(eq(customersTable.id, parseInt(req.params.id as string)), eq(customersTable.companyId, companyId!)));
  res.sendStatus(204);
});

export default router;
