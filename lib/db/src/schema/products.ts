import { pgTable, text, serial, timestamp, numeric, integer, index } from "drizzle-orm/pg-core";
import { createInsertSchema } from "drizzle-zod";
import { z } from "zod/v4";
import { companiesTable } from "./companies";

export const productsTable = pgTable("lb_products", {
  id: serial("id").primaryKey(),
  companyId: integer("company_id").notNull().references(() => companiesTable.id),
  name: text("name").notNull(),
  sku: text("sku"),
  barcode: text("barcode"),
  category: text("category").notNull(),
  hsnCode: text("hsn_code"),
  gstRate: numeric("gst_rate", { precision: 5, scale: 2 }).default("18"),
  purchasePrice: numeric("purchase_price", { precision: 12, scale: 2 }),
  sellingPrice: numeric("selling_price", { precision: 12, scale: 2 }).notNull(),
  openingStock: integer("opening_stock").default(0),
  currentStock: integer("current_stock").notNull().default(0),
  minStock: integer("min_stock").notNull().default(5),
  unit: text("unit").default("pcs"),
  batchNumber: text("batch_number"),
  expiryDate: text("expiry_date"),
  imageUrl: text("image_url"),
  description: text("description"),
  brand: text("brand"),
  technicalName: text("technical_name"),
  ingredients: text("ingredients"),
  manufacturingDate: text("manufacturing_date"),
  reorderLevel: integer("reorder_level").default(5),
  createdAt: timestamp("created_at", { withTimezone: true }).notNull().defaultNow(),
  updatedAt: timestamp("updated_at", { withTimezone: true }).notNull().defaultNow().$onUpdate(() => new Date()),
}, (t) => [
  index("idx_products_company_id").on(t.companyId),
  index("idx_products_barcode").on(t.barcode),
]);

export const productVariantsTable = pgTable("lb_product_variants", {
  id: serial("id").primaryKey(),
  companyId: integer("company_id").notNull().references(() => companiesTable.id),
  productId: integer("product_id").notNull().references(() => productsTable.id),
  variantName: text("variant_name").notNull(),
  size: text("size"),
  sizeUnit: text("size_unit"),
  packaging: text("packaging"),
  barcode: text("barcode"),
  sku: text("sku"),
  purchasePrice: numeric("purchase_price", { precision: 12, scale: 2 }).default("0"),
  sellingPrice: numeric("selling_price", { precision: 12, scale: 2 }).notNull().default("0"),
  currentStock: integer("current_stock").notNull().default(0),
  minStock: integer("min_stock").default(5),
  batchNumber: text("batch_number"),
  expiryDate: text("expiry_date"),
  isActive: integer("is_active").notNull().default(1),
  createdAt: timestamp("created_at", { withTimezone: true }).notNull().defaultNow(),
  updatedAt: timestamp("updated_at", { withTimezone: true }).notNull().defaultNow().$onUpdate(() => new Date()),
}, (t) => [
  index("idx_variants_product_id").on(t.productId),
  index("idx_variants_barcode").on(t.barcode),
  index("idx_variants_company_id").on(t.companyId),
]);

export const insertProductSchema = createInsertSchema(productsTable).omit({ id: true, createdAt: true, updatedAt: true });
export const insertProductVariantSchema = createInsertSchema(productVariantsTable).omit({ id: true, createdAt: true, updatedAt: true });
export type InsertProduct = z.infer<typeof insertProductSchema>;
export type InsertProductVariant = z.infer<typeof insertProductVariantSchema>;
export type Product = typeof productsTable.$inferSelect;
export type ProductVariant = typeof productVariantsTable.$inferSelect;
