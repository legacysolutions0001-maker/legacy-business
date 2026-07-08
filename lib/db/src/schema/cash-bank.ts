import { pgTable, text, serial, timestamp, numeric, integer, index } from "drizzle-orm/pg-core";
import { createInsertSchema } from "drizzle-zod";
import { z } from "zod/v4";
import { companiesTable } from "./companies";

export const cashBankLedgerTable = pgTable("lb_cash_bank_ledger", {
  id: serial("id").primaryKey(),
  companyId: integer("company_id").notNull().references(() => companiesTable.id),
  ledgerType: text("ledger_type").notNull().default("cash"),
  entryType: text("entry_type").notNull().default("credit"),
  amount: numeric("amount", { precision: 12, scale: 2 }).notNull().default("0"),
  balance: numeric("balance", { precision: 12, scale: 2 }).default("0"),
  description: text("description").notNull(),
  reference: text("reference"),
  entryDate: text("entry_date").notNull(),
  paymentMethod: text("payment_method"),
  bankName: text("bank_name"),
  accountNumber: text("account_number"),
  chequeNumber: text("cheque_number"),
  transactionId: text("transaction_id"),
  createdAt: timestamp("created_at", { withTimezone: true }).notNull().defaultNow(),
  updatedAt: timestamp("updated_at", { withTimezone: true }).notNull().defaultNow().$onUpdate(() => new Date()),
}, (t) => [
  index("idx_cash_bank_company_id").on(t.companyId),
  index("idx_cash_bank_type").on(t.ledgerType),
  index("idx_cash_bank_date").on(t.entryDate),
]);

export const insertCashBankLedgerSchema = createInsertSchema(cashBankLedgerTable).omit({ id: true, createdAt: true, updatedAt: true });
export type InsertCashBankLedger = z.infer<typeof insertCashBankLedgerSchema>;
export type CashBankLedger = typeof cashBankLedgerTable.$inferSelect;
