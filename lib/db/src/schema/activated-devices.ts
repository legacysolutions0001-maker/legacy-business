import { pgTable, text, serial, timestamp, integer } from "drizzle-orm/pg-core";

export const activatedDevicesTable = pgTable("lb_activated_devices", {
  id: serial("id").primaryKey(),
  companyId: integer("company_id").notNull(),
  deviceId: text("device_id").notNull(),       // unique hardware/browser fingerprint
  deviceName: text("device_name"),              // user-provided or auto-detected
  deviceOs: text("device_os"),                  // e.g. "Windows 11"
  lastSeen: timestamp("last_seen", { withTimezone: true }).notNull().defaultNow(),
  isActive: integer("is_active").notNull().default(1),  // 1 = active, 0 = revoked
  createdAt: timestamp("created_at", { withTimezone: true }).notNull().defaultNow(),
});

export type ActivatedDevice = typeof activatedDevicesTable.$inferSelect;
