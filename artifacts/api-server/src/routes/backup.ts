import { Router } from "express";
import { db } from "@workspace/db";
import { sql } from "drizzle-orm";
import { requireResolvedCompany, resolveCompanyId } from "../middlewares/auth";

const router = Router();

router.get("/backup/export", requireResolvedCompany, async (req, res) => {
  const companyId = resolveCompanyId(req);
  if (!companyId) { res.status(403).json({ error: "Company required" }); return; }

  try {
    const tables = [
      { name: "products", query: sql`SELECT * FROM lb_products WHERE company_id = ${companyId}` },
      { name: "product_variants", query: sql`SELECT * FROM lb_product_variants WHERE company_id = ${companyId}` },
      { name: "customers", query: sql`SELECT * FROM lb_customers WHERE company_id = ${companyId}` },
      { name: "suppliers", query: sql`SELECT * FROM lb_suppliers WHERE company_id = ${companyId}` },
      { name: "invoices", query: sql`SELECT * FROM lb_invoices WHERE company_id = ${companyId}` },
      { name: "purchase_orders", query: sql`SELECT * FROM lb_purchase_orders WHERE company_id = ${companyId}` },
      { name: "sales_returns", query: sql`SELECT * FROM lb_sales_returns WHERE company_id = ${companyId}` },
      { name: "purchase_returns", query: sql`SELECT * FROM lb_purchase_returns WHERE company_id = ${companyId}` },
      { name: "employees", query: sql`SELECT * FROM lb_employees WHERE company_id = ${companyId}` },
      { name: "attendance", query: sql`SELECT * FROM lb_attendance WHERE company_id = ${companyId}` },
      { name: "salary_records", query: sql`SELECT * FROM lb_salary_records WHERE company_id = ${companyId}` },
      { name: "payments", query: sql`SELECT * FROM lb_payments WHERE company_id = ${companyId}` },
      { name: "eway_bills", query: sql`SELECT * FROM lb_eway_bills WHERE company_id = ${companyId}` },
      { name: "daybook", query: sql`SELECT * FROM lb_daybook WHERE company_id = ${companyId}` },
      { name: "cash_bank_ledger", query: sql`SELECT * FROM lb_cash_bank_ledger WHERE company_id = ${companyId}` },
      { name: "company_settings", query: sql`SELECT * FROM lb_legacy_business_settings WHERE company_id = ${companyId}` },
      { name: "stock_batches", query: sql`SELECT * FROM lb_stock_batches WHERE company_id = ${companyId}` },
    ];

    const backup: Record<string, any[]> = {};
    for (const t of tables) {
      try {
        const result = await db.execute(t.query);
        backup[t.name] = result.rows as any[];
      } catch {
        backup[t.name] = [];
      }
    }

    // Fixed: db.execute returns {rows}, not a single row
    const companyResult = await db.execute(sql`SELECT * FROM lb_companies WHERE id = ${companyId}`);
    backup["company"] = companyResult.rows as any[];

    const exportData = {
      exportedAt: new Date().toISOString(),
      companyId,
      version: "2.0",
      data: backup,
    };

    const json = JSON.stringify(exportData, null, 2);
    const date = new Date().toISOString().split("T")[0];
    res.setHeader("Content-Type", "application/json");
    res.setHeader("Content-Disposition", `attachment; filename="legacy-erp-backup-${date}.json"`);
    res.send(json);
  } catch (e: any) {
    res.status(500).json({ error: e.message });
  }
});

router.post("/backup/restore", requireResolvedCompany, async (req, res) => {
  const companyId = resolveCompanyId(req);
  if (!companyId) { res.status(403).json({ error: "Company required" }); return; }

  const { data, confirm } = req.body;
  if (!confirm || confirm !== "RESTORE") {
    res.status(400).json({ error: "Send confirm: 'RESTORE' to proceed with restore" });
    return;
  }
  if (!data || typeof data !== "object") {
    res.status(400).json({ error: "Invalid backup data" });
    return;
  }

  const RESTORABLE = [
    "customers", "suppliers", "products", "product_variants",
    "employees", "daybook", "company_settings"
  ];

  const results: Record<string, { inserted: number; errors: string[] }> = {};

  for (const tableName of RESTORABLE) {
    const rows = data[tableName];
    if (!Array.isArray(rows) || rows.length === 0) continue;
    results[tableName] = { inserted: 0, errors: [] };
    for (const row of rows) {
      try {
        const sanitized = { ...row, company_id: companyId, id: undefined };
        delete sanitized.id;
        delete sanitized.created_at;
        delete sanitized.updated_at;
        const cols = Object.keys(sanitized).filter(k => sanitized[k] !== undefined);
        const vals = cols.map(c => sanitized[c]);
        const colStr = cols.map(c => `"${c}"`).join(", ");
        const valPlaceholders = cols.map((_, i) => `$${i + 1}`).join(", ");
        await db.execute(sql.raw(`INSERT INTO ${tableName} (${colStr}) VALUES (${valPlaceholders}) ON CONFLICT DO NOTHING`));
        results[tableName].inserted++;
      } catch (e: any) {
        results[tableName].errors.push(e.message);
      }
    }
  }

  res.json({ success: true, results });
});

router.get("/backup/export-csv", requireResolvedCompany, async (req, res) => {
  const companyId = resolveCompanyId(req);
  if (!companyId) { res.status(403).json({ error: "Company required" }); return; }
  const { table } = req.query as { table?: string };

  const TABLE_MAP: Record<string, string> = {
    products: 'lb_products',
    invoices: 'lb_invoices',
    customers: 'lb_customers',
    suppliers: 'lb_suppliers',
    purchase_orders: 'lb_purchase_orders',
    employees: 'lb_employees',
    salary_records: 'lb_salary_records',
    daybook: 'lb_daybook',
    payments: 'lb_payments',
    stock_batches: 'lb_stock_batches',
  };
  if (!table || !TABLE_MAP[table]) {
    res.status(400).json({ error: 'Invalid table. Allowed: ' + Object.keys(TABLE_MAP).join(', ') });
    return;
  }
  const dbTable = TABLE_MAP[table];

  try {
    const result = await db.execute(sql`SELECT * FROM ${sql.raw(dbTable)} WHERE company_id = ${companyId}`);
    const rows = result.rows as any[];
    if (rows.length === 0) { res.status(200).send("No data"); return; }
    const headers = Object.keys(rows[0]).join(",");
    const csvRows = rows.map(r => Object.values(r).map(v => v === null ? "" : typeof v === "string" ? `"${v.replace(/"/g, '""')}"` : v).join(","));
    const csv = [headers, ...csvRows].join("\n");
    const date = new Date().toISOString().split("T")[0];
    res.setHeader("Content-Type", "text/csv");
    res.setHeader("Content-Disposition", `attachment; filename="${table}-${date}.csv"`);
    res.send(csv);
  } catch (e: any) {
    res.status(500).json({ error: e.message });
  }
});

export default router;
