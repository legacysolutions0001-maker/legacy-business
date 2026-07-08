import { Router } from "express";
import { db, legacyBusinessSettingsTable, companiesTable } from "@workspace/db";
import { eq } from "drizzle-orm";
import { requireAuth, requireSuperAdmin } from "../middlewares/auth";

const router = Router();

// ── Company-level settings (any authenticated company user) ──────────────────

const DEFAULT_INVOICE_SETTINGS = {
  defaultGst: "18",
  paymentTerms: "30",
  invoicePrefix: "INV",
  nextNumber: "1",
  notes: "Thank you for your business!",
};

router.get("/settings", requireAuth, async (req, res) => {
  const companyId = req.auth!.companyId;
  if (!companyId) { res.status(403).json({ error: "Company required" }); return; }
  const [company] = await db.select().from(companiesTable).where(eq(companiesTable.id, companyId)).limit(1);
  let invoice = { ...DEFAULT_INVOICE_SETTINGS };
  if (company?.invoiceSettingsJson) {
    try { invoice = { ...invoice, ...JSON.parse(company.invoiceSettingsJson) }; } catch {}
  }
  res.json({ company: company ?? {}, invoice });
});

router.patch("/settings/company", requireAuth, async (req, res) => {
  const companyId = req.auth!.companyId;
  if (!companyId) { res.status(403).json({ error: "Company required" }); return; }
  const allowed = ["name", "ownerName", "gstNumber", "panNumber", "address", "city", "state", "pincode", "country", "mobile", "email", "logoUrl"];
  const update: any = {};
  for (const k of allowed) if (req.body[k] !== undefined) update[k] = req.body[k];
  if (Object.keys(update).length === 0) { res.status(400).json({ error: "No valid fields to update" }); return; }
  await db.update(companiesTable).set(update).where(eq(companiesTable.id, companyId));
  res.json({ success: true });
});

router.patch("/settings/invoice", requireAuth, async (req, res) => {
  const companyId = req.auth!.companyId;
  if (!companyId) { res.status(403).json({ error: "Company required" }); return; }
  const allowed = ["defaultGst", "paymentTerms", "invoicePrefix", "nextNumber", "notes"];
  const [company] = await db.select().from(companiesTable).where(eq(companiesTable.id, companyId)).limit(1);
  let existing: any = { ...DEFAULT_INVOICE_SETTINGS };
  if (company?.invoiceSettingsJson) {
    try { existing = { ...existing, ...JSON.parse(company.invoiceSettingsJson) }; } catch {}
  }
  for (const k of allowed) if (req.body[k] !== undefined) existing[k] = req.body[k];
  await db.update(companiesTable).set({ invoiceSettingsJson: JSON.stringify(existing) }).where(eq(companiesTable.id, companyId));
  res.json({ success: true });
});

// ── Super-admin: Legacy Business global settings ─────────────────────────────

router.get("/settings/legacy-business", requireSuperAdmin, async (req, res) => {
  const [row] = await db.select().from(legacyBusinessSettingsTable).limit(1);
  res.json(row ?? {});
});

router.patch("/settings/legacy-business", requireSuperAdmin, async (req, res) => {
  const [existing] = await db.select().from(legacyBusinessSettingsTable).limit(1);
  if (existing) {
    await db.update(legacyBusinessSettingsTable).set(req.body).where(eq(legacyBusinessSettingsTable.id, existing.id));
  } else {
    await db.insert(legacyBusinessSettingsTable).values(req.body);
  }
  res.json({ success: true });
});

export default router;
