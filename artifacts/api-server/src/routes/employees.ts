import { Router } from "express";
import { db, employeesTable, attendanceTable, salaryRecordsTable } from "@workspace/db";
import { eq, ilike, sql, and, count } from "drizzle-orm";
import { requireResolvedCompany, resolveCompanyId } from "../middlewares/auth";

const router = Router();
const toNum = (v: any) => v != null ? Number(v) : null;

router.get("/hr/summary", requireResolvedCompany, async (req, res) => {
  const companyId = resolveCompanyId(req);
  if (!companyId) { res.status(403).json({ error: "Company required" }); return; }
  const today = new Date().toISOString().split("T")[0];
  const [total, active, presentToday, byDept] = await Promise.all([
    db.select({ count: count() }).from(employeesTable).where(eq(employeesTable.companyId, companyId)),
    db.select({ count: count() }).from(employeesTable).where(and(eq(employeesTable.companyId, companyId), eq(employeesTable.status, "active"))),
    db.select({ count: count() }).from(attendanceTable).where(and(eq(attendanceTable.companyId, companyId), eq(attendanceTable.date, today), eq(attendanceTable.status, "present"))),
    db.select({ department: employeesTable.department, cnt: count() }).from(employeesTable).where(eq(employeesTable.companyId, companyId)).groupBy(employeesTable.department),
  ]);
  res.json({ totalEmployees: total[0]?.count ?? 0, activeEmployees: active[0]?.count ?? 0, presentToday: presentToday[0]?.count ?? 0, byDepartment: byDept.map(r => ({ label: r.department, value: r.cnt })) });
});

router.get("/employees", requireResolvedCompany, async (req, res) => {
  const companyId = resolveCompanyId(req);
  if (!companyId) { res.status(403).json({ error: "Company required" }); return; }
  const { search, department } = req.query as { search?: string; department?: string };
  let query = db.select().from(employeesTable).where(eq(employeesTable.companyId, companyId)).$dynamic();
  if (department) query = query.where(and(eq(employeesTable.companyId, companyId), eq(employeesTable.department, department)));
  else if (search) query = query.where(and(eq(employeesTable.companyId, companyId), ilike(employeesTable.name, `%${search}%`)));
  const rows = await query.orderBy(sql`${employeesTable.createdAt} DESC`);
  res.json(rows.map(r => ({ ...r, basicSalary: toNum(r.basicSalary) })));
});

router.post("/employees", requireResolvedCompany, async (req, res) => {
  const companyId = resolveCompanyId(req);
  if (!companyId) { res.status(403).json({ error: "Company required" }); return; }
  const b = req.body;
  // Map frontend field aliases → DB column names
  const joiningDate = b.joiningDate || b.joinDate || b.hireDate || new Date().toISOString().split("T")[0];
  const basicSalary = b.basicSalary != null ? String(b.basicSalary) : b.salary != null ? String(b.salary) : null;
  const data = {
    companyId,
    name: b.name,
    email: b.email || null,
    phone: b.phone || b.mobile || null,
    aadhaar: b.aadhaar || null,
    address: b.address || null,
    department: b.department || null,
    position: b.position,
    role: b.role || "worker",
    status: b.status || "active",
    basicSalary,
    joiningDate,
    avatar: b.avatar || null,
  };
  try {
    const [row] = await db.insert(employeesTable).values(data).returning();
    res.status(201).json({ ...row, basicSalary: toNum(row.basicSalary) });
  } catch (e: any) {
    res.status(500).json({ error: e.message });
  }
});

router.get("/employees/:id", requireResolvedCompany, async (req, res) => {
  const companyId = resolveCompanyId(req);
  const id = parseInt(req.params.id as string);
  const [row] = await db.select().from(employeesTable).where(and(eq(employeesTable.id, id), eq(employeesTable.companyId, companyId!))).limit(1);
  if (!row) { res.status(404).json({ error: "Not found" }); return; }
  const attendance = await db.select().from(attendanceTable).where(and(eq(attendanceTable.employeeId, id), eq(attendanceTable.companyId, companyId!))).orderBy(sql`${attendanceTable.date} DESC`).limit(30);
  const salary = await db.select().from(salaryRecordsTable).where(and(eq(salaryRecordsTable.employeeId, id), eq(salaryRecordsTable.companyId, companyId!))).orderBy(sql`${salaryRecordsTable.year} DESC, ${salaryRecordsTable.month} DESC`).limit(12);
  res.json({ ...row, basicSalary: toNum(row.basicSalary), attendance, salary });
});

router.patch("/employees/:id", requireResolvedCompany, async (req, res) => {
  const companyId = resolveCompanyId(req);
  const b = req.body;
  const update: any = {};
  const allowed = ["name","email","phone","aadhaar","address","department","position","role","status","basicSalary","joiningDate","avatar"];
  for (const k of allowed) if (b[k] !== undefined) update[k] = k === "basicSalary" ? String(b[k]) : b[k];
  // Handle field aliases from frontend
  if (b.salary != null && update.basicSalary == null) update.basicSalary = String(b.salary);
  if (b.mobile != null && update.phone == null) update.phone = b.mobile;
  if (b.hireDate != null && update.joiningDate == null) update.joiningDate = b.hireDate;
  if (b.joinDate != null && update.joiningDate == null) update.joiningDate = b.joinDate;
  try {
    const [row] = await db.update(employeesTable).set(update).where(and(eq(employeesTable.id, parseInt(req.params.id as string)), eq(employeesTable.companyId, companyId!))).returning();
    if (!row) { res.status(404).json({ error: "Not found" }); return; }
    res.json({ ...row, basicSalary: toNum(row.basicSalary) });
  } catch (e: any) {
    res.status(500).json({ error: e.message });
  }
});

router.delete("/employees/:id", requireResolvedCompany, async (req, res) => {
  const companyId = resolveCompanyId(req);
  await db.delete(employeesTable).where(and(eq(employeesTable.id, parseInt(req.params.id as string)), eq(employeesTable.companyId, companyId!)));
  res.sendStatus(204);
});

router.get("/attendance", requireResolvedCompany, async (req, res) => {
  const companyId = resolveCompanyId(req);
  if (!companyId) { res.status(403).json({ error: "Company required" }); return; }
  const { date, month, year, employeeId } = req.query as { date?: string; month?: string; year?: string; employeeId?: string };
  let query = db.select().from(attendanceTable).where(eq(attendanceTable.companyId, companyId)).$dynamic();
  if (employeeId) query = query.where(and(eq(attendanceTable.companyId, companyId), eq(attendanceTable.employeeId, parseInt(employeeId))));
  if (date) query = query.where(and(eq(attendanceTable.companyId, companyId), eq(attendanceTable.date, date)));
  const rows = await query.orderBy(sql`${attendanceTable.date} DESC`);
  res.json(rows);
});

router.post("/attendance", requireResolvedCompany, async (req, res) => {
  const companyId = resolveCompanyId(req);
  if (!companyId) { res.status(403).json({ error: "Company required" }); return; }
  const { employeeId, date, status, checkIn, checkOut, notes } = req.body;
  const existing = await db.select().from(attendanceTable).where(and(eq(attendanceTable.companyId, companyId), eq(attendanceTable.employeeId, employeeId), eq(attendanceTable.date, date))).limit(1);
  if (existing.length > 0) {
    const [row] = await db.update(attendanceTable).set({ status, checkIn, checkOut, notes }).where(eq(attendanceTable.id, existing[0].id)).returning();
    res.json(row);
  } else {
    const [row] = await db.insert(attendanceTable).values({ companyId, employeeId, date, status: status || "present", checkIn, checkOut, notes }).returning();
    res.status(201).json(row);
  }
});

router.post("/attendance/bulk", requireResolvedCompany, async (req, res) => {
  const companyId = resolveCompanyId(req);
  if (!companyId) { res.status(403).json({ error: "Company required" }); return; }
  const { date, records } = req.body as { date: string; records: Array<{ employeeId: number; status: string }> };
  for (const r of records) {
    const existing = await db.select().from(attendanceTable).where(and(eq(attendanceTable.companyId, companyId), eq(attendanceTable.employeeId, r.employeeId), eq(attendanceTable.date, date))).limit(1);
    if (existing.length > 0) {
      await db.update(attendanceTable).set({ status: r.status }).where(eq(attendanceTable.id, existing[0].id));
    } else {
      await db.insert(attendanceTable).values({ companyId, employeeId: r.employeeId, date, status: r.status });
    }
  }
  res.json({ success: true });
});

export default router;
