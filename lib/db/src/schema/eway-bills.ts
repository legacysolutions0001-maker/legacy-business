import { pgTable, text, serial, timestamp, integer } from "drizzle-orm/pg-core";
import { createInsertSchema } from "drizzle-zod";
import { z } from "zod/v4";
import { companiesTable } from "./companies";

export const ewayBillsTable = pgTable("lb_eway_bills", {
  id: serial("id").primaryKey(),
  companyId: integer("company_id").notNull().references(() => companiesTable.id),
  ewbNumber: text("ewb_number").notNull(),
  invoiceNumber: text("invoice_number"),
  invoiceDate: text("invoice_date"),
  fromGstin: text("from_gstin"),
  toGstin: text("to_gstin"),
  fromPlace: text("from_place"),
  toPlace: text("to_place"),
  fromState: text("from_state"),
  toState: text("to_state"),
  transactionType: text("transaction_type").default("1"),
  supplyType: text("supply_type").default("O"),
  subSupplyType: text("sub_supply_type").default("1"),
  transportMode: text("transport_mode").default("road"),
  vehicleNumber: text("vehicle_number"),
  trainNumber: text("train_number"),
  flightNumber: text("flight_number"),
  shipNumber: text("ship_number"),
  invoiceValue: text("invoice_value").default("0"),
  hsnCode: text("hsn_code"),
  productName: text("product_name"),
  quantity: text("quantity"),
  unit: text("unit"),
  status: text("status").notNull().default("generated"),
  validUpto: text("valid_upto"),
  cancelRemark: text("cancel_remark"),
  invoiceId: integer("invoice_id"),
  createdAt: timestamp("created_at", { withTimezone: true }).notNull().defaultNow(),
});

export const insertEwayBillSchema = createInsertSchema(ewayBillsTable).omit({ id: true, createdAt: true });
export type InsertEwayBill = z.infer<typeof insertEwayBillSchema>;
export type EwayBill = typeof ewayBillsTable.$inferSelect;
