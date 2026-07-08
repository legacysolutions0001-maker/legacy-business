import { pgTable, text, serial, timestamp, integer } from "drizzle-orm/pg-core";
import { createInsertSchema } from "drizzle-zod";
import { z } from "zod/v4";

export const leavesTable = pgTable("lb_leaves", {
  id: serial("id").primaryKey(),
  employeeId: integer("employee_id").notNull(),
  type: text("type").notNull().default("annual"),
  startDate: text("start_date").notNull(),
  endDate: text("end_date").notNull(),
  status: text("status").notNull().default("pending"),
  reason: text("reason"),
  createdAt: timestamp("created_at", { withTimezone: true }).notNull().defaultNow(),
});

export const insertLeaveSchema = createInsertSchema(leavesTable).omit({ id: true, createdAt: true });
export type InsertLeave = z.infer<typeof insertLeaveSchema>;
export type Leave = typeof leavesTable.$inferSelect;
