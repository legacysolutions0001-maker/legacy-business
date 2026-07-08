import { Router } from "express";
import { db, salaryRecordsTable, employeesTable } from "@workspace/db";
import { eq, sql, and, sum } from "drizzle-orm";
import { requireAuth } from "../middlewares/auth";

const router = Router();
const toNum = (v: any) => v != null ? Number(v) : 0;

router.get("/salary", requireAuth, async (req, res) => {
  const companyId = req.auth!.companyId;
  if (!companyId) { res.status(403).json({ error: "Company required" }); return; }
  const { month, year } = req.query as { month?: string; year?: string };
  let query = db.select({ sr: salaryRecordsTable, emp: { name: employeesTable.name, position: employeesTable.position, department: employeesTable.department } })
    .from(salaryRecordsTable)
    .leftJoin(employeesTable, eq(salaryRecordsTable.employeeId, employeesTable.id))
    .where(eq(salaryRecordsTable.companyId, companyId)).$dynamic();
  if (month) query = query.where(and(eq(salaryRecordsTable.companyId, companyId), eq(salaryRecordsTable.month, parseInt(month))));
  if (year) query = query.where(and(eq(salaryRecordsTable.companyId, companyId), eq(salaryRecordsTable.year, parseInt(year))));
  const rows = await query.orderBy(sql`${salaryRecordsTable.year} DESC, ${salaryRecordsTable.month} DESC`);
  res.json(rows.map(r => ({
    ...r.sr,
    employeeName: (r.emp as any)?.name,
    position: (r.emp as any)?.position,
    department: (r.emp as any)?.department,
    netSalary: toNum(r.sr.netSalary),
    basicSalary: toNum(r.sr.basicSalary),
    hra: toNum(r.sr.hra),
    allowances: toNum(r.sr.allowances),
    grossSalary: toNum(r.sr.grossSalary),
    bonus: toNum(r.sr.bonus),
    overtime: toNum(r.sr.overtime),
    deductions: toNum(r.sr.deductions),
  })));
});

router.post("/salary", requireAuth, async (req, res) => {
  const companyId = req.auth!.companyId;
  if (!companyId) { res.status(403).json({ error: "Company required" }); return; }
  const { employeeId, month, year, basicSalary, hra, allowances, advance, bonus, overtime, deductions, paymentMode } = req.body;
  const basic = Number(basicSalary ?? 0);
  const hraAmt = Number(hra ?? 0);
  const allwAmt = Number(allowances ?? 0);
  const adv = Number(advance ?? 0);
  const bon = Number(bonus ?? 0);
  const ot = Number(overtime ?? 0);
  const ded = Number(deductions ?? 0);
  const gross = basic + hraAmt + allwAmt + bon + ot;
  const netSalary = gross - adv - ded;

  const existing = await db.select().from(salaryRecordsTable).where(and(eq(salaryRecordsTable.companyId, companyId), eq(salaryRecordsTable.employeeId, employeeId), eq(salaryRecordsTable.month, month), eq(salaryRecordsTable.year, year))).limit(1);
  if (existing.length > 0) {
    const [row] = await db.update(salaryRecordsTable).set({ basicSalary: String(basic), hra: String(hraAmt), allowances: String(allwAmt), advance: String(adv), bonus: String(bon), overtime: String(ot), deductions: String(ded), grossSalary: String(gross), netSalary: String(netSalary), paymentMode: paymentMode || "cash" }).where(eq(salaryRecordsTable.id, existing[0].id)).returning();
    res.json({ ...row, netSalary: toNum(row.netSalary), grossSalary: toNum(row.grossSalary) });
  } else {
    const [row] = await db.insert(salaryRecordsTable).values({ companyId, employeeId, month, year, basicSalary: String(basic), hra: String(hraAmt), allowances: String(allwAmt), advance: String(adv), bonus: String(bon), overtime: String(ot), deductions: String(ded), grossSalary: String(gross), netSalary: String(netSalary), paymentMode: paymentMode || "cash", status: "pending" }).returning();
    res.status(201).json({ ...row, netSalary: toNum(row.netSalary), grossSalary: toNum(row.grossSalary) });
  }
});

router.patch("/salary/:id", requireAuth, async (req, res) => {
  const companyId = req.auth!.companyId;
  const update: any = {};
  const fields = ["basicSalary","hra","allowances","advance","bonus","overtime","deductions","paymentMode","status","paidAt","notes"];
  for (const f of fields) if (req.body[f] !== undefined) update[f] = ["basicSalary","hra","allowances","advance","bonus","overtime","deductions"].includes(f) ? String(req.body[f]) : req.body[f];
  if (Object.keys(update).some(k => ["basicSalary","hra","allowances","advance","bonus","overtime","deductions"].includes(k))) {
    const existing = await db.select().from(salaryRecordsTable).where(and(eq(salaryRecordsTable.id, parseInt(req.params.id as string)), eq(salaryRecordsTable.companyId, companyId!))).limit(1);
    if (existing[0]) {
      const r = existing[0];
      const gross = Number(update.basicSalary ?? r.basicSalary) + Number(update.hra ?? r.hra ?? 0) + Number(update.allowances ?? r.allowances ?? 0) + Number(update.bonus ?? r.bonus ?? 0) + Number(update.overtime ?? r.overtime ?? 0);
      const netSalary = gross - Number(update.advance ?? r.advance ?? 0) - Number(update.deductions ?? r.deductions ?? 0);
      update.grossSalary = String(gross);
      update.netSalary = String(netSalary);
    }
  }
  const [row] = await db.update(salaryRecordsTable).set(update).where(and(eq(salaryRecordsTable.id, parseInt(req.params.id as string)), eq(salaryRecordsTable.companyId, companyId!))).returning();
  if (!row) { res.status(404).json({ error: "Not found" }); return; }
  res.json({ ...row, netSalary: toNum(row.netSalary), grossSalary: toNum(row.grossSalary) });
});

router.delete("/salary/:id", requireAuth, async (req, res) => {
  const companyId = req.auth!.companyId;
  if (!companyId) { res.status(403).json({ error: "Company required" }); return; }
  const id = Number(req.params.id);
  await db.delete(salaryRecordsTable).where(and(eq(salaryRecordsTable.id, id), eq(salaryRecordsTable.companyId, companyId)));
  res.json({ ok: true });
});

router.get("/salary/summary", requireAuth, async (req, res) => {
  const companyId = req.auth!.companyId;
  if (!companyId) { res.status(403).json({ error: "Company required" }); return; }
  const { month, year } = req.query as { month?: string; year?: string };
  const m = month ? parseInt(month) : new Date().getMonth() + 1;
  const y = year ? parseInt(year) : new Date().getFullYear();
  const rows = await db.select({ status: salaryRecordsTable.status, total: sum(salaryRecordsTable.netSalary) }).from(salaryRecordsTable).where(and(eq(salaryRecordsTable.companyId, companyId), eq(salaryRecordsTable.month, m), eq(salaryRecordsTable.year, y))).groupBy(salaryRecordsTable.status);
  const paid = rows.find(r => r.status === "paid");
  const pending = rows.find(r => r.status === "pending");
  res.json({ paidSalary: toNum(paid?.total), pendingSalary: toNum(pending?.total), totalSalary: toNum(paid?.total) + toNum(pending?.total) });
});

export default router;
