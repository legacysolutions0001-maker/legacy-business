import { Router } from "express";
import { db, productsTable, productVariantsTable, stockBatchesTable, stockTransactionsTable } from "@workspace/db";
import { eq, ilike, sql, and, desc, count, or, inArray } from "drizzle-orm";
import { requireResolvedCompany, resolveCompanyId } from "../middlewares/auth";

const router = Router();
const toNum = (v: any) => v != null ? Number(v) : null;

async function getLatestBatchPrice(companyId: number, productId: number, variantId: number | null) {
  const cond = variantId != null
    ? and(eq(stockBatchesTable.companyId, companyId), eq(stockBatchesTable.productId, productId), eq(stockBatchesTable.variantId, variantId), eq(stockBatchesTable.isActive, 1))
    : and(eq(stockBatchesTable.companyId, companyId), eq(stockBatchesTable.productId, productId), sql`${stockBatchesTable.variantId} IS NULL`, eq(stockBatchesTable.isActive, 1));
  const batches = await db.select().from(stockBatchesTable).where(cond).orderBy(desc(stockBatchesTable.createdAt)).limit(1);
  if (!batches.length) return { sellingPrice: null, purchasePrice: null, batchNumber: null, expiryDate: null };
  return { sellingPrice: toNum(batches[0].sellingPrice), purchasePrice: toNum(batches[0].purchasePrice), batchNumber: batches[0].batchNumber, expiryDate: batches[0].expiryDate };
}

router.get("/inventory/summary", requireResolvedCompany, async (req, res) => {
  const companyId = resolveCompanyId(req);
  if (!companyId) { res.status(403).json({ error: "Company required" }); return; }
  const [total, lowStock, outOfStock, totalValue] = await Promise.all([
    db.select({ count: count() }).from(productsTable).where(eq(productsTable.companyId, companyId)),
    db.execute(sql`SELECT COUNT(*) as cnt FROM lb_products WHERE company_id = ${companyId} AND current_stock <= min_stock AND current_stock > 0`),
    db.execute(sql`SELECT COUNT(*) as cnt FROM lb_products WHERE company_id = ${companyId} AND current_stock = 0`),
    db.execute(sql`SELECT COALESCE(SUM(selling_price::numeric * current_stock), 0) as val FROM lb_products WHERE company_id = ${companyId}`),
  ]);
  res.json({ totalProducts: total[0]?.count ?? 0, lowStockCount: Number((lowStock.rows[0] as any)?.cnt ?? 0), outOfStock: Number((outOfStock.rows[0] as any)?.cnt ?? 0), totalValue: Number((totalValue.rows[0] as any)?.val ?? 0) });
});

router.get("/products/low-stock", requireResolvedCompany, async (req, res): Promise<void> => {
  const companyId = resolveCompanyId(req);
  if (!companyId) { res.status(403).json({ error: "Company required" }); return; }
  const rows = await db.select().from(productsTable)
    .where(and(eq(productsTable.companyId, companyId), sql`current_stock <= min_stock`))
    .orderBy(sql`${productsTable.createdAt} DESC`);
  res.json(rows.map(r => ({ ...r, sellingPrice: toNum(r.sellingPrice), purchasePrice: toNum(r.purchasePrice), gstRate: toNum(r.gstRate) })));
});

router.get("/products/search", requireResolvedCompany, async (req, res) => {
  const companyId = resolveCompanyId(req);
  if (!companyId) { res.status(403).json({ error: "Company required" }); return; }
  const { q } = req.query as { q?: string };
  if (!q || !q.trim()) { res.json([]); return; }
  const term = `%${q.trim()}%`;

  const products = await db.select().from(productsTable)
    .where(and(eq(productsTable.companyId, companyId), or(ilike(productsTable.name, term), ilike(productsTable.barcode, term), ilike(productsTable.brand, term), ilike(productsTable.technicalName, term))))
    .orderBy(productsTable.name).limit(30);

  const results: any[] = [];
  for (const p of products) {
    const variants = await db.select().from(productVariantsTable)
      .where(and(eq(productVariantsTable.productId, p.id), eq(productVariantsTable.isActive, 1)));
    if (variants.length > 0) {
      for (const v of variants) {
        const batch = await getLatestBatchPrice(companyId, p.id, v.id);
        results.push({ productId: p.id, variantId: v.id, name: `${p.name} ${v.variantName}`, productName: p.name, variantName: v.variantName, size: v.size, sizeUnit: v.sizeUnit, barcode: v.barcode || p.barcode, hsnCode: p.hsnCode, gstRate: toNum(p.gstRate), sellingPrice: batch.sellingPrice ?? toNum(v.sellingPrice), purchasePrice: batch.purchasePrice ?? toNum(v.purchasePrice), batchNumber: batch.batchNumber, expiryDate: batch.expiryDate ?? v.expiryDate, currentStock: v.currentStock, unit: p.unit, brand: p.brand, type: "variant", hasBatchPrice: batch.sellingPrice != null });
      }
    } else {
      const batch = await getLatestBatchPrice(companyId, p.id, null);
      results.push({ productId: p.id, variantId: null, name: p.name, productName: p.name, variantName: null, barcode: p.barcode, hsnCode: p.hsnCode, gstRate: toNum(p.gstRate), sellingPrice: batch.sellingPrice ?? toNum(p.sellingPrice), purchasePrice: batch.purchasePrice ?? toNum(p.purchasePrice), batchNumber: batch.batchNumber, expiryDate: batch.expiryDate ?? p.expiryDate, currentStock: p.currentStock, unit: p.unit, brand: p.brand, type: "product", hasBatchPrice: batch.sellingPrice != null });
    }
  }

  if (q.trim().length >= 2) {
    const variantMatches = await db.select().from(productVariantsTable)
      .where(and(eq(productVariantsTable.companyId, companyId), eq(productVariantsTable.isActive, 1), or(ilike(productVariantsTable.variantName, term), ilike(productVariantsTable.barcode, term)))).limit(20);
    for (const v of variantMatches) {
      if (results.some(r => r.variantId === v.id)) continue;
      const [p] = await db.select().from(productsTable).where(eq(productsTable.id, v.productId)).limit(1);
      if (!p) continue;
      const batch = await getLatestBatchPrice(companyId, p.id, v.id);
      results.push({ productId: p.id, variantId: v.id, name: `${p.name} ${v.variantName}`, productName: p.name, variantName: v.variantName, size: v.size, sizeUnit: v.sizeUnit, barcode: v.barcode || p.barcode, hsnCode: p.hsnCode, gstRate: toNum(p.gstRate), sellingPrice: batch.sellingPrice ?? toNum(v.sellingPrice), purchasePrice: batch.purchasePrice ?? toNum(v.purchasePrice), batchNumber: batch.batchNumber, expiryDate: batch.expiryDate ?? v.expiryDate, currentStock: v.currentStock, unit: p.unit, brand: p.brand, type: "variant", hasBatchPrice: batch.sellingPrice != null });
    }
  }
  res.json(results);
});

router.get("/products/barcode/:barcode", requireResolvedCompany, async (req, res) => {
  const companyId = resolveCompanyId(req);
  if (!companyId) { res.status(403).json({ error: "Company required" }); return; }
  const barcode = req.params.barcode as string;
  const variant = await db.select().from(productVariantsTable)
    .where(and(eq(productVariantsTable.companyId, companyId), eq(productVariantsTable.barcode, barcode))).limit(1);
  if (variant.length > 0) {
    const v = variant[0];
    const [p] = await db.select().from(productsTable).where(eq(productsTable.id, v.productId)).limit(1);
    const batch = await getLatestBatchPrice(companyId, p?.id ?? v.productId, v.id);
    res.json({ productId: p?.id, variantId: v.id, name: `${p?.name || ""} ${v.variantName}`, productName: p?.name, variantName: v.variantName, size: v.size, sizeUnit: v.sizeUnit, barcode: v.barcode, hsnCode: p?.hsnCode, gstRate: toNum(p?.gstRate), sellingPrice: batch.sellingPrice ?? toNum(v.sellingPrice), purchasePrice: batch.purchasePrice ?? toNum(v.purchasePrice), batchNumber: batch.batchNumber, expiryDate: batch.expiryDate ?? v.expiryDate, currentStock: v.currentStock, unit: p?.unit, brand: p?.brand, type: "variant", hasBatchPrice: batch.sellingPrice != null });
    return;
  }
  const [product] = await db.select().from(productsTable)
    .where(and(eq(productsTable.companyId, companyId), eq(productsTable.barcode, barcode as string))).limit(1);
  if (!product) { res.status(404).json({ error: "Product not found" }); return; }
  const batch = await getLatestBatchPrice(companyId, product.id, null);
  res.json({ ...product, sellingPrice: batch.sellingPrice ?? toNum(product.sellingPrice), purchasePrice: batch.purchasePrice ?? toNum(product.purchasePrice), batchNumber: batch.batchNumber, expiryDate: batch.expiryDate ?? product.expiryDate, gstRate: toNum(product.gstRate), type: "product", hasBatchPrice: batch.sellingPrice != null });
});

router.get("/stock-batches", requireResolvedCompany, async (req, res) => {
  const companyId = resolveCompanyId(req);
  if (!companyId) { res.status(403).json({ error: "Company required" }); return; }
  const { productId, variantId } = req.query;
  let cond: any = eq(stockBatchesTable.companyId, companyId);
  if (productId) cond = and(cond, eq(stockBatchesTable.productId, parseInt(productId as string)));
  if (variantId) cond = and(cond, eq(stockBatchesTable.variantId, parseInt(variantId as string)));
  const rows = await db.select({ id: stockBatchesTable.id, companyId: stockBatchesTable.companyId, productId: stockBatchesTable.productId, variantId: stockBatchesTable.variantId, batchNumber: stockBatchesTable.batchNumber, quantityReceived: stockBatchesTable.quantityReceived, currentQty: stockBatchesTable.currentQty, purchasePrice: stockBatchesTable.purchasePrice, sellingPrice: stockBatchesTable.sellingPrice, manufacturingDate: stockBatchesTable.manufacturingDate, expiryDate: stockBatchesTable.expiryDate, warehouse: stockBatchesTable.warehouse, isActive: stockBatchesTable.isActive, notes: stockBatchesTable.notes, createdAt: stockBatchesTable.createdAt, productName: productsTable.name, productUnit: productsTable.unit })
    .from(stockBatchesTable).leftJoin(productsTable, eq(stockBatchesTable.productId, productsTable.id)).where(cond).orderBy(desc(stockBatchesTable.createdAt)).limit(200);
  const enriched = await Promise.all(rows.map(async r => {
    let variantName: string | null = null;
    if (r.variantId) {
      const [v] = await db.select().from(productVariantsTable).where(eq(productVariantsTable.id, r.variantId)).limit(1);
      variantName = v ? `${v.variantName}${v.size ? ` (${v.size}${v.sizeUnit || ""})` : ""}` : null;
    }
    return { ...r, purchasePrice: toNum(r.purchasePrice), sellingPrice: toNum(r.sellingPrice), variantName };
  }));
  res.json(enriched);
});

router.post("/stock-batches", requireResolvedCompany, async (req, res) => {
  const companyId = resolveCompanyId(req);
  if (!companyId) { res.status(403).json({ error: "Company required" }); return; }
  const { productId, variantId, quantityReceived, purchasePrice, sellingPrice, batchNumber, manufacturingDate, expiryDate, warehouse, notes } = req.body;
  if (!productId || !quantityReceived || Number(quantityReceived) <= 0) { res.status(400).json({ error: "productId and quantityReceived required" }); return; }
  // Reject batches against a product/variant that doesn't belong to this
  // company — otherwise a caller could attach stock records to another
  // tenant's product by guessing its id.
  const [ownedProduct] = await db.select({ id: productsTable.id }).from(productsTable).where(and(eq(productsTable.id, Number(productId)), eq(productsTable.companyId, companyId))).limit(1);
  if (!ownedProduct) { res.status(404).json({ error: "Product not found" }); return; }
  if (variantId) {
    const [ownedVariant] = await db.select({ id: productVariantsTable.id }).from(productVariantsTable).where(and(eq(productVariantsTable.id, Number(variantId)), eq(productVariantsTable.companyId, companyId))).limit(1);
    if (!ownedVariant) { res.status(404).json({ error: "Variant not found" }); return; }
  }
  const [batch] = await db.insert(stockBatchesTable).values({ companyId, productId: Number(productId), variantId: variantId ? Number(variantId) : null, quantityReceived: Number(quantityReceived), currentQty: Number(quantityReceived), purchasePrice: String(purchasePrice ?? 0), sellingPrice: String(sellingPrice ?? 0), batchNumber: batchNumber || null, manufacturingDate: manufacturingDate || null, expiryDate: expiryDate || null, warehouse: warehouse || null, notes: notes || null, isActive: 1 }).returning();
  if (variantId) {
    await db.execute(sql`UPDATE lb_product_variants SET current_stock = current_stock + ${Number(quantityReceived)}, selling_price = ${String(sellingPrice ?? 0)}, purchase_price = ${String(purchasePrice ?? 0)}, batch_number = ${batchNumber || null}, expiry_date = ${expiryDate || null} WHERE id = ${Number(variantId)} AND company_id = ${companyId}`);
    await db.execute(sql`UPDATE lb_products SET current_stock = current_stock + ${Number(quantityReceived)} WHERE id = ${Number(productId)} AND company_id = ${companyId}`);
  } else {
    await db.execute(sql`UPDATE lb_products SET current_stock = current_stock + ${Number(quantityReceived)}, selling_price = ${String(sellingPrice ?? 0)}, purchase_price = ${String(purchasePrice ?? 0)}, batch_number = ${batchNumber || null}, expiry_date = ${expiryDate || null} WHERE id = ${Number(productId)} AND company_id = ${companyId}`);
  }
  const [p] = await db.select({ currentStock: productsTable.currentStock }).from(productsTable).where(eq(productsTable.id, Number(productId))).limit(1);
  await db.insert(stockTransactionsTable).values({ companyId, productId: Number(productId), variantId: variantId ? Number(variantId) : null, batchId: batch.id, type: "purchase", quantityChange: Number(quantityReceived), balanceAfter: p?.currentStock ?? Number(quantityReceived), refType: "manual", notes: notes || null, userId: req.auth!.userId }).catch(() => {/* non-blocking */});
  res.status(201).json({ ...batch, purchasePrice: toNum(batch.purchasePrice), sellingPrice: toNum(batch.sellingPrice) });
});

router.patch("/stock-batches/:id", requireResolvedCompany, async (req, res) => {
  const companyId = resolveCompanyId(req);
  const update: any = { ...req.body };
  if (update.sellingPrice != null) update.sellingPrice = String(update.sellingPrice);
  if (update.purchasePrice != null) update.purchasePrice = String(update.purchasePrice);
  const [row] = await db.update(stockBatchesTable).set(update).where(and(eq(stockBatchesTable.id, parseInt(req.params.id as string)), eq(stockBatchesTable.companyId, companyId!))).returning();
  if (!row) { res.status(404).json({ error: "Not found" }); return; }
  res.json({ ...row, sellingPrice: toNum(row.sellingPrice), purchasePrice: toNum(row.purchasePrice) });
});

router.get("/products", requireResolvedCompany, async (req, res) => {
  const companyId = resolveCompanyId(req);
  if (!companyId) { res.status(403).json({ error: "Company required" }); return; }
  const { search, category, barcode, lowStock, page, limit: limitStr } = req.query as { search?: string; category?: string; barcode?: string; lowStock?: string; page?: string; limit?: string };
  const pageNum = Math.max(1, parseInt(page || "1"));
  const pageSize = Math.min(200, Math.max(10, parseInt(limitStr || "100")));
  const offset = (pageNum - 1) * pageSize;

  let query = db.select().from(productsTable).where(eq(productsTable.companyId, companyId)).$dynamic();
  if (barcode) query = query.where(and(eq(productsTable.companyId, companyId), eq(productsTable.barcode, barcode)));
  else if (category) query = query.where(and(eq(productsTable.companyId, companyId), eq(productsTable.category, category)));
  else if (search) query = query.where(and(eq(productsTable.companyId, companyId), or(ilike(productsTable.name, `%${search}%`), ilike(productsTable.brand, `%${search}%`), ilike(productsTable.barcode, `%${search}%`))));
  else if (lowStock === "true") query = query.where(and(eq(productsTable.companyId, companyId), sql`current_stock <= min_stock`));

  const rows = await query.orderBy(sql`${productsTable.createdAt} DESC`).limit(pageSize).offset(offset);

  // Batch-fetch all variants for the returned products in 1 query instead of N queries
  const productIds = rows.map(p => p.id);
  const allVariants = productIds.length > 0
    ? await db.select().from(productVariantsTable).where(and(inArray(productVariantsTable.productId, productIds), eq(productVariantsTable.isActive, 1)))
    : [];

  const variantsByProduct: Record<number, any[]> = {};
  for (const v of allVariants) {
    if (!variantsByProduct[v.productId]) variantsByProduct[v.productId] = [];
    variantsByProduct[v.productId].push(v);
  }

  const productsWithVariants = rows.map(p => ({
    ...p,
    sellingPrice: toNum(p.sellingPrice),
    purchasePrice: toNum(p.purchasePrice),
    gstRate: toNum(p.gstRate),
    variants: (variantsByProduct[p.id] || []).map(v => ({ ...v, sellingPrice: toNum(v.sellingPrice), purchasePrice: toNum(v.purchasePrice) }))
  }));

  res.json(productsWithVariants);
});

router.post("/products", requireResolvedCompany, async (req, res) => {
  const companyId = resolveCompanyId(req);
  if (!companyId) { res.status(403).json({ error: "Company required" }); return; }
  const { variants: variantsInput, ...rest } = req.body;
  const data = { ...rest, companyId, sellingPrice: String(rest.sellingPrice ?? 0), purchasePrice: rest.purchasePrice != null ? String(rest.purchasePrice) : null, gstRate: String(rest.gstRate ?? 18), currentStock: Number(rest.openingStock ?? 0), openingStock: Number(rest.openingStock ?? 0) };
  const [row] = await db.insert(productsTable).values(data).returning();
  if (Array.isArray(variantsInput) && variantsInput.length > 0) {
    for (const v of variantsInput) {
      await db.insert(productVariantsTable).values({ companyId, productId: row.id, variantName: v.variantName || `${v.size}${v.sizeUnit || ""}`, size: v.size || null, sizeUnit: v.sizeUnit || null, packaging: v.packaging || null, barcode: v.barcode || null, sku: v.sku || null, purchasePrice: String(v.purchasePrice ?? 0), sellingPrice: String(v.sellingPrice ?? 0), currentStock: Number(v.currentStock ?? 0), minStock: Number(v.minStock ?? 5), batchNumber: v.batchNumber || null, expiryDate: v.expiryDate || null, isActive: 1 });
    }
  }
  const variants = await db.select().from(productVariantsTable).where(eq(productVariantsTable.productId, row.id));
  res.status(201).json({ ...row, sellingPrice: toNum(row.sellingPrice), purchasePrice: toNum(row.purchasePrice), gstRate: toNum(row.gstRate), variants });
});

router.get("/products/:id", requireResolvedCompany, async (req, res) => {
  const companyId = resolveCompanyId(req);
  const [row] = await db.select().from(productsTable).where(and(eq(productsTable.id, parseInt(req.params.id as string)), eq(productsTable.companyId, companyId!))).limit(1);
  if (!row) { res.status(404).json({ error: "Not found" }); return; }
  const variants = await db.select().from(productVariantsTable).where(eq(productVariantsTable.productId, row.id));
  res.json({ ...row, sellingPrice: toNum(row.sellingPrice), purchasePrice: toNum(row.purchasePrice), gstRate: toNum(row.gstRate), variants: variants.map(v => ({ ...v, sellingPrice: toNum(v.sellingPrice), purchasePrice: toNum(v.purchasePrice) })) });
});

router.patch("/products/:id", requireResolvedCompany, async (req, res) => {
  const companyId = resolveCompanyId(req);
  const { variants: _, ...rest } = req.body;
  const update: any = { ...rest };
  if (update.sellingPrice != null) update.sellingPrice = String(update.sellingPrice);
  if (update.purchasePrice != null) update.purchasePrice = String(update.purchasePrice);
  if (update.gstRate != null) update.gstRate = String(update.gstRate);
  const [row] = await db.update(productsTable).set(update).where(and(eq(productsTable.id, parseInt(req.params.id as string)), eq(productsTable.companyId, companyId!))).returning();
  if (!row) { res.status(404).json({ error: "Not found" }); return; }
  const variants = await db.select().from(productVariantsTable).where(eq(productVariantsTable.productId, row.id));
  res.json({ ...row, sellingPrice: toNum(row.sellingPrice), purchasePrice: toNum(row.purchasePrice), gstRate: toNum(row.gstRate), variants: variants.map(v => ({ ...v, sellingPrice: toNum(v.sellingPrice), purchasePrice: toNum(v.purchasePrice) })) });
});

router.delete("/products/:id", requireResolvedCompany, async (req, res) => {
  const companyId = resolveCompanyId(req);
  if (!companyId) { res.status(403).json({ error: "Company required" }); return; }
  const productId = parseInt(req.params.id as string);
  await db.delete(productVariantsTable).where(and(eq(productVariantsTable.productId, productId), eq(productVariantsTable.companyId, companyId)));
  await db.delete(stockBatchesTable).where(and(eq(stockBatchesTable.productId, productId), eq(stockBatchesTable.companyId, companyId)));
  await db.delete(productsTable).where(and(eq(productsTable.id, productId), eq(productsTable.companyId, companyId)));
  res.sendStatus(204);
});

router.get("/product-variants/:productId", requireResolvedCompany, async (req, res) => {
  const companyId = resolveCompanyId(req);
  const variants = await db.select().from(productVariantsTable)
    .where(and(eq(productVariantsTable.productId, parseInt(req.params.productId as string)), eq(productVariantsTable.companyId, companyId!)));
  res.json(variants.map(v => ({ ...v, sellingPrice: toNum(v.sellingPrice), purchasePrice: toNum(v.purchasePrice) })));
});

router.post("/product-variants", requireResolvedCompany, async (req, res) => {
  const companyId = resolveCompanyId(req);
  if (!companyId) { res.status(403).json({ error: "Company required" }); return; }
  const d = req.body;
  // Same ownership check as /stock-batches: don't let a variant be attached
  // to a product owned by a different company.
  const [ownedProduct] = await db.select({ id: productsTable.id }).from(productsTable).where(and(eq(productsTable.id, Number(d.productId)), eq(productsTable.companyId, companyId))).limit(1);
  if (!ownedProduct) { res.status(404).json({ error: "Product not found" }); return; }
  const [row] = await db.insert(productVariantsTable).values({ companyId, productId: d.productId, variantName: d.variantName || `${d.size}${d.sizeUnit || ""}`, size: d.size || null, sizeUnit: d.sizeUnit || null, packaging: d.packaging || null, barcode: d.barcode || null, sku: d.sku || null, purchasePrice: String(d.purchasePrice ?? 0), sellingPrice: String(d.sellingPrice ?? 0), currentStock: Number(d.currentStock ?? 0), minStock: Number(d.minStock ?? 5), batchNumber: d.batchNumber || null, expiryDate: d.expiryDate || null, isActive: 1 }).returning();
  res.status(201).json({ ...row, sellingPrice: toNum(row.sellingPrice), purchasePrice: toNum(row.purchasePrice) });
});

router.patch("/product-variants/:id", requireResolvedCompany, async (req, res) => {
  const companyId = resolveCompanyId(req);
  const update: any = { ...req.body };
  if (update.sellingPrice != null) update.sellingPrice = String(update.sellingPrice);
  if (update.purchasePrice != null) update.purchasePrice = String(update.purchasePrice);
  const [row] = await db.update(productVariantsTable).set(update).where(and(eq(productVariantsTable.id, parseInt(req.params.id as string)), eq(productVariantsTable.companyId, companyId!))).returning();
  if (!row) { res.status(404).json({ error: "Not found" }); return; }
  res.json({ ...row, sellingPrice: toNum(row.sellingPrice), purchasePrice: toNum(row.purchasePrice) });
});

router.delete("/product-variants/:id", requireResolvedCompany, async (req, res) => {
  const companyId = resolveCompanyId(req);
  await db.delete(productVariantsTable).where(and(eq(productVariantsTable.id, parseInt(req.params.id as string)), eq(productVariantsTable.companyId, companyId!)));
  res.sendStatus(204);
});

export default router;
