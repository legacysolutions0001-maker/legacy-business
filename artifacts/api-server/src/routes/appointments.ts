import { Router, type IRouter } from "express";
import { eq, sql } from "drizzle-orm";
import { db, appointmentsTable } from "@workspace/db";
import {
  CreateAppointmentBody,
  UpdateAppointmentBody,
  UpdateAppointmentParams,
  DeleteAppointmentParams,
  ListAppointmentsQueryParams,
} from "@workspace/api-zod";
import { requireResolvedCompany } from "../middlewares/auth";

const router: IRouter = Router();

router.get("/appointments", requireResolvedCompany, async (req, res): Promise<void> => {
  const parsed = ListAppointmentsQueryParams.safeParse(req.query);
  const params = parsed.success ? parsed.data : {};

  let query = db.select().from(appointmentsTable).$dynamic();
  if (params.status) {
    query = query.where(eq(appointmentsTable.status, params.status));
  } else if (params.date) {
    query = query.where(eq(appointmentsTable.date, params.date as string));
  }

  const rows = await query.orderBy(sql`${appointmentsTable.date} ASC, ${appointmentsTable.time} ASC`);
  res.json(rows);
});

router.post("/appointments", requireResolvedCompany, async (req, res): Promise<void> => {
  const parsed = CreateAppointmentBody.safeParse(req.body);
  if (!parsed.success) { res.status(400).json({ error: parsed.error.message }); return; }
  const [row] = await db.insert(appointmentsTable).values(parsed.data).returning();
  res.status(201).json(row);
});

router.patch("/appointments/:id", requireResolvedCompany, async (req, res): Promise<void> => {
  const params = UpdateAppointmentParams.safeParse(req.params);
  if (!params.success) { res.status(400).json({ error: "Invalid id" }); return; }
  const parsed = UpdateAppointmentBody.safeParse(req.body);
  if (!parsed.success) { res.status(400).json({ error: parsed.error.message }); return; }
  const [row] = await db.update(appointmentsTable).set(parsed.data).where(eq(appointmentsTable.id, params.data.id)).returning();
  if (!row) { res.status(404).json({ error: "Not found" }); return; }
  res.json(row);
});

router.delete("/appointments/:id", requireResolvedCompany, async (req, res): Promise<void> => {
  const params = DeleteAppointmentParams.safeParse(req.params);
  if (!params.success) { res.status(400).json({ error: "Invalid id" }); return; }
  await db.delete(appointmentsTable).where(eq(appointmentsTable.id, params.data.id));
  res.sendStatus(204);
});

export default router;
