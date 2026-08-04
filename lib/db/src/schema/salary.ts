import { pgTable, text, serial, timestamp, numeric, integer } from "drizzle-orm/pg-core";
import { createInsertSchema } from "drizzle-zod";
import { z } from "zod";
import { companiesTable } from "./companies";
import { employeesTable } from "./employees";

export const salaryRecordsTable = pgTable("lb_salary_records", {
  id: serial("id").primaryKey(),
  companyId: integer("company_id").notNull().references(() => companiesTable.id),
  employeeId: integer("employee_id").notNull().references(() => employeesTable.id),
  month: integer("month").notNull(),
  year: integer("year").notNull(),
  basicSalary: numeric("basic_salary", { precision: 12, scale: 2 }).notNull().default("0"),
  hra: numeric("hra", { precision: 12, scale: 2 }).default("0"),
  allowances: numeric("allowances", { precision: 12, scale: 2 }).default("0"),
  advance: numeric("advance", { precision: 12, scale: 2 }).default("0"),
  bonus: numeric("bonus", { precision: 12, scale: 2 }).default("0"),
  overtime: numeric("overtime", { precision: 12, scale: 2 }).default("0"),
  deductions: numeric("deductions", { precision: 12, scale: 2 }).default("0"),
  grossSalary: numeric("gross_salary", { precision: 12, scale: 2 }).default("0"),
  netSalary: numeric("net_salary", { precision: 12, scale: 2 }).notNull().default("0"),
  paymentMode: text("payment_mode").default("cash"),
  status: text("status").notNull().default("pending"),
  paidAt: text("paid_at"),
  notes: text("notes"),
  createdAt: timestamp("created_at", { withTimezone: true }).notNull().defaultNow(),
  updatedAt: timestamp("updated_at", { withTimezone: true }).notNull().defaultNow().$onUpdate(() => new Date()),
});

export const insertSalaryRecordSchema = createInsertSchema(salaryRecordsTable).omit({ id: true, createdAt: true, updatedAt: true });
export type InsertSalaryRecord = z.infer<typeof insertSalaryRecordSchema>;
export type SalaryRecord = typeof salaryRecordsTable.$inferSelect;
