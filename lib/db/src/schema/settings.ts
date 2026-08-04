import { pgTable, text, serial, timestamp } from "drizzle-orm/pg-core";
import { createInsertSchema } from "drizzle-zod";
import { z } from "zod";

export const legacyBusinessSettingsTable = pgTable("lb_legacy_business_settings", {
  id: serial("id").primaryKey(),
  businessName: text("business_name").notNull().default("Legacy Business"),
  address: text("address"),
  phone: text("phone"),
  email: text("email"),
  gstNumber: text("gst_number"),
  panNumber: text("pan_number"),
  accountHolderName: text("account_holder_name"),
  bankName: text("bank_name"),
  accountNumber: text("account_number"),
  ifscCode: text("ifsc_code"),
  upiId: text("upi_id"),
  qrCodeUrl: text("qr_code_url"),
  logoUrl: text("logo_url"),
  createdAt: timestamp("created_at", { withTimezone: true }).notNull().defaultNow(),
  updatedAt: timestamp("updated_at", { withTimezone: true }).notNull().defaultNow().$onUpdate(() => new Date()),
});

export const insertLegacyBusinessSettingsSchema = createInsertSchema(legacyBusinessSettingsTable).omit({ id: true, createdAt: true, updatedAt: true });
export type InsertLegacyBusinessSettings = z.infer<typeof insertLegacyBusinessSettingsSchema>;
export type LegacyBusinessSettings = typeof legacyBusinessSettingsTable.$inferSelect;
