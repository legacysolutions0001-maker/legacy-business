import { pgTable, text, serial, timestamp, numeric, integer } from "drizzle-orm/pg-core";
import { createInsertSchema } from "drizzle-zod";
import { z } from "zod";
import { companiesTable } from "./companies";

export const daybookTable = pgTable("lb_daybook", {
  id: serial("id").primaryKey(),
  companyId: integer("company_id").notNull().references(() => companiesTable.id),
  date: text("date").notNull(),
  category: text("category").notNull(),
  description: text("description"),
  amount: numeric("amount", { precision: 12, scale: 2 }).notNull(),
  notes: text("notes"),
  createdAt: timestamp("created_at", { withTimezone: true }).notNull().defaultNow(),
});

export const insertDaybookSchema = createInsertSchema(daybookTable).omit({ id: true, createdAt: true });
export type InsertDaybook = z.infer<typeof insertDaybookSchema>;
export type Daybook = typeof daybookTable.$inferSelect;
