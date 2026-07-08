import { pgTable, text, serial, timestamp, numeric, integer } from "drizzle-orm/pg-core";
import { createInsertSchema } from "drizzle-zod";
import { z } from "zod/v4";
import { companiesTable } from "./companies";
import { customersTable } from "./customers";

export const dealsTable = pgTable("lb_deals", {
  id: serial("id").primaryKey(),
  companyId: integer("company_id").notNull().references(() => companiesTable.id),
  title: text("title").notNull(),
  stage: text("stage").notNull().default("prospect"),
  value: numeric("value", { precision: 12, scale: 2 }).notNull(),
  probability: integer("probability"),
  customerId: integer("customer_id").references(() => customersTable.id),
  expectedCloseDate: text("expected_close_date"),
  notes: text("notes"),
  createdAt: timestamp("created_at", { withTimezone: true }).notNull().defaultNow(),
  updatedAt: timestamp("updated_at", { withTimezone: true }).notNull().defaultNow().$onUpdate(() => new Date()),
});

export const insertDealSchema = createInsertSchema(dealsTable).omit({ id: true, createdAt: true, updatedAt: true });
export type InsertDeal = z.infer<typeof insertDealSchema>;
export type Deal = typeof dealsTable.$inferSelect;
