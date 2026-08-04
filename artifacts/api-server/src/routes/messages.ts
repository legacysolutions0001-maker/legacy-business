import { Router } from "express";
import { db, messagesTable, usersTable } from "@workspace/db";
import { eq, sql, and, or, isNull } from "drizzle-orm";
import { requireAuth, requireSuperAdmin } from "../middlewares/auth";

const router = Router();
router.use(requireAuth);

router.get("/messages", async (req, res) => {
  const { companyId, userId, role } = req.auth!;

  if (role === "super_admin") {
    const rows = await db.select().from(messagesTable)
      .where(isNull(messagesTable.companyId))
      .orderBy(sql`${messagesTable.createdAt} DESC`)
      .limit(100);
    res.json(rows);
    return;
  }

  if (!companyId) { res.status(403).json({ error: "Company required" }); return; }

  const rows = await db.select().from(messagesTable)
    .where(and(
      eq(messagesTable.companyId, companyId),
      or(
        eq(messagesTable.senderId, userId),
        eq(messagesTable.receiverId, userId),
        isNull(messagesTable.receiverId)
      )
    ))
    .orderBy(sql`${messagesTable.createdAt} DESC`)
    .limit(100);
  res.json(rows);
});

router.get("/messages/unread", async (req, res) => {
  const { companyId, userId, role } = req.auth!;
  if (role === "super_admin") {
    const [r] = await db.select({ count: sql<number>`count(*)::int` }).from(messagesTable)
      .where(and(isNull(messagesTable.companyId), eq(messagesTable.receiverId, userId), eq(messagesTable.isRead, false)));
    res.json({ count: r?.count ?? 0 });
    return;
  }
  if (!companyId) { res.status(403).json({ error: "Company required" }); return; }
  const [r] = await db.select({ count: sql<number>`count(*)::int` }).from(messagesTable)
    .where(and(eq(messagesTable.companyId, companyId), eq(messagesTable.receiverId, userId), eq(messagesTable.isRead, false)));
  res.json({ count: r?.count ?? 0 });
});

router.post("/messages", async (req, res) => {
  const { companyId, userId, name, role } = req.auth!;
  const { message, receiverId, receiverName } = req.body;
  if (!message?.trim()) { res.status(400).json({ error: "Message required" }); return; }

  if (role === "super_admin") {
    const [row] = await db.insert(messagesTable).values({
      companyId: receiverId ? undefined : null,
      senderId: userId, senderName: name,
      receiverId: receiverId || null, receiverName: receiverName || null,
      message: message.trim(), isAnnouncement: false, isRead: false,
    } as any).returning();
    res.json(row);
    return;
  }

  if (!companyId) { res.status(403).json({ error: "Company required" }); return; }

  const [row] = await db.insert(messagesTable).values({
    companyId,
    senderId: userId, senderName: name,
    receiverId: receiverId || null, receiverName: receiverName || null,
    message: message.trim(), isAnnouncement: false, isRead: false,
  }).returning();
  res.json(row);
});

router.patch("/messages/:id/read", async (req, res) => {
  const { userId } = req.auth!;
  await db.update(messagesTable).set({ isRead: true }).where(and(eq(messagesTable.id, Number(req.params.id)), eq(messagesTable.receiverId, userId)));
  res.json({ success: true });
});

router.patch("/messages/read-all", async (req, res) => {
  const { companyId, userId } = req.auth!;
  if (!companyId) { res.status(403).json({ error: "Company required" }); return; }
  await db.update(messagesTable).set({ isRead: true }).where(and(eq(messagesTable.companyId, companyId), eq(messagesTable.receiverId, userId)));
  res.json({ success: true });
});

router.delete("/messages/:id", async (req, res) => {
  const { userId } = req.auth!;
  await db.delete(messagesTable).where(and(eq(messagesTable.id, Number(req.params.id)), eq(messagesTable.senderId, userId)));
  res.json({ success: true });
});

router.get("/messages/users", async (req, res) => {
  const { companyId, userId, role } = req.auth!;
  if (role === "super_admin") {
    res.json([]);
    return;
  }
  if (!companyId) { res.status(403).json({ error: "Company required" }); return; }
  const rows = await db.select({ id: usersTable.id, name: usersTable.name, role: usersTable.role }).from(usersTable)
    .where(and(eq(usersTable.companyId, companyId), sql`${usersTable.id} != ${userId}`));
  res.json(rows);
});

export default router;
