import { Router } from "express";
import { db, purchaseOrdersTable, productsTable, suppliersTable, stockTransactionsTable } from "@workspace/db";
import { eq, sql, and, count, sum } from "drizzle-orm";
import { requireResolvedCompany, resolveCompanyId } from "../middlewares/auth";

const router = Router();
const toNum = (v: any) => v != null ? Number(v) : 0;

router.get("/purchase-orders/summary", requireResolvedCompany, async (req, res) => {
  const companyId = resolveCompanyId(req);
  if (!companyId) { res.status(403).json({ error: "Company required" }); return; }
  const rows = await db.select().from(purchaseOrdersTable).where(eq(purchaseOrdersTable.companyId, companyId));
  const totalOrders = rows.length;
  const totalValue = rows.reduce((s, r) => s + toNum(r.total), 0);
  const pending = rows.filter(r => r.paymentStatus === "pending").length;
  const paid = rows.filter(r => r.paymentStatus === "paid").length;
  const monthStart = new Date(new Date().getFullYear(), new Date().getMonth(), 1).toISOString().split("T")[0];
  const thisMonth = rows
    .filter(r => r.billDate >= monthStart)
    .reduce((s, r) => s + toNum(r.total), 0);
  res.json({ totalOrders, totalValue, pending, pendingCount: pending, paid, thisMonth });
});

router.get("/purchase-orders", requireResolvedCompany, async (req, res) => {
  const companyId = resolveCompanyId(req);
  if (!companyId) { res.status(403).json({ error: "Company required" }); return; }
  const rows = await db.select().from(purchaseOrdersTable).where(eq(purchaseOrdersTable.companyId, companyId)).orderBy(sql`${purchaseOrdersTable.createdAt} DESC`);
  res.json(rows.map(r => ({ ...r, subtotal: toNum(r.subtotal), cgst: toNum(r.cgst), sgst: toNum(r.sgst), igst: toNum(r.igst), total: toNum(r.total), items: Array.isArray(r.items) ? r.items : [] })));
});

router.post("/purchase-orders", requireResolvedCompany, async (req, res) => {
  const companyId = resolveCompanyId(req);
  if (!companyId) { res.status(403).json({ error: "Company required" }); return; }
  const data = req.body;
  const items = (data.items ?? []) as Array<any>;
  const subtotal = items.reduce((s: number, i: any) => s + Number(i.amount ?? 0), 0);
  const gstRate = Number(data.gstRate ?? 18);
  const gstAmount = (subtotal * gstRate) / 100;
  const cgst = data.isInterstate ? 0 : gstAmount / 2;
  const sgst = data.isInterstate ? 0 : gstAmount / 2;
  const igst = data.isInterstate ? gstAmount : 0;
  const total = subtotal + gstAmount;

  const cnt = await db.select({ c: count() }).from(purchaseOrdersTable).where(eq(purchaseOrdersTable.companyId, companyId));
  const num = ((cnt[0]?.c ?? 0) + 1).toString().padStart(4, "0");
  const billNumber = data.billNumber || `BILL-${new Date().getFullYear()}-${num}`;
  const billDate = data.billDate || new Date().toISOString().split("T")[0];

  const [row] = await db.insert(purchaseOrdersTable).values({ companyId, supplierId: data.supplierId || null, supplierName: data.supplierName, billNumber, billDate, items: items as any, subtotal: String(subtotal), cgst: String(cgst), sgst: String(sgst), igst: String(igst), total: String(total), paymentStatus: data.paymentStatus || "pending", notes: data.notes }).returning();

  for (const item of items) {
    const pid = Number(item.productId);
    const qty = Number(item.quantity);
    if (item.productId && qty > 0) {
      // Ownership check: skip items referencing another tenant's product
      const [owned] = await db.select({ id: productsTable.id }).from(productsTable)
        .where(and(eq(productsTable.id, pid), eq(productsTable.companyId, companyId))).limit(1);
      if (!owned) continue;
      await db.execute(sql`UPDATE lb_products SET current_stock = current_stock + ${qty} WHERE id = ${pid} AND company_id = ${companyId}`);
      // Also update variant stock for consistency with the sales/returns flow
      if (item.variantId) {
        await db.execute(sql`UPDATE lb_product_variants SET current_stock = current_stock + ${qty} WHERE id = ${Number(item.variantId)} AND company_id = ${companyId}`);
      }
      const [p] = await db.select({ currentStock: productsTable.currentStock }).from(productsTable)
        .where(and(eq(productsTable.id, pid), eq(productsTable.companyId, companyId))).limit(1);
      await db.insert(stockTransactionsTable).values({ companyId: companyId!, productId: pid, variantId: item.variantId ? Number(item.variantId) : undefined, type: "purchase", quantityChange: qty, balanceAfter: p?.currentStock ?? 0, refType: "purchase_order", refId: row.id, userId: (req as any).auth?.userId }).catch(() => {/* non-blocking */});
    }
  }

  res.status(201).json({ ...row, subtotal: toNum(row.subtotal), cgst: toNum(row.cgst), sgst: toNum(row.sgst), igst: toNum(row.igst), total: toNum(row.total), items });
});

router.get("/purchase-orders/:id", requireResolvedCompany, async (req, res) => {
  const companyId = resolveCompanyId(req);
  const [row] = await db.select().from(purchaseOrdersTable).where(and(eq(purchaseOrdersTable.id, parseInt(req.params.id as string)), eq(purchaseOrdersTable.companyId, companyId!))).limit(1);
  if (!row) { res.status(404).json({ error: "Not found" }); return; }
  res.json({ ...row, subtotal: toNum(row.subtotal), total: toNum(row.total), items: Array.isArray(row.items) ? row.items : [] });
});

router.patch("/purchase-orders/:id", requireResolvedCompany, async (req, res) => {
  const companyId = resolveCompanyId(req);
  const orderId = parseInt(req.params.id as string);
  const allowed = ["supplierId","supplierName","billNumber","billDate","items","subtotal","cgst","sgst","igst","total","paymentStatus","notes"];
  const update: any = {};
  for (const k of allowed) if (req.body[k] !== undefined) update[k] = req.body[k];

  // If items are being updated, adjust stock: reverse old quantities, apply new ones.
  if (update.items !== undefined) {
    const [existing] = await db.select().from(purchaseOrdersTable).where(and(eq(purchaseOrdersTable.id, orderId), eq(purchaseOrdersTable.companyId, companyId!))).limit(1);
    if (!existing) { res.status(404).json({ error: "Not found" }); return; }
    // Step 1: Reverse stock for old items
    const oldItems = Array.isArray(existing.items) ? (existing.items as Array<any>) : [];
    for (const item of oldItems) {
      const pid = Number(item.productId);
      const qty = Number(item.quantity);
      if (item.productId && qty > 0) {
        const [owned] = await db.select({ id: productsTable.id }).from(productsTable)
          .where(and(eq(productsTable.id, pid), eq(productsTable.companyId, companyId!))).limit(1);
        if (!owned) continue;
        await db.execute(sql`UPDATE lb_products SET current_stock = GREATEST(0, current_stock - ${qty}) WHERE id = ${pid} AND company_id = ${companyId}`);
        if (item.variantId) {
          await db.execute(sql`UPDATE lb_product_variants SET current_stock = GREATEST(0, current_stock - ${qty}) WHERE id = ${Number(item.variantId)} AND company_id = ${companyId}`);
        }
      }
    }
    // Step 2: Apply new items
    const newItems = Array.isArray(update.items) ? (update.items as Array<any>) : [];
    for (const item of newItems) {
      const pid = Number(item.productId);
      const qty = Number(item.quantity);
      if (item.productId && qty > 0) {
        const [owned] = await db.select({ id: productsTable.id }).from(productsTable)
          .where(and(eq(productsTable.id, pid), eq(productsTable.companyId, companyId!))).limit(1);
        if (!owned) continue;
        await db.execute(sql`UPDATE lb_products SET current_stock = current_stock + ${qty} WHERE id = ${pid} AND company_id = ${companyId}`);
        if (item.variantId) {
          await db.execute(sql`UPDATE lb_product_variants SET current_stock = current_stock + ${qty} WHERE id = ${Number(item.variantId)} AND company_id = ${companyId}`);
        }
        const [p] = await db.select({ currentStock: productsTable.currentStock }).from(productsTable)
          .where(and(eq(productsTable.id, pid), eq(productsTable.companyId, companyId!))).limit(1);
        await db.insert(stockTransactionsTable).values({ companyId: companyId!, productId: pid, variantId: item.variantId ? Number(item.variantId) : undefined, type: "purchase", quantityChange: qty, balanceAfter: p?.currentStock ?? 0, refType: "purchase_order", refId: orderId, notes: "Purchase edited", userId: (req as any).auth?.userId }).catch(() => {/* non-blocking */});
      }
    }
  }

  const [row] = await db.update(purchaseOrdersTable).set(update).where(and(eq(purchaseOrdersTable.id, orderId), eq(purchaseOrdersTable.companyId, companyId!))).returning();
  if (!row) { res.status(404).json({ error: "Not found" }); return; }
  res.json({ ...row, total: toNum(row.total) });
});

router.delete("/purchase-orders/:id", requireResolvedCompany, async (req, res) => {
  const companyId = resolveCompanyId(req);
  const orderId = parseInt(req.params.id as string);

  // Fetch order before deletion so we can reverse its stock impact.
  const [order] = await db.select().from(purchaseOrdersTable).where(and(eq(purchaseOrdersTable.id, orderId), eq(purchaseOrdersTable.companyId, companyId!))).limit(1);
  if (order) {
    const items = Array.isArray(order.items) ? (order.items as Array<any>) : [];
    for (const item of items) {
      const pid = Number(item.productId);
      const qty = Number(item.quantity);
      if (item.productId && qty > 0) {
        const [owned] = await db.select({ id: productsTable.id }).from(productsTable)
          .where(and(eq(productsTable.id, pid), eq(productsTable.companyId, companyId!))).limit(1);
        if (!owned) continue;
        // Reverse: subtract what was added on purchase
        await db.execute(sql`UPDATE lb_products SET current_stock = GREATEST(0, current_stock - ${qty}) WHERE id = ${pid} AND company_id = ${companyId}`);
        if (item.variantId) {
          await db.execute(sql`UPDATE lb_product_variants SET current_stock = GREATEST(0, current_stock - ${qty}) WHERE id = ${Number(item.variantId)} AND company_id = ${companyId}`);
        }
        const [p] = await db.select({ currentStock: productsTable.currentStock }).from(productsTable)
          .where(and(eq(productsTable.id, pid), eq(productsTable.companyId, companyId!))).limit(1);
        await db.insert(stockTransactionsTable).values({ companyId: companyId!, productId: pid, variantId: item.variantId ? Number(item.variantId) : undefined, type: "adjustment", quantityChange: -qty, balanceAfter: p?.currentStock ?? 0, refType: "purchase_order", refId: orderId, notes: "Purchase deleted — stock reversed", userId: (req as any).auth?.userId }).catch(() => {/* non-blocking */});
      }
    }
  }

  await db.delete(purchaseOrdersTable).where(and(eq(purchaseOrdersTable.id, orderId), eq(purchaseOrdersTable.companyId, companyId!)));
  res.sendStatus(204);
});

export default router;
