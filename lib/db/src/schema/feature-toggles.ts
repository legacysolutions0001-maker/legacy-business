import { pgTable, text, serial, timestamp, integer, boolean } from "drizzle-orm/pg-core";
import { createInsertSchema } from "drizzle-zod";
import { z } from "zod";
import { companiesTable } from "./companies";

export const featureTogglesTable = pgTable("lb_feature_toggles", {
  id: serial("id").primaryKey(),
  companyId: integer("company_id").notNull().references(() => companiesTable.id),
  module: text("module").notNull(),
  isEnabled: boolean("is_enabled").notNull().default(true),
  createdAt: timestamp("created_at", { withTimezone: true }).notNull().defaultNow(),
  updatedAt: timestamp("updated_at", { withTimezone: true }).notNull().defaultNow().$onUpdate(() => new Date()),
});

export const insertFeatureToggleSchema = createInsertSchema(featureTogglesTable).omit({ id: true, createdAt: true, updatedAt: true });
export type InsertFeatureToggle = z.infer<typeof insertFeatureToggleSchema>;
export type FeatureToggle = typeof featureTogglesTable.$inferSelect;
