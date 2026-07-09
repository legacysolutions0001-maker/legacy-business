import { Router } from "express";
import { db, stockTransactionsTable, productsTable } from "@workspace/db";
import { eq, and, desc } from "drizzle-orm";
import { requireAuth } from "../middlewares/auth";

const router = Router();

const VALID_TYPES = new Set(["purchase", "sale", "return_in", "return_out", "adjustment", "opening"]);

// GET /stock-transactions?productId=&type=&limit=&offset=
router.get("/stock-transactions", requireAuth, async (req, res) => {
  const companyId = req.auth!.companyId;
  if (!companyId) { res.status(403).json({ error: "Company required" }); return; }

  const { productId, type, limit: limitStr, offset: offsetStr } = req.query as {
    productId?: string; type?: string; limit?: string; offset?: string;
  };

  const pageSize = Math.min(500, Math.max(10, parseInt(limitStr || "100") || 100));
  const pageOffset = Math.max(0, parseInt(offsetStr || "0") || 0);

  if (type && !VALID_TYPES.has(type)) {
    res.status(400).json({ error: `type must be one of: ${[...VALID_TYPES].join(", ")}` }); return;
  }

  const pidNum = productId ? parseInt(productId) : NaN;
  if (productId && isNaN(pidNum)) { res.status(400).json({ error: "Invalid productId" }); return; }

  let cond: any = eq(stockTransactionsTable.companyId, companyId);
  if (!isNaN(pidNum)) cond = and(cond, eq(stockTransactionsTable.productId, pidNum));
  if (type) cond = and(cond, eq(stockTransactionsTable.type, type));

  const rows = await db
    .select({
      id: stockTransactionsTable.id,
      companyId: stockTransactionsTable.companyId,
      productId: stockTransactionsTable.productId,
      variantId: stockTransactionsTable.variantId,
      batchId: stockTransactionsTable.batchId,
      type: stockTransactionsTable.type,
      quantityChange: stockTransactionsTable.quantityChange,
      balanceAfter: stockTransactionsTable.balanceAfter,
      refType: stockTransactionsTable.refType,
      refId: stockTransactionsTable.refId,
      notes: stockTransactionsTable.notes,
      userId: stockTransactionsTable.userId,
      createdAt: stockTransactionsTable.createdAt,
      productName: productsTable.name,
    })
    .from(stockTransactionsTable)
    .leftJoin(productsTable, eq(stockTransactionsTable.productId, productsTable.id))
    .where(cond)
    .orderBy(desc(stockTransactionsTable.createdAt))
    .limit(pageSize)
    .offset(pageOffset);

  res.json(rows);
});

// GET /stock-transactions/product/:productId — movement ledger for one product
router.get("/stock-transactions/product/:productId", requireAuth, async (req, res) => {
  const companyId = req.auth!.companyId;
  if (!companyId) { res.status(403).json({ error: "Company required" }); return; }
  const productId = parseInt(req.params.productId as string);
  if (isNaN(productId)) { res.status(400).json({ error: "Invalid productId" }); return; }

  // Verify the product belongs to this company before returning its ledger
  const [owned] = await db.select({ id: productsTable.id }).from(productsTable)
    .where(and(eq(productsTable.id, productId), eq(productsTable.companyId, companyId)))
    .limit(1);
  if (!owned) { res.status(404).json({ error: "Product not found" }); return; }

  const rows = await db
    .select()
    .from(stockTransactionsTable)
    .where(and(eq(stockTransactionsTable.companyId, companyId), eq(stockTransactionsTable.productId, productId)))
    .orderBy(desc(stockTransactionsTable.createdAt))
    .limit(200);

  res.json(rows);
});

export default router;
