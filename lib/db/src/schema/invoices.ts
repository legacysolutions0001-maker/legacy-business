import { pgTable, text, serial, timestamp, numeric, integer, jsonb, boolean } from "drizzle-orm/pg-core";
import { createInsertSchema } from "drizzle-zod";
import { z } from "zod";
import { companiesTable } from "./companies";
import { customersTable } from "./customers";

export const invoicesTable = pgTable("lb_invoices", {
  id: serial("id").primaryKey(),
  companyId: integer("company_id").notNull().references(() => companiesTable.id),
  invoiceNumber: text("invoice_number").notNull(),
  invoiceType: text("invoice_type").notNull().default("gst_invoice"),
  customerId: integer("customer_id").references(() => customersTable.id),
  customerName: text("customer_name"),
  customerGst: text("customer_gst"),
  customerAddress: text("customer_address"),
  status: text("status").notNull().default("draft"),
  invoiceDate: text("invoice_date").notNull(),
  dueDate: text("due_date"),
  items: jsonb("items").notNull().default("[]"),
  subtotal: numeric("subtotal", { precision: 12, scale: 2 }).notNull().default("0"),
  discountAmount: numeric("discount_amount", { precision: 12, scale: 2 }).default("0"),
  cgst: numeric("cgst", { precision: 12, scale: 2 }).default("0"),
  sgst: numeric("sgst", { precision: 12, scale: 2 }).default("0"),
  igst: numeric("igst", { precision: 12, scale: 2 }).default("0"),
  roundOff: numeric("round_off", { precision: 5, scale: 2 }).default("0"),
  total: numeric("total", { precision: 12, scale: 2 }).notNull().default("0"),
  paymentMethod: text("payment_method"),
  paymentStatus: text("payment_status").default("pending"),
  paidAt: text("paid_at"),
  notes: text("notes"),
  termsConditions: text("terms_conditions"),
  signatureUrl: text("signature_url"),
  createdAt: timestamp("created_at", { withTimezone: true }).notNull().defaultNow(),
  updatedAt: timestamp("updated_at", { withTimezone: true }).notNull().defaultNow().$onUpdate(() => new Date()),
});

export const insertInvoiceSchema = createInsertSchema(invoicesTable).omit({ id: true, createdAt: true, updatedAt: true });
export type InsertInvoice = z.infer<typeof insertInvoiceSchema>;
export type Invoice = typeof invoicesTable.$inferSelect;
