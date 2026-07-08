import { pgTable, text, serial, timestamp, numeric, integer } from "drizzle-orm/pg-core";
import { createInsertSchema } from "drizzle-zod";
import { z } from "zod/v4";
import { companiesTable } from "./companies";

export const customersTable = pgTable("lb_customers", {
  id: serial("id").primaryKey(),
  companyId: integer("company_id").notNull().references(() => companiesTable.id),
  name: text("name").notNull(),
  mobile: text("mobile"),
  email: text("email"),
  aadhaarNumber: text("aadhaar_number"),
  address: text("address"),
  city: text("city"),
  state: text("state"),
  country: text("country").default("India"),
  pincode: text("pincode"),
  notes: text("notes"),
  whatsappNumber: text("whatsapp_number"),
  totalRevenue: numeric("total_revenue", { precision: 12, scale: 2 }).default("0"),
  pendingDues: numeric("pending_dues", { precision: 12, scale: 2 }).default("0"),
  createdAt: timestamp("created_at", { withTimezone: true }).notNull().defaultNow(),
  updatedAt: timestamp("updated_at", { withTimezone: true }).notNull().defaultNow().$onUpdate(() => new Date()),
});

export const insertCustomerSchema = createInsertSchema(customersTable).omit({ id: true, createdAt: true, updatedAt: true });
export type InsertCustomer = z.infer<typeof insertCustomerSchema>;
export type Customer = typeof customersTable.$inferSelect;
