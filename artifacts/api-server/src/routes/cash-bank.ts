import { Router } from "express";
import { db, cashBankLedgerTable } from "@workspace/db";
import { eq, sql, and, sum, count } from "drizzle-orm";
import { requireResolvedCompany, resolveCompanyId } from "../middlewares/auth";

const router = Router();
const toNum = (v: any) => v != null ? Number(v) : 0;

router.get("/cash-bank/summary", requireResolvedCompany, async (req, res) => {
  const companyId = resolveCompanyId(req);
  if (!companyId) { res.status(403).json({ error: "Company required" }); return; }
  const [cashIn, cashOut, bankIn, bankOut] = await Promise.all([
    db.select({ total: sum(cashBankLedgerTable.amount) }).from(cashBankLedgerTable).where(and(eq(cashBankLedgerTable.companyId, companyId), eq(cashBankLedgerTable.ledgerType, "cash"), eq(cashBankLedgerTable.entryType, "credit"))),
    db.select({ total: sum(cashBankLedgerTable.amount) }).from(cashBankLedgerTable).where(and(eq(cashBankLedgerTable.companyId, companyId), eq(cashBankLedgerTable.ledgerType, "cash"), eq(cashBankLedgerTable.entryType, "debit"))),
    db.select({ total: sum(cashBankLedgerTable.amount) }).from(cashBankLedgerTable).where(and(eq(cashBankLedgerTable.companyId, companyId), eq(cashBankLedgerTable.ledgerType, "bank"), eq(cashBankLedgerTable.entryType, "credit"))),
    db.select({ total: sum(cashBankLedgerTable.amount) }).from(cashBankLedgerTable).where(and(eq(cashBankLedgerTable.companyId, companyId), eq(cashBankLedgerTable.ledgerType, "bank"), eq(cashBankLedgerTable.entryType, "debit"))),
  ]);
  const cashBalance = toNum(cashIn[0]?.total) - toNum(cashOut[0]?.total);
  const bankBalance = toNum(bankIn[0]?.total) - toNum(bankOut[0]?.total);
  res.json({ cashBalance, bankBalance, cashIn: toNum(cashIn[0]?.total), cashOut: toNum(cashOut[0]?.total), bankIn: toNum(bankIn[0]?.total), bankOut: toNum(bankOut[0]?.total) });
});

router.get("/cash-bank", requireResolvedCompany, async (req, res) => {
  const companyId = resolveCompanyId(req);
  if (!companyId) { res.status(403).json({ error: "Company required" }); return; }
  const { type, from, to } = req.query as { type?: string; from?: string; to?: string };
  let query = db.select().from(cashBankLedgerTable).where(eq(cashBankLedgerTable.companyId, companyId)).$dynamic();
  if (type && type !== "all") query = query.where(and(eq(cashBankLedgerTable.companyId, companyId), eq(cashBankLedgerTable.ledgerType, type)));
  if (from) query = query.where(and(eq(cashBankLedgerTable.companyId, companyId), sql`entry_date >= ${from}`));
  if (to) query = query.where(and(eq(cashBankLedgerTable.companyId, companyId), sql`entry_date <= ${to}`));
  const rows = await query.orderBy(sql`${cashBankLedgerTable.entryDate} DESC, ${cashBankLedgerTable.createdAt} DESC`);
  res.json(rows.map(r => ({ ...r, amount: toNum(r.amount), balance: toNum(r.balance) })));
});

router.post("/cash-bank", requireResolvedCompany, async (req, res) => {
  const companyId = resolveCompanyId(req);
  if (!companyId) { res.status(403).json({ error: "Company required" }); return; }
  const { ledgerType, entryType, amount, description, reference, entryDate, paymentMethod, bankName, accountNumber, chequeNumber, transactionId } = req.body;
  if (!description || !amount) { res.status(400).json({ error: "Description and amount required" }); return; }

  const [prevBalance] = await db.select({ bal: sum(sql`CASE WHEN entry_type = 'credit' THEN amount::numeric ELSE -amount::numeric END`) }).from(cashBankLedgerTable).where(and(eq(cashBankLedgerTable.companyId, companyId), eq(cashBankLedgerTable.ledgerType, ledgerType || "cash")));
  const prevBal = toNum(prevBalance?.bal);
  const newBalance = entryType === "credit" ? prevBal + Number(amount) : prevBal - Number(amount);

  const [row] = await db.insert(cashBankLedgerTable).values({
    companyId,
    ledgerType: ledgerType || "cash",
    entryType: entryType || "credit",
    amount: String(amount),
    balance: String(newBalance),
    description,
    reference: reference || null,
    entryDate: entryDate || new Date().toISOString().split("T")[0],
    paymentMethod: paymentMethod || null,
    bankName: bankName || null,
    accountNumber: accountNumber || null,
    chequeNumber: chequeNumber || null,
    transactionId: transactionId || null,
  }).returning();
  res.status(201).json({ ...row, amount: toNum(row.amount), balance: toNum(row.balance) });
});

router.patch("/cash-bank/:id", requireResolvedCompany, async (req, res) => {
  const companyId = resolveCompanyId(req);
  const allowed = ["description","amount","entryType","reference","entryDate","paymentMethod","bankName","accountNumber","chequeNumber","transactionId"];
  const update: any = {};
  for (const k of allowed) if (req.body[k] !== undefined) update[k] = k === "amount" ? String(req.body[k]) : req.body[k];
  const [row] = await db.update(cashBankLedgerTable).set(update).where(and(eq(cashBankLedgerTable.id, parseInt(req.params.id as string)), eq(cashBankLedgerTable.companyId, companyId!))).returning();
  if (!row) { res.status(404).json({ error: "Not found" }); return; }
  res.json({ ...row, amount: toNum(row.amount), balance: toNum(row.balance) });
});

router.delete("/cash-bank/:id", requireResolvedCompany, async (req, res) => {
  const companyId = resolveCompanyId(req);
  await db.delete(cashBankLedgerTable).where(and(eq(cashBankLedgerTable.id, parseInt(req.params.id as string)), eq(cashBankLedgerTable.companyId, companyId!)));
  res.sendStatus(204);
});

export default router;
