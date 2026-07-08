import { pgTable, text, serial, timestamp, numeric, integer, index } from "drizzle-orm/pg-core";
import { createInsertSchema } from "drizzle-zod";
import { z } from "zod/v4";
import { companiesTable } from "./companies";
import { productsTable } from "./products";

export const stockBatchesTable = pgTable("lb_stock_batches", {
  id: serial("id").primaryKey(),
  companyId: integer("company_id").notNull().references(() => companiesTable.id),
  productId: integer("product_id").notNull().references(() => productsTable.id),
  variantId: integer("variant_id"),
  batchNumber: text("batch_number"),
  quantityReceived: integer("quantity_received").notNull().default(0),
  currentQty: integer("current_qty").notNull().default(0),
  purchasePrice: numeric("purchase_price", { precision: 12, scale: 2 }).notNull().default("0"),
  sellingPrice: numeric("selling_price", { precision: 12, scale: 2 }).notNull().default("0"),
  manufacturingDate: text("manufacturing_date"),
  expiryDate: text("expiry_date"),
  warehouse: text("warehouse"),
  isActive: integer("is_active").notNull().default(1),
  notes: text("notes"),
  createdAt: timestamp("created_at", { withTimezone: true }).notNull().defaultNow(),
  updatedAt: timestamp("updated_at", { withTimezone: true }).notNull().defaultNow().$onUpdate(() => new Date()),
}, (t) => [
  index("idx_stock_batches_company").on(t.companyId),
  index("idx_stock_batches_product").on(t.productId),
  index("idx_stock_batches_variant").on(t.variantId),
]);

export const insertStockBatchSchema = createInsertSchema(stockBatchesTable).omit({ id: true, createdAt: true, updatedAt: true });
export type InsertStockBatch = z.infer<typeof insertStockBatchSchema>;
export type StockBatch = typeof stockBatchesTable.$inferSelect;
