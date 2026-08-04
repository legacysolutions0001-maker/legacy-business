import { pgTable, text, serial, timestamp, numeric, integer } from "drizzle-orm/pg-core";
import { createInsertSchema } from "drizzle-zod";
import { z } from "zod";
import { companiesTable } from "./companies";

export const employeesTable = pgTable("lb_employees", {
  id: serial("id").primaryKey(),
  companyId: integer("company_id").notNull().references(() => companiesTable.id),
  name: text("name").notNull(),
  email: text("email"),
  phone: text("phone"),
  aadhaar: text("aadhaar"),
  address: text("address"),
  department: text("department"),
  position: text("position").notNull(),
  role: text("role").notNull().default("worker"),
  status: text("status").notNull().default("active"),
  basicSalary: numeric("basic_salary", { precision: 12, scale: 2 }),
  joiningDate: text("joining_date").notNull(),
  avatar: text("avatar"),
  createdAt: timestamp("created_at", { withTimezone: true }).notNull().defaultNow(),
  updatedAt: timestamp("updated_at", { withTimezone: true }).notNull().defaultNow().$onUpdate(() => new Date()),
});

export const insertEmployeeSchema = createInsertSchema(employeesTable).omit({ id: true, createdAt: true, updatedAt: true });
export type InsertEmployee = z.infer<typeof insertEmployeeSchema>;
export type Employee = typeof employeesTable.$inferSelect;
