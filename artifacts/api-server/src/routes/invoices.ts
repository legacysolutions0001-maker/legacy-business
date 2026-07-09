import { Router } from "express";
import { db, invoicesTable, customersTable, paymentsTable, productsTable, productVariantsTable, stockTransactionsTable } from "@workspace/db";
import { eq, sql, and, count, sum } from "drizzle-orm";
import { requireAuth } from "../middlewares/auth";

const router = Router();
const toNum = (v: any) => v != null ? Number(v) : 0;

router.get("/invoices/summary", requireAuth, async (req, res) => {
  const companyId = req.auth!.companyId;
  if (!companyId) { res.status(403).json({ error: "Company required" }); return; }
  const rows = await db.select({ status: invoicesTable.paymentStatus, total: sum(invoicesTable.total), cnt: count() }).from(invoicesTable).where(eq(invoicesTable.companyId, companyId)).groupBy(invoicesTable.paymentStatus);
  const get = (s: string) => rows.find(r => r.status === s);
  res.json({ totalPaid: toNum(get("paid")?.total), totalPending: toNum(get("pending")?.total), countPaid: get("paid")?.cnt ?? 0, countPending: get("pending")?.cnt ?? 0 });
});

router.get("/invoices", requireAuth, async (req, res) => {
  const companyId = req.auth!.companyId;
  if (!companyId) { res.status(403).json({ error: "Company required" }); return; }
  const { status, type } = req.query as { status?: string; type?: string };
  let conditions: any = eq(invoicesTable.companyId, companyId);
  if (status) conditions = and(eq(invoicesTable.companyId, companyId), eq(invoicesTable.paymentStatus, status));
  if (type) conditions = and(eq(invoicesTable.companyId, companyId), eq(invoicesTable.invoiceType, type));
  if (status && type) conditions = and(eq(invoicesTable.companyId, companyId), eq(invoicesTable.paymentStatus, status), eq(invoicesTable.invoiceType, type));
  const rows = await db.select().from(invoicesTable).where(conditions).orderBy(sql`${invoicesTable.createdAt} DESC`);
  res.json(rows.map(r => ({ ...r, subtotal: toNum(r.subtotal), cgst: toNum(r.cgst), sgst: toNum(r.sgst), igst: toNum(r.igst), total: toNum(r.total), items: Array.isArray(r.items) ? r.items : [] })));
});

router.post("/invoices", requireAuth, async (req, res) => {
  const companyId = req.auth!.companyId;
  if (!companyId) { res.status(403).json({ error: "Company required" }); return; }
  const data = req.body;
  const items = (data.items ?? []) as Array<any>;
  const discountAmount = Number(data.discountAmount ?? 0);
  const isInterstate = data.isInterstate === true;

  // Two-pass GST calculation:
  // Pass 1: compute total subtotal for discount apportionment
  const totalSubtotal = items.reduce((s: number, item: any) => s + Number(item.amount ?? 0), 0);

  // Pass 2: per-item GST with proportional discount
  let totalCgst = 0;
  let totalSgst = 0;
  let totalIgst = 0;

  for (const item of items) {
    const itemAmount = Number(item.amount ?? 0);
    const itemGstRate = Number(item.gstRate ?? data.gstRate ?? 18);
    const itemDiscount = discountAmount > 0 && totalSubtotal > 0
      ? (itemAmount / totalSubtotal) * discountAmount
      : 0;
    const taxable = itemAmount - itemDiscount;
    const gstAmount = (taxable * itemGstRate) / 100;
    totalCgst += isInterstate ? 0 : gstAmount / 2;
    totalSgst += isInterstate ? 0 : gstAmount / 2;
    totalIgst += isInterstate ? gstAmount : 0;
  }

  const taxableTotal = totalSubtotal - discountAmount;
  const totalGst = totalCgst + totalSgst + totalIgst;
  const rawTotal = taxableTotal + totalGst;
  const roundOff = Math.round(rawTotal) - rawTotal;
  const total = Math.round(rawTotal);

  const cnt = await db.select({ c: count() }).from(invoicesTable).where(eq(invoicesTable.companyId, companyId));
  const num = ((cnt[0]?.c ?? 0) + 1).toString().padStart(4, "0");
  const year = new Date().getFullYear();
  const prefix = data.invoiceType === "quotation" ? "QT"
    : data.invoiceType === "credit_note" ? "CN"
    : data.invoiceType === "debit_note" ? "DN"
    : data.invoiceType === "purchase" ? "PUR"
    : data.invoiceType === "proforma_invoice" ? "PRO"
    : "INV";
  const invoiceNumber = `${prefix}-${year}-${num}`;

  const [row] = await db.insert(invoicesTable).values({
    companyId, invoiceNumber, invoiceType: data.invoiceType || "gst_invoice",
    customerId: data.customerId || null, customerName: data.customerName, customerGst: data.customerGst, customerAddress: data.customerAddress,
    status: data.status || "draft", invoiceDate: data.invoiceDate || new Date().toISOString().split("T")[0], dueDate: data.dueDate,
    items: items as any, subtotal: String(totalSubtotal), discountAmount: String(discountAmount),
    cgst: String(totalCgst), sgst: String(totalSgst), igst: String(totalIgst), roundOff: String(roundOff), total: String(total),
    paymentMethod: data.paymentMethod, paymentStatus: data.paymentStatus || "pending", notes: data.notes, termsConditions: data.termsConditions,
  }).returning();

  if ((data.paymentStatus === "paid" || data.status === "paid") && data.customerId) {
    await db.execute(sql`UPDATE lb_customers SET total_revenue = COALESCE(total_revenue, 0) + ${total} WHERE id = ${data.customerId} AND company_id = ${companyId}`);
    await db.insert(paymentsTable).values({ companyId, invoiceId: row.id, entityType: "customer", entityId: data.customerId, entityName: data.customerName, amount: String(total), method: data.paymentMethod || "cash", paidAt: data.invoiceDate || new Date().toISOString().split("T")[0] });
  }

  // Update stock — use GREATEST(0,...) to avoid negative stock; log each movement.
  // Only process items whose productId actually belongs to this company to prevent
  // cross-tenant data leakage in the ledger.
  for (const item of items) {
    const pid = Number(item.productId);
    const qty = Number(item.quantity);
    if (item.productId && qty > 0) {
      // Ownership check: skip items referencing another tenant's product
      const [owned] = await db.select({ id: productsTable.id }).from(productsTable)
        .where(and(eq(productsTable.id, pid), eq(productsTable.companyId, companyId))).limit(1);
      if (!owned) continue;
      await db.execute(sql`UPDATE lb_products SET current_stock = GREATEST(0, current_stock - ${qty}) WHERE id = ${pid} AND company_id = ${companyId}`);
      const [p] = await db.select({ currentStock: productsTable.currentStock }).from(productsTable)
        .where(and(eq(productsTable.id, pid), eq(productsTable.companyId, companyId))).limit(1);
      await db.insert(stockTransactionsTable).values({ companyId, productId: pid, variantId: item.variantId ? Number(item.variantId) : null, type: "sale", quantityChange: -qty, balanceAfter: p?.currentStock ?? 0, refType: "invoice", refId: row.id, userId: req.auth!.userId }).catch(() => {/* non-blocking */});
    }
    if (item.variantId && qty > 0) {
      await db.execute(sql`UPDATE lb_product_variants SET current_stock = GREATEST(0, current_stock - ${qty}) WHERE id = ${Number(item.variantId)} AND company_id = ${companyId}`);
    }
  }

  res.status(201).json({ ...row, subtotal: toNum(row.subtotal), cgst: toNum(row.cgst), sgst: toNum(row.sgst), igst: toNum(row.igst), total: toNum(row.total), items });
});

router.get("/invoices/:id", requireAuth, async (req, res) => {
  const companyId = req.auth!.companyId;
  const id = parseInt(req.params.id as string);
  if (isNaN(id)) { res.status(400).json({ error: "Invalid id" }); return; }
  const [row] = await db.select().from(invoicesTable).where(and(eq(invoicesTable.id, id), eq(invoicesTable.companyId, companyId!))).limit(1);
  if (!row) { res.status(404).json({ error: "Not found" }); return; }
  res.json({ ...row, subtotal: toNum(row.subtotal), cgst: toNum(row.cgst), sgst: toNum(row.sgst), igst: toNum(row.igst), total: toNum(row.total), items: Array.isArray(row.items) ? row.items : [] });
});

router.patch("/invoices/:id", requireAuth, async (req, res) => {
  const companyId = req.auth!.companyId;
  const id = parseInt(req.params.id as string);
  if (isNaN(id)) { res.status(400).json({ error: "Invalid id" }); return; }
  const allowed = ["invoiceType","customerId","customerName","customerGst","customerAddress","status","invoiceDate","dueDate","items","subtotal","discountAmount","cgst","sgst","igst","roundOff","total","paymentMethod","paymentStatus","notes","termsConditions"];
  const update: any = {};
  for (const k of allowed) if (req.body[k] !== undefined) update[k] = req.body[k];
  const [row] = await db.update(invoicesTable).set(update).where(and(eq(invoicesTable.id, id), eq(invoicesTable.companyId, companyId!))).returning();
  if (!row) { res.status(404).json({ error: "Not found" }); return; }
  res.json({ ...row, subtotal: toNum(row.subtotal), cgst: toNum(row.cgst), sgst: toNum(row.sgst), igst: toNum(row.igst), total: toNum(row.total), items: Array.isArray(row.items) ? row.items : [] });
});

router.delete("/invoices/:id", requireAuth, async (req, res) => {
  const companyId = req.auth!.companyId;
  const id = parseInt(req.params.id as string);
  if (isNaN(id)) { res.status(400).json({ error: "Invalid id" }); return; }
  await db.delete(invoicesTable).where(and(eq(invoicesTable.id, id), eq(invoicesTable.companyId, companyId!)));
  res.sendStatus(204);
});

router.post("/invoices/:id/whatsapp", requireAuth, async (req, res) => {
  const companyId = req.auth!.companyId;
  const id = parseInt(req.params.id as string);
  if (isNaN(id)) { res.status(400).json({ error: "Invalid id" }); return; }
  const [inv] = await db.select().from(invoicesTable).where(and(eq(invoicesTable.id, id), eq(invoicesTable.companyId, companyId!))).limit(1);
  if (!inv) { res.status(404).json({ error: "Invoice not found" }); return; }

  const waPhoneId = process.env.WHATSAPP_PHONE_NUMBER_ID;
  const waToken = process.env.WHATSAPP_ACCESS_TOKEN;
  const { phone } = req.body;

  if (!waPhoneId || !waToken) {
    res.status(503).json({ error: "WhatsApp not configured. Add WHATSAPP_PHONE_NUMBER_ID and WHATSAPP_ACCESS_TOKEN to environment variables." });
    return;
  }
  if (!phone) { res.status(400).json({ error: "Phone number required" }); return; }

  const cleanPhone = phone.replace(/[^0-9]/g, "");
  const message = `Hello! Please find your invoice *${inv.invoiceNumber}* for ₹${Number(inv.total).toLocaleString("en-IN")}.\n\nDate: ${inv.invoiceDate}\nStatus: ${inv.paymentStatus?.toUpperCase()}\n\n_Legacy Business ERP_`;

  try {
    const resp = await fetch(`https://graph.facebook.com/v18.0/${waPhoneId}/messages`, {
      method: "POST",
      headers: { "Authorization": `Bearer ${waToken}`, "Content-Type": "application/json" },
      body: JSON.stringify({
        messaging_product: "whatsapp",
        to: cleanPhone,
        type: "text",
        text: { body: message }
      })
    });
    const result = await resp.json();
    if (!resp.ok) { res.status(400).json({ error: (result as any).error?.message || "WhatsApp send failed" }); return; }
    res.json({ success: true, messageId: (result as any).messages?.[0]?.id });
  } catch (e: any) {
    res.status(500).json({ error: e.message });
  }
});

export default router;
