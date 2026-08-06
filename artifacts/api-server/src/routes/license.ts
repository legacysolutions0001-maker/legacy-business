/**
 * License & Activation Routes
 *
 * POST /api/license/verify          — verify company code + license key against Firebase
 * POST /api/license/activate        — complete activation (creates company + ALL licensed users)
 * POST /api/license/generate        — super admin: generate a license key for a company (also syncs to Firebase)
 * GET  /api/license/status          — current license status for authenticated company
 * GET  /api/license/devices         — list activated devices for current company
 * DELETE /api/license/devices/:id   — revoke a device (super admin only)
 */
import { Router } from "express";
import bcrypt from "bcryptjs";
import { db, companiesTable, usersTable, activatedDevicesTable } from "@workspace/db";
import { eq, and, count } from "drizzle-orm";
import { requireAuth, requireSuperAdmin } from "../middlewares/auth";
import {
  verifyLicenseInFirestore,
  syncCompanyToFirestore,
  activateCompanyInFirestore,
  generateLicenseKey,
} from "../lib/firebase-admin";

const router = Router();

// ─── POST /api/license/verify ─────────────────────────────────────────────────
// Called by the SetupWizard during first activation.
// Verifies company code + license key against Firebase Firestore.
router.post("/license/verify", async (req, res) => {
  const { companyCode, licenseKey } = req.body as { companyCode: string; licenseKey: string };
  if (!companyCode || !licenseKey) {
    res.status(400).json({ error: "Company code and license key are required" });
    return;
  }
  try {
    const result = await verifyLicenseInFirestore(companyCode.toUpperCase(), licenseKey.toUpperCase());
    if (!result.valid) {
      res.status(422).json({ error: result.reason });
      return;
    }
    // Return limits so the frontend can display them
    res.json({
      valid: true,
      companyName: result.company?.companyName,
      maxUsers: result.company?.maxUsers ?? 5,
      maxDevices: result.company?.maxDevices ?? 1,
      maxBranches: result.company?.maxBranches ?? 1,
      plan: result.company?.plan ?? "starter",
      subscriptionExpiry: result.company?.subscriptionExpiry ?? null,
    });
  } catch (err: any) {
    res.status(500).json({ error: `License verification failed: ${err.message}` });
  }
});

// ─── POST /api/license/activate ───────────────────────────────────────────────
// Completes activation: upserts the company in PostgreSQL, creates ALL licensed users.
// The users array must contain credentials for every licensed user slot.
router.post("/license/activate", async (req, res) => {
  const {
    companyCode,
    licenseKey,
    // Company details collected during registration wizard
    companyName,
    ownerName,
    mobile,
    email,
    dataPath,
    deviceId,
    deviceName,
    deviceOs,
    // ALL licensed users — array of { username, password, name?, role? }
    users,
    // Legacy single-owner fields (kept for backward compatibility)
    ownerUsername,
    ownerPassword,
  } = req.body as {
    companyCode: string;
    licenseKey: string;
    companyName?: string;
    ownerName?: string;
    mobile?: string;
    email?: string;
    dataPath?: string;
    deviceId?: string;
    deviceName?: string;
    deviceOs?: string;
    users?: Array<{ username: string; password: string; name?: string; role?: string }>;
    ownerUsername?: string;
    ownerPassword?: string;
  };

  if (!companyCode || !licenseKey) {
    res.status(400).json({ error: "Company code and license key are required" });
    return;
  }

  // Build users array — support both new multi-user format and legacy single-owner format
  let usersToCreate: Array<{ username: string; password: string; name?: string; role: string }> = [];

  if (users && Array.isArray(users) && users.length > 0) {
    usersToCreate = users.map((u, i) => ({
      username: (u.username || "").trim().toLowerCase(),
      password: u.password || "",
      name: u.name || u.username,
      role: u.role || (i === 0 ? "owner" : "employee"),
    }));
  } else if (ownerUsername && ownerPassword) {
    // Legacy path
    usersToCreate = [{ username: ownerUsername.trim().toLowerCase(), password: ownerPassword, role: "owner" }];
  } else {
    res.status(400).json({ error: "At least one user (username + password) is required" });
    return;
  }

  // Validate all users
  for (const u of usersToCreate) {
    if (!u.username) {
      res.status(400).json({ error: "All users must have a username" });
      return;
    }
    if (!u.password || u.password.length < 6) {
      res.status(400).json({ error: `Password for user '${u.username}' must be at least 6 characters` });
      return;
    }
  }

  // Re-verify against Firebase before proceeding
  const verifyResult = await verifyLicenseInFirestore(companyCode.toUpperCase(), licenseKey.toUpperCase());
  if (!verifyResult.valid) {
    res.status(422).json({ error: verifyResult.reason });
    return;
  }
  const fireData = verifyResult.company!;

  // Check if company already activated in PostgreSQL
  const [existingCompany] = await db
    .select()
    .from(companiesTable)
    .where(eq(companiesTable.code, companyCode.toUpperCase()))
    .limit(1);

  let companyId: number;

  if (existingCompany) {
    // Company already registered — update details + activation status
    await db.update(companiesTable).set({
      activationStatus: "active",
      licenseKey: licenseKey.toUpperCase(),
      maxUsers: fireData.maxUsers,
      maxDevices: fireData.maxDevices,
      maxBranches: fireData.maxBranches,
      ...(companyName ? { name: companyName } : {}),
      ...(ownerName ? { ownerName } : {}),
      ...(mobile ? { mobile } : {}),
      ...(email ? { email } : {}),
    }).where(eq(companiesTable.id, existingCompany.id));
    companyId = existingCompany.id;
  } else {
    // First activation — create company record with all provided details
    const [company] = await db.insert(companiesTable).values({
      code: companyCode.toUpperCase(),
      name: companyName || fireData.companyName,
      ownerName: ownerName || fireData.ownerName || "",
      mobile: mobile || fireData.phone || "",
      email: email || fireData.email || "",
      licenseKey: licenseKey.toUpperCase(),
      maxUsers: fireData.maxUsers,
      maxDevices: fireData.maxDevices,
      maxBranches: fireData.maxBranches,
      activationStatus: "active",
      subscriptionStatus: fireData.subscriptionStatus ?? "active",
      subscriptionEnd: fireData.subscriptionExpiry ?? undefined,
      plan: fireData.plan ?? "starter",
    }).returning();
    companyId = company.id;
  }

  // Create ALL licensed users (skip if username already exists for this company)
  const createdUsers: string[] = [];
  for (const u of usersToCreate) {
    const [existingUser] = await db
      .select()
      .from(usersTable)
      .where(and(eq(usersTable.companyId, companyId), eq(usersTable.username, u.username)))
      .limit(1);

    if (!existingUser) {
      const hash = await bcrypt.hash(u.password, 10);
      await db.insert(usersTable).values({
        companyId,
        username: u.username,
        passwordHash: hash,
        name: u.name || u.username,
        role: u.role as any,
        isActive: true,
      });
      createdUsers.push(u.username);
    }
  }

  // Register this device (if deviceId provided)
  if (deviceId) {
    const [existingDevice] = await db
      .select()
      .from(activatedDevicesTable)
      .where(and(eq(activatedDevicesTable.companyId, companyId), eq(activatedDevicesTable.deviceId, deviceId)))
      .limit(1);

    if (!existingDevice) {
      // Check device limit
      const [{ cnt }] = await db
        .select({ cnt: count() })
        .from(activatedDevicesTable)
        .where(and(eq(activatedDevicesTable.companyId, companyId), eq(activatedDevicesTable.isActive, 1)));

      const [co] = await db.select({ maxDevices: companiesTable.maxDevices }).from(companiesTable).where(eq(companiesTable.id, companyId)).limit(1);
      if (co && Number(cnt) >= co.maxDevices) {
        res.status(422).json({ error: `Device limit (${co.maxDevices}) reached for this license. Please contact support to add more devices.` });
        return;
      }
      await db.insert(activatedDevicesTable).values({ companyId, deviceId, deviceName, deviceOs });
    } else {
      await db.update(activatedDevicesTable).set({ lastSeen: new Date(), deviceName: deviceName ?? undefined }).where(eq(activatedDevicesTable.id, existingDevice.id));
    }
  }

  // Mark as activated in Firebase
  try {
    await activateCompanyInFirestore(companyCode.toUpperCase());
  } catch {
    // Non-fatal — local activation already succeeded
  }

  req.log.info({ companyCode, companyId, createdUsers }, "Company activated with all licensed users");
  res.json({
    success: true,
    companyId,
    companyCode: companyCode.toUpperCase(),
    companyName: companyName || fireData.companyName,
    createdUsers,
  });
});

// ─── POST /api/license/generate ───────────────────────────────────────────────
// Super admin: generate license key for a company and sync to Firebase.
router.post("/license/generate", requireSuperAdmin, async (req, res) => {
  const {
    companyId,
    maxUsers = 5,
    maxDevices = 1,
    maxBranches = 1,
    plan = "starter",
    subscriptionExpiry,
    licenseKey: providedKey,
  } = req.body as {
    companyId: number;
    maxUsers?: number;
    maxDevices?: number;
    maxBranches?: number;
    plan?: string;
    subscriptionExpiry?: string;
    licenseKey?: string;
  };

  if (!companyId) {
    res.status(400).json({ error: "Company ID required" });
    return;
  }

  const [company] = await db.select().from(companiesTable).where(eq(companiesTable.id, companyId)).limit(1);
  if (!company) {
    res.status(404).json({ error: "Company not found" });
    return;
  }

  const licenseKey = (providedKey || generateLicenseKey()).toUpperCase();

  // Update PostgreSQL
  await db.update(companiesTable).set({
    licenseKey,
    maxUsers,
    maxDevices,
    maxBranches,
    plan,
    subscriptionEnd: subscriptionExpiry ?? undefined,
    activationStatus: "active",
    subscriptionStatus: "active",
  }).where(eq(companiesTable.id, companyId));

  // Sync to Firebase Firestore
  try {
    const firebaseId = await syncCompanyToFirestore({
      companyCode: company.code,
      companyName: company.name,
      licenseKey,
      maxUsers,
      maxDevices,
      maxBranches,
      subscriptionStatus: "active",
      subscriptionExpiry: subscriptionExpiry ?? null,
      activationStatus: "active",
      plan,
      ownerName: company.ownerName ?? undefined,
      email: company.email ?? undefined,
      phone: company.mobile ?? undefined,
      createdAt: company.createdAt.toISOString(),
      updatedAt: new Date().toISOString(),
    });

    await db.update(companiesTable).set({ firebaseId }).where(eq(companiesTable.id, companyId));
    req.log.info({ companyId, licenseKey, firebaseId }, "License generated and synced to Firebase");
  } catch (fbErr: any) {
    req.log.warn({ err: fbErr.message }, "Firebase sync failed — license key still saved locally");
  }

  res.json({ success: true, licenseKey, companyCode: company.code });
});

// ─── GET /api/license/status ──────────────────────────────────────────────────
// Returns current license status for the authenticated company.
router.get("/license/status", requireAuth, async (req, res) => {
  if (!req.auth?.companyId) {
    res.status(403).json({ error: "Company required" });
    return;
  }
  const [company] = await db
    .select({
      licenseKey: companiesTable.licenseKey,
      maxUsers: companiesTable.maxUsers,
      maxDevices: companiesTable.maxDevices,
      maxBranches: companiesTable.maxBranches,
      activationStatus: companiesTable.activationStatus,
      subscriptionStatus: companiesTable.subscriptionStatus,
      subscriptionEnd: companiesTable.subscriptionEnd,
      plan: companiesTable.plan,
    })
    .from(companiesTable)
    .where(eq(companiesTable.id, req.auth.companyId))
    .limit(1);

  if (!company) {
    res.status(404).json({ error: "Company not found" });
    return;
  }

  // Current user count
  const [{ userCount }] = await db
    .select({ userCount: count() })
    .from(usersTable)
    .where(and(eq(usersTable.companyId, req.auth.companyId), eq(usersTable.isActive, true)));

  // Current device count
  const [{ deviceCount }] = await db
    .select({ deviceCount: count() })
    .from(activatedDevicesTable)
    .where(and(eq(activatedDevicesTable.companyId, req.auth.companyId), eq(activatedDevicesTable.isActive, 1)));

  res.json({
    ...company,
    licenseKey: company.licenseKey ? `${company.licenseKey.substring(0, 8)}****` : null, // Mask for security
    currentUsers: Number(userCount),
    currentDevices: Number(deviceCount),
  });
});

// ─── GET /api/license/devices ─────────────────────────────────────────────────
router.get("/license/devices", requireSuperAdmin, async (req, res) => {
  const companyId = parseInt(req.query.companyId as string);
  if (!companyId) {
    res.status(400).json({ error: "companyId query param required" });
    return;
  }
  const devices = await db
    .select()
    .from(activatedDevicesTable)
    .where(eq(activatedDevicesTable.companyId, companyId));
  res.json(devices);
});

// ─── DELETE /api/license/devices/:id ─────────────────────────────────────────
router.delete("/license/devices/:id", requireSuperAdmin, async (req, res) => {
  const id = parseInt(req.params.id as string);
  await db.update(activatedDevicesTable).set({ isActive: 0 }).where(eq(activatedDevicesTable.id, id));
  res.json({ success: true });
});

export default router;
