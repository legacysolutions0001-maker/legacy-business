import { Router, type IRouter } from "express";
import { eq, sql, and } from "drizzle-orm";
import { db, leavesTable, employeesTable } from "@workspace/db";
import {
  CreateLeaveBody,
  UpdateLeaveBody,
  UpdateLeaveParams,
  ListLeavesQueryParams,
} from "@workspace/api-zod";
import { requireAuth } from "../middlewares/auth";

const router: IRouter = Router();

router.get("/leaves", requireAuth, async (req, res): Promise<void> => {
  const companyId = req.auth!.companyId;
  if (!companyId) { res.status(403).json({ error: "Company required" }); return; }

  const parsed = ListLeavesQueryParams.safeParse(req.query);
  const params = parsed.success ? parsed.data : {};

  let query = db
    .select({
      id: leavesTable.id,
      employeeId: leavesTable.employeeId,
      employeeName: employeesTable.name,
      type: leavesTable.type,
      startDate: leavesTable.startDate,
      endDate: leavesTable.endDate,
      status: leavesTable.status,
      reason: leavesTable.reason,
      createdAt: leavesTable.createdAt,
    })
    .from(leavesTable)
    .leftJoin(employeesTable, and(eq(leavesTable.employeeId, employeesTable.id), eq(employeesTable.companyId, companyId)))
    .where(eq(employeesTable.companyId, companyId))
    .$dynamic();

  if (params.status) {
    query = query.where(and(eq(employeesTable.companyId, companyId), eq(leavesTable.status, params.status as string)));
  } else if (params.employeeId) {
    query = query.where(and(eq(employeesTable.companyId, companyId), eq(leavesTable.employeeId, Number(params.employeeId))));
  }

  const rows = await query.orderBy(sql`${leavesTable.createdAt} DESC`);
  res.json(rows);
});

router.post("/leaves", requireAuth, async (req, res): Promise<void> => {
  const companyId = req.auth!.companyId;
  if (!companyId) { res.status(403).json({ error: "Company required" }); return; }
  const parsed = CreateLeaveBody.safeParse(req.body);
  if (!parsed.success) { res.status(400).json({ error: parsed.error.message }); return; }
  // Verify employee belongs to this company
  const [emp] = await db.select({ id: employeesTable.id }).from(employeesTable)
    .where(and(eq(employeesTable.id, parsed.data.employeeId), eq(employeesTable.companyId, companyId))).limit(1);
  if (!emp) { res.status(403).json({ error: "Employee not found in your company" }); return; }
  const [row] = await db.insert(leavesTable).values(parsed.data).returning();
  res.status(201).json({ ...row, employeeName: null });
});

router.patch("/leaves/:id", requireAuth, async (req, res): Promise<void> => {
  const companyId = req.auth!.companyId;
  if (!companyId) { res.status(403).json({ error: "Company required" }); return; }
  const params = UpdateLeaveParams.safeParse(req.params);
  if (!params.success) { res.status(400).json({ error: "Invalid id" }); return; }
  const parsed = UpdateLeaveBody.safeParse(req.body);
  if (!parsed.success) { res.status(400).json({ error: parsed.error.message }); return; }
  // Verify leave belongs to an employee of this company
  const [leave] = await db.select({ employeeId: leavesTable.employeeId }).from(leavesTable)
    .where(eq(leavesTable.id, params.data.id)).limit(1);
  if (!leave) { res.status(404).json({ error: "Not found" }); return; }
  const [emp] = await db.select({ id: employeesTable.id }).from(employeesTable)
    .where(and(eq(employeesTable.id, leave.employeeId), eq(employeesTable.companyId, companyId))).limit(1);
  if (!emp) { res.status(403).json({ error: "Forbidden" }); return; }
  const [row] = await db.update(leavesTable).set(parsed.data).where(eq(leavesTable.id, params.data.id)).returning();
  res.json({ ...row, employeeName: null });
});

export default router;
