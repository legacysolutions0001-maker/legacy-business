import { Router } from "express";
import bcrypt from "bcryptjs";
import { db, usersTable, companiesTable } from "@workspace/db";
import { eq } from "drizzle-orm";
import { signToken, requireAuth } from "../middlewares/auth";

const router = Router();
const COOKIE_NAME = "lb_token";

// The app is always served over HTTPS behind Replit's proxy (both dev preview
// and production), and the frontend calls the API via a same-origin relative
// path, so a same-site cookie with `secure: true` works in every environment.
const COOKIE_OPTS = {
  httpOnly: true,
  secure: true,
  sameSite: "lax" as const,
  path: "/",
  maxAge: 7 * 24 * 60 * 60 * 1000,
};

const COOKIE_CLEAR_OPTS = {
  httpOnly: true,
  secure: true,
  sameSite: "lax" as const,
  path: "/",
};

router.post("/auth/login", async (req, res) => {
  const { username, password, companyCode } = req.body as {
    username: string;
    password: string;
    companyCode?: string;
  };

  if (!username || !password) {
    res.status(400).json({ error: "Username and password required" });
    return;
  }

  const upperCode = (companyCode || "").toUpperCase();
  const isSuperAdmin = upperCode === "SUPER" || !companyCode;

  const [user] = await db
    .select()
    .from(usersTable)
    .where(eq(usersTable.username, username.toLowerCase()))
    .limit(1);

  if (!user) {
    res.status(401).json({ error: "Invalid credentials" });
    return;
  }

  if (!user.isActive) {
    res.status(403).json({ error: "Account suspended" });
    return;
  }

  const valid = await bcrypt.compare(password, user.passwordHash);
  if (!valid) {
    res.status(401).json({ error: "Invalid credentials" });
    return;
  }

  if (isSuperAdmin && user.role !== "super_admin") {
    res.status(403).json({ error: "Super admin access required" });
    return;
  }

  let company = null;
  if (!isSuperAdmin) {
    if (!user.companyId) {
      res.status(403).json({ error: "No company associated" });
      return;
    }
    const [c] = await db
      .select()
      .from(companiesTable)
      .where(eq(companiesTable.id, user.companyId))
      .limit(1);

    if (!c || c.code !== upperCode) {
      res.status(401).json({ error: "Invalid company code" });
      return;
    }
    if (c.subscriptionStatus === "suspended") {
      res.status(403).json({ error: "Company suspended. Please contact your administrator." });
      return;
    }
    company = c;
  }

  const token = signToken({
    userId: user.id,
    username: user.username,
    role: user.role,
    companyId: user.companyId ?? null,
    name: user.name,
  });

  res.cookie(COOKIE_NAME, token, COOKIE_OPTS);
  res.json({
    user: {
      id: user.id,
      username: user.username,
      name: user.name,
      email: user.email,
      role: user.role,
      companyId: user.companyId,
    },
    company,
    token,
  });
});

router.post("/auth/logout", (req, res) => {
  res.clearCookie(COOKIE_NAME, COOKIE_CLEAR_OPTS);
  res.json({ success: true });
});

router.get("/auth/me", requireAuth, async (req, res) => {
  const [user] = await db
    .select({
      id: usersTable.id,
      username: usersTable.username,
      name: usersTable.name,
      email: usersTable.email,
      phone: usersTable.phone,
      role: usersTable.role,
      companyId: usersTable.companyId,
      isActive: usersTable.isActive,
    })
    .from(usersTable)
    .where(eq(usersTable.id, req.auth!.userId))
    .limit(1);

  if (!user) {
    res.status(404).json({ error: "User not found" });
    return;
  }

  if (!user.isActive) {
    res.status(403).json({ error: "Account suspended" });
    return;
  }

  let company = null;
  if (user.companyId) {
    const [c] = await db
      .select()
      .from(companiesTable)
      .where(eq(companiesTable.id, user.companyId))
      .limit(1);
    company = c ?? null;
  }

  res.json({ user, company });
});

router.patch("/auth/change-password", requireAuth, async (req, res) => {
  const { currentPassword, newPassword } = req.body as { currentPassword: string; newPassword: string };
  if (!currentPassword || !newPassword) {
    res.status(400).json({ error: "Both passwords required" });
    return;
  }

  const [user] = await db
    .select()
    .from(usersTable)
    .where(eq(usersTable.id, req.auth!.userId))
    .limit(1);

  if (!user) {
    res.status(404).json({ error: "User not found" });
    return;
  }

  const valid = await bcrypt.compare(currentPassword, user.passwordHash);
  if (!valid) {
    res.status(401).json({ error: "Current password incorrect" });
    return;
  }

  if (newPassword.length < 6) {
    res.status(400).json({ error: "Password must be at least 6 characters" });
    return;
  }

  const hash = await bcrypt.hash(newPassword, 10);
  await db.update(usersTable).set({ passwordHash: hash }).where(eq(usersTable.id, user.id));
  res.json({ success: true });
});

router.patch("/auth/profile", requireAuth, async (req, res) => {
  const { name, email, phone } = req.body as { name?: string; email?: string; phone?: string };
  await db.update(usersTable)
    .set({ name: name ?? undefined, email: email ?? undefined, phone: phone ?? undefined })
    .where(eq(usersTable.id, req.auth!.userId));
  res.json({ success: true });
});

export default router;
