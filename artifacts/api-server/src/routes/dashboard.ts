import { Router } from "express";
import { db, customersTable, invoicesTable, expensesTable, employeesTable, productsTable, paymentsTable, purchaseOrdersTable } from "@workspace/db";
import { eq, sql, count, sum, and, gte, lte } from "drizzle-orm";
import { requireAuth, requireSuperAdmin } from "../middlewares/auth";
import { companiesTable, usersTable, subscriptionsTable } from "@workspace/db";

const router = Router();

router.get("/dashboard/summary", requireAuth, async (req, res) => {
  const companyId = req.auth!.companyId;
  if (!companyId) { res.status(403).json({ error: "Company required" }); return; }

  const today = new Date().toISOString().split("T")[0];
  const monthStart = new Date(new Date().getFullYear(), new Date().getMonth(), 1).toISOString().split("T")[0];
  const yearStart = `${new Date().getFullYear()}-01-01`;

  const [
    todaySales, monthlySales, yearlySales,
    totalCustomers, totalProducts, lowStockProducts,
    totalEmployees, pendingPayments,
    cashToday, upiToday, cardToday, bankToday,
    monthlyPurchase, todayExpenses,
  ] = await Promise.all([
    db.select({ total: sum(invoicesTable.total) }).from(invoicesTable).where(and(eq(invoicesTable.companyId, companyId), eq(invoicesTable.invoiceDate, today), eq(invoicesTable.paymentStatus, "paid"))),
    db.select({ total: sum(invoicesTable.total) }).from(invoicesTable).where(and(eq(invoicesTable.companyId, companyId), gte(invoicesTable.invoiceDate, monthStart), eq(invoicesTable.paymentStatus, "paid"))),
    db.select({ total: sum(invoicesTable.total) }).from(invoicesTable).where(and(eq(invoicesTable.companyId, companyId), gte(invoicesTable.invoiceDate, yearStart), eq(invoicesTable.paymentStatus, "paid"))),
    db.select({ count: count() }).from(customersTable).where(eq(customersTable.companyId, companyId)),
    db.select({ count: count() }).from(productsTable).where(eq(productsTable.companyId, companyId)),
    db.execute(sql`SELECT COUNT(*) as cnt FROM lb_products WHERE company_id = ${companyId} AND current_stock <= min_stock AND current_stock > 0`),
    db.select({ count: count() }).from(employeesTable).where(eq(employeesTable.companyId, companyId)),
    db.select({ total: sum(invoicesTable.total) }).from(invoicesTable).where(and(eq(invoicesTable.companyId, companyId), eq(invoicesTable.paymentStatus, "pending"))),
    db.select({ total: sum(paymentsTable.amount) }).from(paymentsTable).where(and(eq(paymentsTable.companyId, companyId), eq(paymentsTable.method, "cash"), eq(paymentsTable.paidAt, today))),
    db.select({ total: sum(paymentsTable.amount) }).from(paymentsTable).where(and(eq(paymentsTable.companyId, companyId), eq(paymentsTable.method, "upi"), eq(paymentsTable.paidAt, today))),
    db.select({ total: sum(paymentsTable.amount) }).from(paymentsTable).where(and(eq(paymentsTable.companyId, companyId), eq(paymentsTable.method, "card"), eq(paymentsTable.paidAt, today))),
    db.select({ total: sum(paymentsTable.amount) }).from(paymentsTable).where(and(eq(paymentsTable.companyId, companyId), eq(paymentsTable.method, "net_banking"), eq(paymentsTable.paidAt, today))),
    db.select({ total: sum(purchaseOrdersTable.total) }).from(purchaseOrdersTable).where(and(eq(purchaseOrdersTable.companyId, companyId), gte(purchaseOrdersTable.billDate, monthStart))),
    db.select({ total: sum(expensesTable.amount) }).from(expensesTable).where(and(eq(expensesTable.companyId, companyId), eq(expensesTable.date, today))),
  ]);

  const recentInvoices = await db.select({
    id: invoicesTable.id,
    invoiceNumber: invoicesTable.invoiceNumber,
    customerName: invoicesTable.customerName,
    total: invoicesTable.total,
    paymentStatus: invoicesTable.paymentStatus,
    invoiceDate: invoicesTable.invoiceDate,
  }).from(invoicesTable).where(eq(invoicesTable.companyId, companyId)).orderBy(sql`${invoicesTable.createdAt} DESC`).limit(5);

  const lowStock = await db.select().from(productsTable).where(and(eq(productsTable.companyId, companyId), sql`current_stock <= min_stock`)).limit(5);

  const topCustomers = await db.select({
    id: customersTable.id,
    name: customersTable.name,
    totalRevenue: customersTable.totalRevenue,
    mobile: customersTable.mobile,
  }).from(customersTable).where(eq(customersTable.companyId, companyId)).orderBy(sql`total_revenue DESC NULLS LAST`).limit(5);

  const monthlyRevenue = await db.execute(sql`
    SELECT TO_CHAR(DATE_TRUNC('month', created_at), 'Mon YY') AS label,
           COALESCE(SUM(total::numeric), 0) AS value
    FROM lb_invoices
    WHERE company_id = ${companyId}
      AND payment_status = 'paid'
      AND created_at >= NOW() - INTERVAL '6 months'
    GROUP BY DATE_TRUNC('month', created_at)
    ORDER BY DATE_TRUNC('month', created_at)
  `);

  // Expiry alerts — batches expiring within 90 days (incl. expired), with remaining stock
  let expiringBatches: any[] = [];
  try {
    const result = await db.execute(sql`
      SELECT
        sb.id,
        sb.batch_number      AS "batchNumber",
        sb.expiry_date       AS "expiryDate",
        sb.current_qty       AS "currentQty",
        sb.selling_price     AS "sellingPrice",
        p.name               AS "productName",
        p.id                 AS "productId",
        CASE
          WHEN sb.expiry_date < CURRENT_DATE::text                                       THEN 0
          WHEN sb.expiry_date <= (CURRENT_DATE + INTERVAL '30 days')::text               THEN 1
          WHEN sb.expiry_date <= (CURRENT_DATE + INTERVAL '60 days')::text               THEN 2
          ELSE                                                                                 3
        END AS urgency
      FROM lb_stock_batches sb
      JOIN lb_products p ON sb.product_id = p.id
      WHERE sb.company_id = ${companyId}
        AND sb.is_active = 1
        AND sb.current_qty  > 0
        AND sb.expiry_date IS NOT NULL
        AND sb.expiry_date != ''
        AND sb.expiry_date <= (CURRENT_DATE + INTERVAL '90 days')::text
      ORDER BY urgency ASC, sb.expiry_date ASC
      LIMIT 25
    `);
    expiringBatches = (result.rows as any[]).map(b => ({
      id: b.id,
      batchNumber: b.batchNumber,
      expiryDate: b.expiryDate,
      currentQty: Number(b.currentQty),
      sellingPrice: Number(b.sellingPrice ?? 0),
      productName: b.productName,
      productId: b.productId,
    }));
  } catch {
    // stock_batches table may not exist yet — fail gracefully
    expiringBatches = [];
  }

  res.json({
    todaySales: Number(todaySales[0]?.total ?? 0),
    todayExpenses: Number(todayExpenses[0]?.total ?? 0),
    monthlySales: Number(monthlySales[0]?.total ?? 0),
    yearlySales: Number(yearlySales[0]?.total ?? 0),
    monthlyPurchase: Number(monthlyPurchase[0]?.total ?? 0),
    monthlyProfit: Number(monthlySales[0]?.total ?? 0) - Number(monthlyPurchase[0]?.total ?? 0),
    yearlyProfit: Number(yearlySales[0]?.total ?? 0),
    cashToday: Number(cashToday[0]?.total ?? 0),
    upiToday: Number(upiToday[0]?.total ?? 0),
    cardToday: Number(cardToday[0]?.total ?? 0),
    bankToday: Number(bankToday[0]?.total ?? 0),
    totalCustomers: Number(totalCustomers[0]?.count ?? 0),
    totalProducts: Number(totalProducts[0]?.count ?? 0),
    lowStockCount: Number((lowStockProducts.rows[0] as any)?.cnt ?? 0),
    totalEmployees: Number(totalEmployees[0]?.count ?? 0),
    pendingPayments: Number(pendingPayments[0]?.total ?? 0),
    recentInvoices: recentInvoices.map(i => ({ ...i, total: Number(i.total) })),
    lowStockProducts: lowStock.map(p => ({ ...p, sellingPrice: Number(p.sellingPrice), purchasePrice: p.purchasePrice ? Number(p.purchasePrice) : null })),
    topCustomers: topCustomers.map(c => ({ ...c, totalRevenue: c.totalRevenue ? Number(c.totalRevenue) : 0 })),
    monthlyRevenue: (monthlyRevenue.rows as any[]).map(r => ({ label: r.label, value: Number(r.value) })),
    expiringBatches,
  });
});

router.get("/super/dashboard", requireSuperAdmin, async (req, res) => {
  const [totalCompaniesRows, activeCompaniesRows, expiredCompaniesRows, suspendedCompaniesRows, totalUsersRows] = await Promise.all([
    db.select({ count: count() }).from(companiesTable),
    db.select({ count: count() }).from(companiesTable).where(eq(companiesTable.subscriptionStatus, "active")),
    db.select({ count: count() }).from(companiesTable).where(eq(companiesTable.subscriptionStatus, "expired")),
    db.select({ count: count() }).from(companiesTable).where(eq(companiesTable.subscriptionStatus, "suspended")),
    db.select({ count: count() }).from(usersTable).where(sql`role != 'super_admin'`),
  ]);

  const activeSubscriptionsRows = await db.select({ count: count() }).from(subscriptionsTable).where(eq(subscriptionsTable.status, "active"));

  const revenueChart = await db.execute(sql`
    SELECT TO_CHAR(DATE_TRUNC('month', created_at), 'Mon YY') AS label,
           COALESCE(SUM(amount::numeric), 0) AS value
    FROM lb_subscriptions
    WHERE created_at >= NOW() - INTERVAL '12 months'
    GROUP BY DATE_TRUNC('month', created_at)
    ORDER BY DATE_TRUNC('month', created_at)
  `);

  const recentCompanies = await db.select().from(companiesTable).orderBy(sql`${companiesTable.createdAt} DESC`).limit(5);

  const byPlanRaw = await db.execute(sql`
    SELECT plan as label, COUNT(*) as value FROM lb_companies GROUP BY plan
  `);

  res.json({
    totalCompanies: Number(totalCompaniesRows[0]?.count ?? 0),
    activeCompanies: Number(activeCompaniesRows[0]?.count ?? 0),
    expiredCompanies: Number(expiredCompaniesRows[0]?.count ?? 0),
    suspendedCompanies: Number(suspendedCompaniesRows[0]?.count ?? 0),
    totalUsers: Number(totalUsersRows[0]?.count ?? 0),
    activeSubscriptions: Number(activeSubscriptionsRows[0]?.count ?? 0),
    recentCompanies,
    byPlan: (byPlanRaw.rows as any[]).map(r => ({ label: r.label || "free", value: Number(r.value) })),
    revenueChart: (revenueChart.rows as any[]).map(r => ({ label: r.label, value: Number(r.value) })),
  });
});

export default router;
