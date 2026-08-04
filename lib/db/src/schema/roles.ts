import { pgTable, text, serial, timestamp, integer, boolean, index, unique } from "drizzle-orm/pg-core";
import { createInsertSchema } from "drizzle-zod";
import { z } from "zod";
import { companiesTable } from "./companies";

// Custom, company-defined roles layered on top of the built-in `users.role`
// string (owner/staff/super_admin). A company can define named roles
// ("Cashier", "Store Manager", ...) and attach a set of permission keys to
// each; `usersTable.customRoleId` (optional) can then point at one of these
// for finer-grained access than the built-in role alone provides.
export const rolesTable = pgTable("lb_roles", {
  id: serial("id").primaryKey(),
  companyId: integer("company_id").notNull().references(() => companiesTable.id),
  name: text("name").notNull(),
  description: text("description"),
  isSystem: boolean("is_system").notNull().default(false),
  createdAt: timestamp("created_at", { withTimezone: true }).notNull().defaultNow(),
  updatedAt: timestamp("updated_at", { withTimezone: true }).notNull().defaultNow().$onUpdate(() => new Date()),
}, (t) => [
  index("idx_roles_company_id").on(t.companyId),
]);

// Master catalog of permission keys the app understands, e.g.
// "invoices.create", "inventory.delete", "reports.view". Seeded once and
// shared across all companies (not company-scoped) so the catalog stays
// consistent as new features ship.
export const permissionsTable = pgTable("lb_permissions", {
  id: serial("id").primaryKey(),
  key: text("key").notNull().unique(),
  module: text("module").notNull(),
  description: text("description"),
  createdAt: timestamp("created_at", { withTimezone: true }).notNull().defaultNow(),
});

// Join table: which permissions a given role grants.
export const rolePermissionsTable = pgTable("lb_role_permissions", {
  id: serial("id").primaryKey(),
  roleId: integer("role_id").notNull().references(() => rolesTable.id),
  permissionId: integer("permission_id").notNull().references(() => permissionsTable.id),
  createdAt: timestamp("created_at", { withTimezone: true }).notNull().defaultNow(),
}, (t) => [
  index("idx_role_permissions_role").on(t.roleId),
  unique("uq_role_permission").on(t.roleId, t.permissionId),
]);

export const insertRoleSchema = createInsertSchema(rolesTable).omit({ id: true, createdAt: true, updatedAt: true });
export const insertPermissionSchema = createInsertSchema(permissionsTable).omit({ id: true, createdAt: true });
export const insertRolePermissionSchema = createInsertSchema(rolePermissionsTable).omit({ id: true, createdAt: true });
export type InsertRole = z.infer<typeof insertRoleSchema>;
export type InsertPermission = z.infer<typeof insertPermissionSchema>;
export type InsertRolePermission = z.infer<typeof insertRolePermissionSchema>;
export type Role = typeof rolesTable.$inferSelect;
export type Permission = typeof permissionsTable.$inferSelect;
export type RolePermission = typeof rolePermissionsTable.$inferSelect;
