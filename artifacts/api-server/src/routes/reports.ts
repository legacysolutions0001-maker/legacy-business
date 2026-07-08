import { Router } from "express";
import { db, invoicesTable, purchaseOrdersTable, productsTable, customersTable, employeesTable, salaryRecordsTable, paymentsTable, expensesTable } from "@workspace/db";
import { eq, sql, and, sum, count, gte, lte, or } from "drizzle-orm";
import { requireAuth } from "../middlewares/auth";

const router = Router();
const toNum = (v: any) => v != null ? Number(v) : 0;

router.get("/reports/sales", requireAuth, async (req, res) => {
  const companyId = req.auth!.companyId;
  if (!companyId) { res.status(403).json({ error: "Company required" }); return; }
  const { from, to } = req.query as { from?: string; to?: string };
  let query = db.select().from(invoicesTable).where(eq(invoicesTable.companyId, companyId)).$dynamic();
  if (from) query = query.where(and(eq(invoicesTable.companyId, companyId), gte(invoicesTable.invoiceDate, from)));
  if (to) query = query.where(and(eq(invoicesTable.companyId, companyId), lte(invoicesTable.invoiceDate, to)));
  const rows = await query.orderBy(sql`${invoicesTable.invoiceDate} DESC`);
  const total = rows.reduce((s, r) => s + toNum(r.total), 0);
  const paid = rows.filter(r => r.paymentStatus === "paid").reduce((s, r) => s + toNum(r.total), 0);
  res.json({ rows: rows.map(r => ({ ...r, total: toNum(r.total), subtotal: toNum(r.subtotal) })), summary: { total, paid, pending: total - paid, count: rows.length } });
});

router.get("/reports/purchase", requireAuth, async (req, res) => {
  const companyId = req.auth!.companyId;
  if (!companyId) { res.status(403).json({ error: "Company required" }); return; }
  const { from, to } = req.query as { from?: string; to?: string };
  let query = db.select().from(purchaseOrdersTable).where(eq(purchaseOrdersTable.companyId, companyId)).$dynamic();
  if (from) query = query.where(and(eq(purchaseOrdersTable.companyId, companyId), gte(purchaseOrdersTable.billDate, from)));
  if (to) query = query.where(and(eq(purchaseOrdersTable.companyId, companyId), lte(purchaseOrdersTable.billDate, to)));
  const rows = await query.orderBy(sql`${purchaseOrdersTable.billDate} DESC`);
  const total = rows.reduce((s, r) => s + toNum(r.total), 0);
  res.json({ rows: rows.map(r => ({ ...r, total: toNum(r.total) })), summary: { total, count: rows.length } });
});

router.get("/reports/gst", requireAuth, async (req, res) => {
  const companyId = req.auth!.companyId;
  if (!companyId) { res.status(403).json({ error: "Company required" }); return; }
  const { from, to } = req.query as { from?: string; to?: string };
  const gstReport = await db.execute(sql`
    SELECT invoice_date, invoice_number, customer_name, customer_gst, subtotal::numeric, cgst::numeric, sgst::numeric, igst::numeric, total::numeric
    FROM lb_invoices WHERE company_id = ${companyId}
    ${from ? sql`AND invoice_date >= ${from}` : sql``}
    ${to ? sql`AND invoice_date <= ${to}` : sql``}
    ORDER BY invoice_date DESC
  `);
  const rows = gstReport.rows as any[];
  const totalCgst = rows.reduce((s, r) => s + Number(r.cgst ?? 0), 0);
  const totalSgst = rows.reduce((s, r) => s + Number(r.sgst ?? 0), 0);
  const totalIgst = rows.reduce((s, r) => s + Number(r.igst ?? 0), 0);
  res.json({ rows, summary: { totalCgst, totalSgst, totalIgst, totalGst: totalCgst + totalSgst + totalIgst } });
});

router.get("/reports/inventory", requireAuth, async (req, res) => {
  const companyId = req.auth!.companyId;
  if (!companyId) { res.status(403).json({ error: "Company required" }); return; }
  const rows = await db.select().from(productsTable).where(eq(productsTable.companyId, companyId)).orderBy(sql`${productsTable.category}`);
  const totalValue = rows.reduce((s, r) => s + (toNum(r.sellingPrice) * (r.currentStock ?? 0)), 0);
  res.json({ rows: rows.map(r => ({ ...r, sellingPrice: toNum(r.sellingPrice), purchasePrice: toNum(r.purchasePrice), stockValue: toNum(r.sellingPrice) * (r.currentStock ?? 0) })), summary: { totalProducts: rows.length, totalValue, lowStock: rows.filter(r => (r.currentStock ?? 0) <= r.minStock).length } });
});

router.get("/reports/salary", requireAuth, async (req, res) => {
  const companyId = req.auth!.companyId;
  if (!companyId) { res.status(403).json({ error: "Company required" }); return; }
  const { month, year } = req.query as { month?: string; year?: string };
  const m = month ? parseInt(month) : new Date().getMonth() + 1;
  const y = year ? parseInt(year) : new Date().getFullYear();
  const rows = await db.execute(sql`
    SELECT sr.*, e.name as employee_name, e.department, e.position FROM lb_salary_records sr
    LEFT JOIN lb_employees e ON sr.employee_id = e.id
    WHERE sr.company_id = ${companyId} AND sr.month = ${m} AND sr.year = ${y}
  `);
  const data = rows.rows as any[];
  const total = data.reduce((s, r) => s + Number(r.net_salary ?? 0), 0);
  res.json({ rows: data, summary: { total, paid: data.filter(r => r.status === "paid").reduce((s, r) => s + Number(r.net_salary), 0), pending: data.filter(r => r.status === "pending").reduce((s, r) => s + Number(r.net_salary), 0) } });
});

router.get("/reports/summary", requireAuth, async (req, res) => {
  const companyId = req.auth!.companyId;
  if (!companyId) { res.status(403).json({ error: "Company required" }); return; }
  const { period } = req.query as { period?: string };
  const now = new Date();
  let fromDate: string | undefined;
  if (period === "today") fromDate = now.toISOString().split("T")[0];
  else if (period === "thisWeek") {
    const d = new Date(now); d.setDate(d.getDate() - d.getDay()); fromDate = d.toISOString().split("T")[0];
  } else if (period === "thisMonth") {
    fromDate = `${now.getFullYear()}-${String(now.getMonth()+1).padStart(2,"0")}-01`;
  } else if (period === "lastMonth") {
    const d = new Date(now.getFullYear(), now.getMonth()-1, 1);
    fromDate = d.toISOString().split("T")[0];
  } else if (period === "thisYear") {
    fromDate = `${now.getFullYear()}-01-01`;
  }

  const invFilter = fromDate
    ? and(eq(invoicesTable.companyId, companyId), gte(invoicesTable.invoiceDate, fromDate))
    : eq(invoicesTable.companyId, companyId);

  const [invoiceRows, customerRows, productRows, paymentRows] = await Promise.all([
    db.select().from(invoicesTable).where(invFilter),
    db.select().from(customersTable).where(eq(customersTable.companyId, companyId)),
    db.select().from(productsTable).where(eq(productsTable.companyId, companyId)),
    db.select().from(paymentsTable).where(fromDate
      ? and(eq(paymentsTable.companyId, companyId), gte(paymentsTable.paidAt, fromDate))
      : eq(paymentsTable.companyId, companyId)),
  ]);

  const paidInvoices = invoiceRows.filter(r => r.paymentStatus === "paid");
  const pendingInvoices = invoiceRows.filter(r => r.paymentStatus === "pending");
  const overdueInvoices = invoiceRows.filter(r => r.paymentStatus === "overdue");
  const revenue = paidInvoices.reduce((s, r) => s + toNum(r.total), 0);
  const invoiceRevenue = invoiceRows.reduce((s, r) => s + toNum(r.total), 0);
  // Use real expense data from daybook/expenses
  const expenseResult = await db.execute(
    fromDate
      ? sql`SELECT COALESCE(SUM(amount::numeric), 0) as total FROM lb_daybook WHERE company_id = ${companyId} AND date >= ${fromDate}`
      : sql`SELECT COALESCE(SUM(amount::numeric), 0) as total FROM lb_daybook WHERE company_id = ${companyId}`
  );
  const expenses = Number((expenseResult.rows[0] as any)?.total ?? 0);
  const profit = revenue - expenses;
  const netProfit = profit;

  const cashTotal = paymentRows.filter(r => r.method === "cash").reduce((s, r) => s + toNum(r.amount), 0);
  const upiTotal = paymentRows.filter(r => r.method === "upi").reduce((s, r) => s + toNum(r.amount), 0);
  const cardTotal = paymentRows.filter(r => r.method === "card").reduce((s, r) => s + toNum(r.amount), 0);
  const bankTotal = paymentRows.filter(r => r.method === "bank" || r.method === "bank_transfer").reduce((s, r) => s + toNum(r.amount), 0);

  const topCustomers = [...customerRows]
    .sort((a, b) => toNum(b.totalRevenue) - toNum(a.totalRevenue))
    .slice(0, 5)
    .map(c => ({ name: c.name, totalRevenue: toNum(c.totalRevenue) }));

  const lowStockProducts = productRows
    .filter(p => (p.currentStock ?? 0) <= p.minStock)
    .map(p => ({ ...p, sellingPrice: toNum(p.sellingPrice), purchasePrice: toNum(p.purchasePrice) }));

  const monthlyRevenue = Array.from({ length: 6 }, (_, i) => {
    const d = new Date(now.getFullYear(), now.getMonth() - (5-i), 1);
    const label = d.toLocaleString("default", { month: "short" });
    const ym = `${d.getFullYear()}-${String(d.getMonth()+1).padStart(2,"0")}`;
    const value = invoiceRows.filter(r => (r.invoiceDate || "").startsWith(ym) && r.paymentStatus === "paid").reduce((s, r) => s + toNum(r.total), 0);
    return { label, value };
  });

  res.json({
    revenue, expenses, profit, netProfit, invoiceRevenue,
    invoiceCount: invoiceRows.length, paidCount: paidInvoices.length,
    pendingCount: pendingInvoices.length, overdueCount: overdueInvoices.length,
    totalCustomers: customerRows.length, totalProducts: productRows.length,
    cashTotal, upiTotal, cardTotal, bankTotal,
    topCustomers, lowStockProducts, monthlyRevenue,
  });
});

router.get("/reports/ledger", requireAuth, async (req, res) => {
  const companyId = req.auth!.companyId;
  if (!companyId) { res.status(403).json({ error: "Company required" }); return; }
  const { partyType, partyId, from, to } = req.query as { partyType?: string; partyId?: string; from?: string; to?: string };
  if (!partyId) { res.status(400).json({ error: "partyId required" }); return; }
  const id = Number(partyId);

  const invCond = partyType === "customer"
    ? and(eq(invoicesTable.companyId, companyId), eq(invoicesTable.customerId, id))
    : eq(invoicesTable.companyId, companyId);

  const [invRows, payRows] = await Promise.all([
    db.select().from(invoicesTable).where(invCond).orderBy(sql`${invoicesTable.invoiceDate} ASC`),
    db.select().from(paymentsTable).where(
      and(eq(paymentsTable.companyId, companyId), eq(paymentsTable.entityId, id))
    ).orderBy(sql`${paymentsTable.paidAt} ASC`),
  ]);

  const entries: any[] = [];
  invRows.forEach(inv => {
    const d = inv.invoiceDate || inv.createdAt?.toISOString().split("T")[0] || "";
    if (from && d < from) return;
    if (to && d > to) return;
    entries.push({ date: d, type: "invoice", reference: inv.invoiceNumber, description: inv.notes || `Invoice to ${inv.customerName}`, debit: partyType==="customer"?toNum(inv.total):0, credit: partyType==="supplier"?toNum(inv.total):0 });
  });
  payRows.forEach(pay => {
    const d = String(pay.paidAt || "").split("T")[0];
    if (from && d < from) return;
    if (to && d > to) return;
    const isIncoming = pay.entityType === "customer";
    entries.push({ date: d, type: "payment", reference: pay.reference || "", description: pay.notes || "Payment", debit: isIncoming?0:toNum(pay.amount), credit: isIncoming?toNum(pay.amount):0 });
  });
  entries.sort((a, b) => (a.date > b.date ? 1 : -1));

  let balance = 0;
  entries.forEach(e => { balance += (e.debit - e.credit); e.balance = balance; });
  const totalDebit = entries.reduce((s, e) => s + e.debit, 0);
  const totalCredit = entries.reduce((s, e) => s + e.credit, 0);

  res.json({ entries, summary: { totalDebit, totalCredit, balance: totalDebit - totalCredit } });
});

export default router;
