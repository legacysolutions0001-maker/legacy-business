import { pgTable, text, serial, timestamp, integer, index } from "drizzle-orm/pg-core";
import { createInsertSchema } from "drizzle-zod";
import { z } from "zod/v4";
import { companiesTable } from "./companies";

export const auditLogTable = pgTable("lb_audit_log", {
  id: serial("id").primaryKey(),
  companyId: integer("company_id").references(() => companiesTable.id),
  userId: integer("user_id"),
  username: text("username").notNull(),
  action: text("action").notNull(),
  entity: text("entity"),
  entityId: text("entity_id"),
  detail: text("detail"),
  ipAddress: text("ip_address"),
  createdAt: timestamp("created_at", { withTimezone: true }).notNull().defaultNow(),
}, (t) => [
  index("idx_audit_log_company").on(t.companyId),
  index("idx_audit_log_user").on(t.userId),
  index("idx_audit_log_created").on(t.createdAt),
]);

export const insertAuditLogSchema = createInsertSchema(auditLogTable).omit({ id: true, createdAt: true });
export type InsertAuditLog = z.infer<typeof insertAuditLogSchema>;
export type AuditLog = typeof auditLogTable.$inferSelect;
