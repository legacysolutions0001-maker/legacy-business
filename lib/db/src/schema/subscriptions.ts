import { pgTable, text, serial, timestamp, numeric, integer, jsonb } from "drizzle-orm/pg-core";
import { createInsertSchema } from "drizzle-zod";
import { z } from "zod";
import { companiesTable } from "./companies";

export const subscriptionsTable = pgTable("lb_subscriptions", {
  id: serial("id").primaryKey(),
  companyId: integer("company_id").notNull().references(() => companiesTable.id),
  plan: text("plan").notNull().default("starter"),
  modules: jsonb("modules").notNull().default("[]"),
  startDate: text("start_date").notNull(),
  endDate: text("end_date").notNull(),
  amount: numeric("amount", { precision: 12, scale: 2 }).notNull(),
  status: text("status").notNull().default("active"),
  paidStatus: text("paid_status").notNull().default("unpaid"),
  invoiceNumber: text("invoice_number"),
  notes: text("notes"),
  createdAt: timestamp("created_at", { withTimezone: true }).notNull().defaultNow(),
  updatedAt: timestamp("updated_at", { withTimezone: true }).notNull().defaultNow().$onUpdate(() => new Date()),
});

export const subscriptionPricingTable = pgTable("lb_subscription_pricing", {
  id: serial("id").primaryKey(),
  plan: text("plan").notNull().unique(),
  price: numeric("price", { precision: 12, scale: 2 }).notNull(),
  updatedAt: timestamp("updated_at", { withTimezone: true }).notNull().defaultNow().$onUpdate(() => new Date()),
});

export const insertSubscriptionSchema = createInsertSchema(subscriptionsTable).omit({ id: true, createdAt: true, updatedAt: true });
export type InsertSubscription = z.infer<typeof insertSubscriptionSchema>;
export type Subscription = typeof subscriptionsTable.$inferSelect;
export type SubscriptionPricing = typeof subscriptionPricingTable.$inferSelect;
