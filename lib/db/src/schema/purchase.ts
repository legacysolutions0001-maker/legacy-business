import { pgTable, text, serial, timestamp, numeric, integer, jsonb } from "drizzle-orm/pg-core";
import { createInsertSchema } from "drizzle-zod";
import { z } from "zod/v4";
import { companiesTable } from "./companies";
import { suppliersTable } from "./suppliers";

export const purchaseOrdersTable = pgTable("lb_purchase_orders", {
  id: serial("id").primaryKey(),
  companyId: integer("company_id").notNull().references(() => companiesTable.id),
  supplierId: integer("supplier_id").references(() => suppliersTable.id),
  supplierName: text("supplier_name"),
  billNumber: text("bill_number").notNull(),
  billDate: text("bill_date").notNull(),
  items: jsonb("items").notNull().default("[]"),
  subtotal: numeric("subtotal", { precision: 12, scale: 2 }).notNull().default("0"),
  cgst: numeric("cgst", { precision: 12, scale: 2 }).default("0"),
  sgst: numeric("sgst", { precision: 12, scale: 2 }).default("0"),
  igst: numeric("igst", { precision: 12, scale: 2 }).default("0"),
  total: numeric("total", { precision: 12, scale: 2 }).notNull().default("0"),
  paymentStatus: text("payment_status").notNull().default("pending"),
  notes: text("notes"),
  createdAt: timestamp("created_at", { withTimezone: true }).notNull().defaultNow(),
  updatedAt: timestamp("updated_at", { withTimezone: true }).notNull().defaultNow().$onUpdate(() => new Date()),
});

export const insertPurchaseOrderSchema = createInsertSchema(purchaseOrdersTable).omit({ id: true, createdAt: true, updatedAt: true });
export type InsertPurchaseOrder = z.infer<typeof insertPurchaseOrderSchema>;
export type PurchaseOrder = typeof purchaseOrdersTable.$inferSelect;
