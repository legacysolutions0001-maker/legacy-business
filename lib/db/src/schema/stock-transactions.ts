import { pgTable, text, serial, timestamp, integer, index } from "drizzle-orm/pg-core";
import { createInsertSchema } from "drizzle-zod";
import { z } from "zod";
import { companiesTable } from "./companies";
import { productsTable } from "./products";

// Immutable ledger of every stock movement (purchase receipt, sale,
// return, manual adjustment). Complements `lb_stock_batches` (current batch
// state) by giving an append-only audit trail: what changed, by how much,
// why, and what the running balance was afterward.
export const stockTransactionsTable = pgTable("lb_stock_transactions", {
  id: serial("id").primaryKey(),
  companyId: integer("company_id").notNull().references(() => companiesTable.id),
  productId: integer("product_id").notNull().references(() => productsTable.id),
  variantId: integer("variant_id"),
  batchId: integer("batch_id"),
  type: text("type").notNull(), // purchase | sale | return_in | return_out | adjustment | opening
  quantityChange: integer("quantity_change").notNull(), // positive = stock in, negative = stock out
  balanceAfter: integer("balance_after").notNull(),
  refType: text("ref_type"), // invoice | purchase_order | return | manual
  refId: integer("ref_id"),
  notes: text("notes"),
  userId: integer("user_id"),
  createdAt: timestamp("created_at", { withTimezone: true }).notNull().defaultNow(),
}, (t) => [
  index("idx_stock_txn_company").on(t.companyId),
  index("idx_stock_txn_product").on(t.productId),
  index("idx_stock_txn_created").on(t.createdAt),
]);

export const insertStockTransactionSchema = createInsertSchema(stockTransactionsTable).omit({ id: true, createdAt: true });
export type InsertStockTransaction = z.infer<typeof insertStockTransactionSchema>;
export type StockTransaction = typeof stockTransactionsTable.$inferSelect;
