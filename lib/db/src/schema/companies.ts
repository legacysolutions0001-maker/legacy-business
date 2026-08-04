import { pgTable, text, serial, timestamp } from "drizzle-orm/pg-core";
import { createInsertSchema } from "drizzle-zod";
import { z } from "zod";

export const companiesTable = pgTable("lb_companies", {
  id: serial("id").primaryKey(),
  code: text("code").notNull().unique(),
  name: text("name").notNull(),
  ownerName: text("owner_name"),
  gstNumber: text("gst_number"),
  panNumber: text("pan_number"),
  address: text("address"),
  city: text("city"),
  state: text("state"),
  country: text("country").default("India"),
  pincode: text("pincode"),
  mobile: text("mobile"),
  email: text("email"),
  logoUrl: text("logo_url"),
  subscriptionStatus: text("subscription_status").notNull().default("active"),
  subscriptionStart: text("subscription_start"),
  subscriptionEnd: text("subscription_end"),
  plan: text("plan").notNull().default("starter"),
  invoiceSettingsJson: text("invoice_settings_json"),
  createdAt: timestamp("created_at", { withTimezone: true }).notNull().defaultNow(),
  updatedAt: timestamp("updated_at", { withTimezone: true }).notNull().defaultNow().$onUpdate(() => new Date()),
});

export const insertCompanySchema = createInsertSchema(companiesTable).omit({ id: true, createdAt: true, updatedAt: true });
export type InsertCompany = z.infer<typeof insertCompanySchema>;
export type Company = typeof companiesTable.$inferSelect;
