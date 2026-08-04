import { Router } from "express";
import { db, salesReturnsTable, purchaseReturnsTable, productsTable, productVariantsTable, stockTransactionsTable } from "@workspace/db";
import { eq, sql, and, count } from "drizzle-orm";
import { requireResolvedCompany, resolveCompanyId } from "../middlewares/auth";

const router = Router();
const toNum = (v: any) => v != null ? Number(v) : 0;

router.get("/sales-returns", requireResolvedCompany, async (req, res) => {
  const companyId = resolveCompanyId(req);
  if (!companyId) { res.status(403).json({ error: "Company required" }); return; }
  const rows = await db.select().from(salesReturnsTable).where(eq(salesReturnsTable.companyId, companyId)).orderBy(sql`${salesReturnsTable.createdAt} DESC`);
  res.json(rows.map(r => ({ ...r, total: toNum(r.total), subtotal: toNum(r.subtotal), items: Array.isArray(r.items) ? r.items : [] })));
});

router.post("/sales-returns", requireResolvedCompany, async (req, res) => {
  const companyId = resolveCompanyId(req);
  if (!companyId) { res.status(403).json({ error: "Company required" }); return; }
  const data = req.body;
  const items = (data.items ?? []) as Array<any>;
  const subtotal = items.reduce((s: number, i: any) => s + Number(i.amount ?? 0), 0);
  const gstRate = Number(data.gstRate ?? 0);
  const isInterstate = data.isInterstate === true;
  const gstAmount = (subtotal * gstRate) / 100;
  const cgst = isInterstate ? 0 : gstAmount / 2;
  const sgst = isInterstate ? 0 : gstAmount / 2;
  const igst = isInterstate ? gstAmount : 0;
  const total = subtotal + gstAmount;

  const cnt = await db.select({ c: count() }).from(salesReturnsTable).where(eq(salesReturnsTable.companyId, companyId));
  const num = ((cnt[0]?.c ?? 0) + 1).toString().padStart(4, "0");
  const returnNumber = `SR-${new Date().getFullYear()}-${num}`;

  const [row] = await db.insert(salesReturnsTable).values({
    companyId, returnNumber,
    originalInvoiceId: data.originalInvoiceId || null,
    originalInvoiceNumber: data.originalInvoiceNumber || null,
    customerId: data.customerId || null,
    customerName: data.customerName || null,
    returnDate: data.returnDate || new Date().toISOString().split("T")[0],
    reason: data.reason || null,
    items: items as any,
    subtotal: String(subtotal),
    cgst: String(cgst), sgst: String(sgst), igst: String(igst),
    total: String(total),
    status: data.status || "approved",
    notes: data.notes || null,
  }).returning();

  for (const item of items) {
    const pid = Number(item.productId);
    const qty = Number(item.quantity);
    if (item.productId && qty > 0) {
      const [owned] = await db.select({ id: productsTable.id }).from(productsTable)
        .where(and(eq(productsTable.id, pid), eq(productsTable.companyId, companyId))).limit(1);
      if (!owned) continue;
      await db.execute(sql`UPDATE lb_products SET current_stock = current_stock + ${qty} WHERE id = ${pid} AND company_id = ${companyId}`);
      // Variant update inside ownership block — no unguarded variant mutations.
      if (item.variantId) {
        await db.execute(sql`UPDATE lb_product_variants SET current_stock = current_stock + ${qty} WHERE id = ${Number(item.variantId)} AND company_id = ${companyId}`);
      }
      const [p] = await db.select({ currentStock: productsTable.currentStock }).from(productsTable)
        .where(and(eq(productsTable.id, pid), eq(productsTable.companyId, companyId))).limit(1);
      await db.insert(stockTransactionsTable).values({ companyId: companyId!, productId: pid, variantId: item.variantId ? Number(item.variantId) : undefined, type: "return_in", quantityChange: qty, balanceAfter: p?.currentStock ?? 0, refType: "return", refId: row.id, userId: (req as any).auth?.userId }).catch(() => {/* non-blocking */});
    }
  }

  res.status(201).json({ ...row, total: toNum(row.total), subtotal: toNum(row.subtotal), items });
});

router.get("/sales-returns/:id", requireResolvedCompany, async (req, res) => {
  const companyId = resolveCompanyId(req);
  const [row] = await db.select().from(salesReturnsTable).where(and(eq(salesReturnsTable.id, parseInt(req.params.id as string)), eq(salesReturnsTable.companyId, companyId!))).limit(1);
  if (!row) { res.status(404).json({ error: "Not found" }); return; }
  res.json({ ...row, total: toNum(row.total), subtotal: toNum(row.subtotal), items: Array.isArray(row.items) ? row.items : [] });
});

router.patch("/sales-returns/:id", requireResolvedCompany, async (req, res) => {
  const companyId = resolveCompanyId(req);
  const allowed = ["status","notes","reason"];
  const update: any = {};
  for (const k of allowed) if (req.body[k] !== undefined) update[k] = req.body[k];
  const [row] = await db.update(salesReturnsTable).set(update).where(and(eq(salesReturnsTable.id, parseInt(req.params.id as string)), eq(salesReturnsTable.companyId, companyId!))).returning();
  if (!row) { res.status(404).json({ error: "Not found" }); return; }
  res.json({ ...row, total: toNum(row.total) });
});

router.delete("/sales-returns/:id", requireResolvedCompany, async (req, res) => {
  const companyId = resolveCompanyId(req);
  const returnId = parseInt(req.params.id as string);

  // Fetch before deletion so we can reverse the stock that was added when this return was created.
  const [ret] = await db.select().from(salesReturnsTable).where(and(eq(salesReturnsTable.id, returnId), eq(salesReturnsTable.companyId, companyId!))).limit(1);
  if (ret) {
    const items = Array.isArray(ret.items) ? (ret.items as Array<any>) : [];
    for (const item of items) {
      const pid = Number(item.productId);
      const qty = Number(item.quantity);
      if (item.productId && qty > 0) {
        const [owned] = await db.select({ id: productsTable.id }).from(productsTable)
          .where(and(eq(productsTable.id, pid), eq(productsTable.companyId, companyId!))).limit(1);
        if (!owned) continue;
        // Reverse: remove what was added back when the return was recorded
        await db.execute(sql`UPDATE lb_products SET current_stock = GREATEST(0, current_stock - ${qty}) WHERE id = ${pid} AND company_id = ${companyId}`);
        if (item.variantId) {
          await db.execute(sql`UPDATE lb_product_variants SET current_stock = GREATEST(0, current_stock - ${qty}) WHERE id = ${Number(item.variantId)} AND company_id = ${companyId}`);
        }
        const [p] = await db.select({ currentStock: productsTable.currentStock }).from(productsTable)
          .where(and(eq(productsTable.id, pid), eq(productsTable.companyId, companyId!))).limit(1);
        await db.insert(stockTransactionsTable).values({ companyId: companyId!, productId: pid, variantId: item.variantId ? Number(item.variantId) : undefined, type: "adjustment", quantityChange: -qty, balanceAfter: p?.currentStock ?? 0, refType: "return", refId: returnId, notes: "Sales return deleted — stock reversal", userId: (req as any).auth?.userId }).catch(() => {/* non-blocking */});
      }
    }
  }

  await db.delete(salesReturnsTable).where(and(eq(salesReturnsTable.id, returnId), eq(salesReturnsTable.companyId, companyId!)));
  res.sendStatus(204);
});

router.get("/purchase-returns", requireResolvedCompany, async (req, res) => {
  const companyId = resolveCompanyId(req);
  if (!companyId) { res.status(403).json({ error: "Company required" }); return; }
  const rows = await db.select().from(purchaseReturnsTable).where(eq(purchaseReturnsTable.companyId, companyId)).orderBy(sql`${purchaseReturnsTable.createdAt} DESC`);
  res.json(rows.map(r => ({ ...r, total: toNum(r.total), subtotal: toNum(r.subtotal), items: Array.isArray(r.items) ? r.items : [] })));
});

router.post("/purchase-returns", requireResolvedCompany, async (req, res) => {
  const companyId = resolveCompanyId(req);
  if (!companyId) { res.status(403).json({ error: "Company required" }); return; }
  const data = req.body;
  const items = (data.items ?? []) as Array<any>;
  const subtotal = items.reduce((s: number, i: any) => s + Number(i.amount ?? 0), 0);
  const gstRate = Number(data.gstRate ?? 0);
  const isInterstate = data.isInterstate === true;
  const gstAmount = (subtotal * gstRate) / 100;
  const cgst = isInterstate ? 0 : gstAmount / 2;
  const sgst = isInterstate ? 0 : gstAmount / 2;
  const igst = isInterstate ? gstAmount : 0;
  const total = subtotal + gstAmount;

  const cnt = await db.select({ c: count() }).from(purchaseReturnsTable).where(eq(purchaseReturnsTable.companyId, companyId));
  const num = ((cnt[0]?.c ?? 0) + 1).toString().padStart(4, "0");
  const returnNumber = `PR-${new Date().getFullYear()}-${num}`;

  const [row] = await db.insert(purchaseReturnsTable).values({
    companyId, returnNumber,
    originalPurchaseId: data.originalPurchaseId || null,
    originalBillNumber: data.originalBillNumber || null,
    supplierId: data.supplierId || null,
    supplierName: data.supplierName || null,
    returnDate: data.returnDate || new Date().toISOString().split("T")[0],
    reason: data.reason || null,
    items: items as any,
    subtotal: String(subtotal),
    cgst: String(cgst), sgst: String(sgst), igst: String(igst),
    total: String(total),
    status: data.status || "approved",
    notes: data.notes || null,
  }).returning();

  for (const item of items) {
    const pid = Number(item.productId);
    const qty = Number(item.quantity);
    if (item.productId && qty > 0) {
      const [owned] = await db.select({ id: productsTable.id }).from(productsTable)
        .where(and(eq(productsTable.id, pid), eq(productsTable.companyId, companyId))).limit(1);
      if (!owned) continue;
      await db.execute(sql`UPDATE lb_products SET current_stock = GREATEST(0, current_stock - ${qty}) WHERE id = ${pid} AND company_id = ${companyId}`);
      // Variant update inside ownership block — no unguarded variant mutations.
      if (item.variantId) {
        await db.execute(sql`UPDATE lb_product_variants SET current_stock = GREATEST(0, current_stock - ${qty}) WHERE id = ${Number(item.variantId)} AND company_id = ${companyId}`);
      }
      const [p] = await db.select({ currentStock: productsTable.currentStock }).from(productsTable)
        .where(and(eq(productsTable.id, pid), eq(productsTable.companyId, companyId))).limit(1);
      await db.insert(stockTransactionsTable).values({ companyId: companyId!, productId: pid, variantId: item.variantId ? Number(item.variantId) : undefined, type: "return_out", quantityChange: -qty, balanceAfter: p?.currentStock ?? 0, refType: "return", refId: row.id, userId: (req as any).auth?.userId }).catch(() => {/* non-blocking */});
    }
  }

  res.status(201).json({ ...row, total: toNum(row.total), subtotal: toNum(row.subtotal), items });
});

router.get("/purchase-returns/:id", requireResolvedCompany, async (req, res) => {
  const companyId = resolveCompanyId(req);
  const [row] = await db.select().from(purchaseReturnsTable).where(and(eq(purchaseReturnsTable.id, parseInt(req.params.id as string)), eq(purchaseReturnsTable.companyId, companyId!))).limit(1);
  if (!row) { res.status(404).json({ error: "Not found" }); return; }
  res.json({ ...row, total: toNum(row.total), subtotal: toNum(row.subtotal), items: Array.isArray(row.items) ? row.items : [] });
});

router.patch("/purchase-returns/:id", requireResolvedCompany, async (req, res) => {
  const companyId = resolveCompanyId(req);
  const allowed = ["status","notes","reason"];
  const update: any = {};
  for (const k of allowed) if (req.body[k] !== undefined) update[k] = req.body[k];
  const [row] = await db.update(purchaseReturnsTable).set(update).where(and(eq(purchaseReturnsTable.id, parseInt(req.params.id as string)), eq(purchaseReturnsTable.companyId, companyId!))).returning();
  if (!row) { res.status(404).json({ error: "Not found" }); return; }
  res.json({ ...row, total: toNum(row.total) });
});

router.delete("/purchase-returns/:id", requireResolvedCompany, async (req, res) => {
  const companyId = resolveCompanyId(req);
  const returnId = parseInt(req.params.id as string);

  // Fetch before deletion so we can reverse the stock that was deducted when this return was created.
  const [ret] = await db.select().from(purchaseReturnsTable).where(and(eq(purchaseReturnsTable.id, returnId), eq(purchaseReturnsTable.companyId, companyId!))).limit(1);
  if (ret) {
    const items = Array.isArray(ret.items) ? (ret.items as Array<any>) : [];
    for (const item of items) {
      const pid = Number(item.productId);
      const qty = Number(item.quantity);
      if (item.productId && qty > 0) {
        const [owned] = await db.select({ id: productsTable.id }).from(productsTable)
          .where(and(eq(productsTable.id, pid), eq(productsTable.companyId, companyId!))).limit(1);
        if (!owned) continue;
        // Reverse: add back what was deducted when the purchase return was recorded
        await db.execute(sql`UPDATE lb_products SET current_stock = current_stock + ${qty} WHERE id = ${pid} AND company_id = ${companyId}`);
        if (item.variantId) {
          await db.execute(sql`UPDATE lb_product_variants SET current_stock = current_stock + ${qty} WHERE id = ${Number(item.variantId)} AND company_id = ${companyId}`);
        }
        const [p] = await db.select({ currentStock: productsTable.currentStock }).from(productsTable)
          .where(and(eq(productsTable.id, pid), eq(productsTable.companyId, companyId!))).limit(1);
        await db.insert(stockTransactionsTable).values({ companyId: companyId!, productId: pid, variantId: item.variantId ? Number(item.variantId) : undefined, type: "adjustment", quantityChange: qty, balanceAfter: p?.currentStock ?? 0, refType: "return", refId: returnId, notes: "Purchase return deleted — stock reversal", userId: (req as any).auth?.userId }).catch(() => {/* non-blocking */});
      }
    }
  }

  await db.delete(purchaseReturnsTable).where(and(eq(purchaseReturnsTable.id, returnId), eq(purchaseReturnsTable.companyId, companyId!)));
  res.sendStatus(204);
});

export default router;
