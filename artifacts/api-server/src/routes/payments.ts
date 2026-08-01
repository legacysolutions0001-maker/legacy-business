import { Router } from "express";
import { db, paymentsTable } from "@workspace/db";
import { eq, sql, and, sum } from "drizzle-orm";
import { requireResolvedCompany, resolveCompanyId } from "../middlewares/auth";

const router = Router();
const toNum = (v: any) => v != null ? Number(v) : 0;

router.get("/payments", requireResolvedCompany, async (req, res) => {
  const companyId = resolveCompanyId(req);
  if (!companyId) { res.status(403).json({ error: "Company required" }); return; }
  const { method, date } = req.query as { method?: string; date?: string };
  let query = db.select().from(paymentsTable).where(eq(paymentsTable.companyId, companyId)).$dynamic();
  if (method) query = query.where(and(eq(paymentsTable.companyId, companyId), eq(paymentsTable.method, method)));
  if (date) query = query.where(and(eq(paymentsTable.companyId, companyId), eq(paymentsTable.paidAt, date)));
  const rows = await query.orderBy(sql`${paymentsTable.createdAt} DESC`);
  res.json(rows.map(r => ({ ...r, amount: toNum(r.amount) })));
});

router.post("/payments", requireResolvedCompany, async (req, res) => {
  const companyId = resolveCompanyId(req);
  if (!companyId) { res.status(403).json({ error: "Company required" }); return; }
  const [row] = await db.insert(paymentsTable).values({ ...req.body, companyId, amount: String(req.body.amount), paidAt: req.body.paidAt || new Date().toISOString().split("T")[0] }).returning();
  res.status(201).json({ ...row, amount: toNum(row.amount) });
});

router.delete("/payments/:id", requireResolvedCompany, async (req, res) => {
  const companyId = resolveCompanyId(req);
  if (!companyId) { res.status(403).json({ error: "Company required" }); return; }
  const id = Number(req.params.id);
  await db.delete(paymentsTable).where(and(eq(paymentsTable.id, id), eq(paymentsTable.companyId, companyId)));
  res.json({ ok: true });
});

router.get("/payments/summary", requireResolvedCompany, async (req, res) => {
  const companyId = resolveCompanyId(req);
  if (!companyId) { res.status(403).json({ error: "Company required" }); return; }
  const today = new Date().toISOString().split("T")[0];
  const monthStart = new Date(new Date().getFullYear(), new Date().getMonth(), 1).toISOString().split("T")[0];
  const [byMethod, monthlyTotals] = await Promise.all([
    db.select({ method: paymentsTable.method, total: sum(paymentsTable.amount) }).from(paymentsTable).where(and(eq(paymentsTable.companyId, companyId), eq(paymentsTable.paidAt, today))).groupBy(paymentsTable.method),
    db.select({ method: paymentsTable.method, total: sum(paymentsTable.amount) }).from(paymentsTable).where(and(eq(paymentsTable.companyId, companyId), sql`paid_at >= ${monthStart}`)).groupBy(paymentsTable.method),
  ]);
  const byM = (arr: any[], m: string) => toNum(arr.find(r => r.method === m)?.total);
  res.json({
    today: { cash: byM(byMethod, "cash"), upi: byM(byMethod, "upi"), card: byM(byMethod, "card"), net_banking: byM(byMethod, "net_banking"), cheque: byM(byMethod, "cheque") },
    monthly: { cash: byM(monthlyTotals, "cash"), upi: byM(monthlyTotals, "upi"), card: byM(monthlyTotals, "card"), net_banking: byM(monthlyTotals, "net_banking"), cheque: byM(monthlyTotals, "cheque") },
  });
});

export default router;
