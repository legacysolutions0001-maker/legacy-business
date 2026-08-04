import { Router, type IRouter } from "express";
import { eq, sql, and } from "drizzle-orm";
import { db, projectsTable, tasksTable, employeesTable } from "@workspace/db";
import {
  CreateProjectBody,
  UpdateProjectBody,
  UpdateProjectParams,
  GetProjectParams,
  DeleteProjectParams,
  ListProjectsQueryParams,
  CreateTaskBody,
  UpdateTaskBody,
  UpdateTaskParams,
  DeleteTaskParams,
  ListTasksQueryParams,
} from "@workspace/api-zod";
import { count } from "drizzle-orm";
import { requireResolvedCompany, resolveCompanyId } from "../middlewares/auth";

const router: IRouter = Router();

// Projects
router.get("/projects", requireResolvedCompany, async (req, res): Promise<void> => {
  const companyId = resolveCompanyId(req);
  if (!companyId) { res.status(403).json({ error: "Company required" }); return; }

  const parsed = ListProjectsQueryParams.safeParse(req.query);
  const params = parsed.success ? parsed.data : {};

  let projectQuery = db.select().from(projectsTable).where(eq(projectsTable.companyId, companyId)).$dynamic();
  if (params.status) {
    projectQuery = projectQuery.where(and(eq(projectsTable.companyId, companyId), eq(projectsTable.status, params.status)));
  }
  const projects = await projectQuery.orderBy(sql`${projectsTable.createdAt} DESC`);

  const enriched = await Promise.all(
    projects.map(async (p) => {
      const [taskCounts] = await db
        .select({ total: count(), done: sql<number>`COUNT(*) FILTER (WHERE status = 'done')` })
        .from(tasksTable)
        .where(eq(tasksTable.projectId, p.id));
      return {
        ...p,
        budget: p.budget != null ? Number(p.budget) : null,
        taskCount: taskCounts?.total ?? 0,
        completedTaskCount: Number(taskCounts?.done ?? 0),
      };
    })
  );

  res.json(enriched);
});

router.post("/projects", requireResolvedCompany, async (req, res): Promise<void> => {
  const companyId = resolveCompanyId(req);
  if (!companyId) { res.status(403).json({ error: "Company required" }); return; }
  const parsed = CreateProjectBody.safeParse(req.body);
  if (!parsed.success) { res.status(400).json({ error: parsed.error.message }); return; }
  const [row] = await db.insert(projectsTable).values({
    ...parsed.data,
    companyId,
    budget: parsed.data.budget != null ? String(parsed.data.budget) : undefined,
  }).returning();
  res.status(201).json({ ...row, budget: row.budget != null ? Number(row.budget) : null, taskCount: 0, completedTaskCount: 0 });
});

router.get("/projects/:id", requireResolvedCompany, async (req, res): Promise<void> => {
  const companyId = resolveCompanyId(req);
  if (!companyId) { res.status(403).json({ error: "Company required" }); return; }
  const params = GetProjectParams.safeParse(req.params);
  if (!params.success) { res.status(400).json({ error: "Invalid id" }); return; }
  const [row] = await db.select().from(projectsTable).where(and(eq(projectsTable.id, params.data.id), eq(projectsTable.companyId, companyId)));
  if (!row) { res.status(404).json({ error: "Not found" }); return; }
  res.json({ ...row, budget: row.budget != null ? Number(row.budget) : null });
});

router.patch("/projects/:id", requireResolvedCompany, async (req, res): Promise<void> => {
  const companyId = resolveCompanyId(req);
  if (!companyId) { res.status(403).json({ error: "Company required" }); return; }
  const params = UpdateProjectParams.safeParse(req.params);
  if (!params.success) { res.status(400).json({ error: "Invalid id" }); return; }
  const parsed = UpdateProjectBody.safeParse(req.body);
  if (!parsed.success) { res.status(400).json({ error: parsed.error.message }); return; }
  const [row] = await db.update(projectsTable).set({
    ...parsed.data,
    budget: parsed.data.budget != null ? String(parsed.data.budget) : undefined,
  }).where(and(eq(projectsTable.id, params.data.id), eq(projectsTable.companyId, companyId))).returning();
  if (!row) { res.status(404).json({ error: "Not found" }); return; }
  res.json({ ...row, budget: row.budget != null ? Number(row.budget) : null });
});

router.delete("/projects/:id", requireResolvedCompany, async (req, res): Promise<void> => {
  const companyId = resolveCompanyId(req);
  if (!companyId) { res.status(403).json({ error: "Company required" }); return; }
  const params = DeleteProjectParams.safeParse(req.params);
  if (!params.success) { res.status(400).json({ error: "Invalid id" }); return; }
  await db.delete(projectsTable).where(and(eq(projectsTable.id, params.data.id), eq(projectsTable.companyId, companyId)));
  res.sendStatus(204);
});

// Tasks
router.get("/tasks", requireResolvedCompany, async (req, res): Promise<void> => {
  const companyId = resolveCompanyId(req);
  if (!companyId) { res.status(403).json({ error: "Company required" }); return; }

  const parsed = ListTasksQueryParams.safeParse(req.query);
  const params = parsed.success ? parsed.data : {};

  let query = db
    .select({
      id: tasksTable.id,
      title: tasksTable.title,
      description: tasksTable.description,
      status: tasksTable.status,
      priority: tasksTable.priority,
      projectId: tasksTable.projectId,
      projectName: projectsTable.name,
      assigneeId: tasksTable.assigneeId,
      assigneeName: employeesTable.name,
      dueDate: tasksTable.dueDate,
      createdAt: tasksTable.createdAt,
      updatedAt: tasksTable.updatedAt,
    })
    .from(tasksTable)
    .leftJoin(projectsTable, and(eq(tasksTable.projectId, projectsTable.id), eq(projectsTable.companyId, companyId)))
    .leftJoin(employeesTable, eq(tasksTable.assigneeId, employeesTable.id))
    .where(eq(projectsTable.companyId, companyId))
    .$dynamic();

  if (params.projectId) {
    query = query.where(and(eq(projectsTable.companyId, companyId), eq(tasksTable.projectId, Number(params.projectId))));
  } else if (params.status) {
    query = query.where(and(eq(projectsTable.companyId, companyId), eq(tasksTable.status, params.status as string)));
  }

  const rows = await query.orderBy(sql`${tasksTable.createdAt} DESC`);
  res.json(rows);
});

router.post("/tasks", requireResolvedCompany, async (req, res): Promise<void> => {
  const companyId = resolveCompanyId(req);
  if (!companyId) { res.status(403).json({ error: "Company required" }); return; }
  const parsed = CreateTaskBody.safeParse(req.body);
  if (!parsed.success) { res.status(400).json({ error: parsed.error.message }); return; }
  // Verify project belongs to company
  if (parsed.data.projectId) {
    const [proj] = await db.select({ id: projectsTable.id }).from(projectsTable)
      .where(and(eq(projectsTable.id, parsed.data.projectId), eq(projectsTable.companyId, companyId))).limit(1);
    if (!proj) { res.status(403).json({ error: "Project not found in your company" }); return; }
  }
  const [row] = await db.insert(tasksTable).values(parsed.data).returning();
  res.status(201).json({ ...row, projectName: null, assigneeName: null });
});

router.patch("/tasks/:id", requireResolvedCompany, async (req, res): Promise<void> => {
  const companyId = resolveCompanyId(req);
  if (!companyId) { res.status(403).json({ error: "Company required" }); return; }
  const params = UpdateTaskParams.safeParse(req.params);
  if (!params.success) { res.status(400).json({ error: "Invalid id" }); return; }
  const parsed = UpdateTaskBody.safeParse(req.body);
  if (!parsed.success) { res.status(400).json({ error: parsed.error.message }); return; }
  // Verify task's project belongs to company
  const [task] = await db.select({ projectId: tasksTable.projectId }).from(tasksTable)
    .where(eq(tasksTable.id, params.data.id)).limit(1);
  if (!task) { res.status(404).json({ error: "Not found" }); return; }
  if (task.projectId) {
    const [proj] = await db.select({ id: projectsTable.id }).from(projectsTable)
      .where(and(eq(projectsTable.id, task.projectId), eq(projectsTable.companyId, companyId))).limit(1);
    if (!proj) { res.status(403).json({ error: "Forbidden" }); return; }
  }
  const [row] = await db.update(tasksTable).set(parsed.data).where(eq(tasksTable.id, params.data.id)).returning();
  if (!row) { res.status(404).json({ error: "Not found" }); return; }
  res.json({ ...row, projectName: null, assigneeName: null });
});

router.delete("/tasks/:id", requireResolvedCompany, async (req, res): Promise<void> => {
  const companyId = resolveCompanyId(req);
  if (!companyId) { res.status(403).json({ error: "Company required" }); return; }
  const params = DeleteTaskParams.safeParse(req.params);
  if (!params.success) { res.status(400).json({ error: "Invalid id" }); return; }
  // Verify task's project belongs to company
  const [task] = await db.select({ projectId: tasksTable.projectId }).from(tasksTable)
    .where(eq(tasksTable.id, params.data.id)).limit(1);
  if (!task) { res.status(404).json({ error: "Not found" }); return; }
  if (task.projectId) {
    const [proj] = await db.select({ id: projectsTable.id }).from(projectsTable)
      .where(and(eq(projectsTable.id, task.projectId), eq(projectsTable.companyId, companyId))).limit(1);
    if (!proj) { res.status(403).json({ error: "Forbidden" }); return; }
  }
  await db.delete(tasksTable).where(eq(tasksTable.id, params.data.id));
  res.sendStatus(204);
});

export default router;
