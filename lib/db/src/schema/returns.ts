import { pgTable, text, serial, timestamp, numeric, integer, jsonb, index } from "drizzle-orm/pg-core";
import { createInsertSchema } from "drizzle-zod";
import { z } from "zod";
import { companiesTable } from "./companies";

export const salesReturnsTable = pgTable("lb_sales_returns", {
  id: serial("id").primaryKey(),
  companyId: integer("company_id").notNull().references(() => companiesTable.id),
  returnNumber: text("return_number").notNull(),
  originalInvoiceId: integer("original_invoice_id"),
  originalInvoiceNumber: text("original_invoice_number"),
  customerId: integer("customer_id"),
  customerName: text("customer_name"),
  returnDate: text("return_date").notNull(),
  reason: text("reason"),
  items: jsonb("items").notNull().default("[]"),
  subtotal: numeric("subtotal", { precision: 12, scale: 2 }).default("0"),
  cgst: numeric("cgst", { precision: 12, scale: 2 }).default("0"),
  sgst: numeric("sgst", { precision: 12, scale: 2 }).default("0"),
  igst: numeric("igst", { precision: 12, scale: 2 }).default("0"),
  total: numeric("total", { precision: 12, scale: 2 }).notNull().default("0"),
  status: text("status").notNull().default("pending"),
  notes: text("notes"),
  createdAt: timestamp("created_at", { withTimezone: true }).notNull().defaultNow(),
  updatedAt: timestamp("updated_at", { withTimezone: true }).notNull().defaultNow().$onUpdate(() => new Date()),
}, (t) => [
  index("idx_sales_returns_company_id").on(t.companyId),
]);

export const purchaseReturnsTable = pgTable("lb_purchase_returns", {
  id: serial("id").primaryKey(),
  companyId: integer("company_id").notNull().references(() => companiesTable.id),
  returnNumber: text("return_number").notNull(),
  originalPurchaseId: integer("original_purchase_id"),
  originalBillNumber: text("original_bill_number"),
  supplierId: integer("supplier_id"),
  supplierName: text("supplier_name"),
  returnDate: text("return_date").notNull(),
  reason: text("reason"),
  items: jsonb("items").notNull().default("[]"),
  subtotal: numeric("subtotal", { precision: 12, scale: 2 }).default("0"),
  cgst: numeric("cgst", { precision: 12, scale: 2 }).default("0"),
  sgst: numeric("sgst", { precision: 12, scale: 2 }).default("0"),
  igst: numeric("igst", { precision: 12, scale: 2 }).default("0"),
  total: numeric("total", { precision: 12, scale: 2 }).notNull().default("0"),
  status: text("status").notNull().default("pending"),
  notes: text("notes"),
  createdAt: timestamp("created_at", { withTimezone: true }).notNull().defaultNow(),
  updatedAt: timestamp("updated_at", { withTimezone: true }).notNull().defaultNow().$onUpdate(() => new Date()),
}, (t) => [
  index("idx_purchase_returns_company_id").on(t.companyId),
]);

export const insertSalesReturnSchema = createInsertSchema(salesReturnsTable).omit({ id: true, createdAt: true, updatedAt: true });
export const insertPurchaseReturnSchema = createInsertSchema(purchaseReturnsTable).omit({ id: true, createdAt: true, updatedAt: true });
export type InsertSalesReturn = z.infer<typeof insertSalesReturnSchema>;
export type InsertPurchaseReturn = z.infer<typeof insertPurchaseReturnSchema>;
export type SalesReturn = typeof salesReturnsTable.$inferSelect;
export type PurchaseReturn = typeof purchaseReturnsTable.$inferSelect;
