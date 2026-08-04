import { Router } from "express";
import { db, ewayBillsTable } from "@workspace/db";
import { eq, sql, and, count } from "drizzle-orm";
import { requireResolvedCompany, resolveCompanyId } from "../middlewares/auth";

const router = Router();
const toNum = (v: any) => v != null ? Number(v) : 0;

// Auto-migrate: add any columns that exist in schema but not yet in production DB
let ewayMigrated = false;
async function ensureEwayColumns() {
  if (ewayMigrated) return;
  const cols = [
    `ALTER TABLE lb_eway_bills ADD COLUMN IF NOT EXISTS train_number TEXT`,
    `ALTER TABLE lb_eway_bills ADD COLUMN IF NOT EXISTS flight_number TEXT`,
    `ALTER TABLE lb_eway_bills ADD COLUMN IF NOT EXISTS ship_number TEXT`,
    `ALTER TABLE lb_eway_bills ADD COLUMN IF NOT EXISTS invoice_id INTEGER`,
    `ALTER TABLE lb_eway_bills ADD COLUMN IF NOT EXISTS cancel_remark TEXT`,
    `ALTER TABLE lb_eway_bills ADD COLUMN IF NOT EXISTS valid_upto TEXT`,
  ];
  for (const c of cols) {
    try { await db.execute(sql.raw(c)); } catch { /* column may already exist */ }
  }
  ewayMigrated = true;
}

router.get("/eway-bills", requireResolvedCompany, async (req, res) => {
  const companyId = resolveCompanyId(req);
  if (!companyId) { res.status(403).json({ error: "Company required" }); return; }
  try {
    await ensureEwayColumns();
    const rows = await db.select().from(ewayBillsTable).where(eq(ewayBillsTable.companyId, companyId)).orderBy(sql`${ewayBillsTable.createdAt} DESC`);
    res.json(rows.map(r => ({ ...r, invoiceValue: toNum(r.invoiceValue) })));
  } catch (e: any) {
    res.json([]);
  }
});

router.post("/eway-bills", requireResolvedCompany, async (req, res) => {
  const companyId = resolveCompanyId(req);
  if (!companyId) { res.status(403).json({ error: "Company required" }); return; }
  const data = req.body;
  const s = (v: any) => v != null ? `'${String(v).replace(/'/g, "''")}'` : 'NULL';
  try {
    // Count for auto-number
    const cnt = await db.execute(sql.raw(`SELECT COUNT(*) as c FROM lb_eway_bills WHERE company_id = ${companyId}`));
    const countVal = Number((cnt as any).rows?.[0]?.c ?? (cnt as any)[0]?.c ?? 0);
    const num = (countVal + 1).toString().padStart(4, "0");
    const ewbNumber = data.ewbNumber || `EWB-${new Date().getFullYear()}-${num}`;

    // Step 1: minimal guaranteed INSERT (only NOT NULL columns: company_id, ewb_number, status, created_at)
    const ins = await db.execute(sql.raw(
      `INSERT INTO lb_eway_bills (company_id, ewb_number, status, created_at) VALUES (${companyId}, ${s(ewbNumber)}, 'generated', NOW()) RETURNING id`
    ));
    const row: any = (ins as any).rows?.[0] ?? (ins as any)[0];
    if (!row?.id) { res.status(500).json({ error: "Insert returned no id" }); return; }
    const id = row.id;

    // Step 2: ensure all optional columns exist (best-effort migration)
    const allCols: [string, string][] = [
      ["invoice_number","TEXT"], ["invoice_date","TEXT"], ["from_gstin","TEXT"], ["to_gstin","TEXT"],
      ["from_place","TEXT"], ["to_place","TEXT"], ["from_state","TEXT"], ["to_state","TEXT"],
      ["transaction_type","TEXT"], ["supply_type","TEXT"], ["sub_supply_type","TEXT"],
      ["transport_mode","TEXT"], ["vehicle_number","TEXT"], ["train_number","TEXT"],
      ["flight_number","TEXT"], ["ship_number","TEXT"], ["invoice_value","TEXT"],
      ["hsn_code","TEXT"], ["product_name","TEXT"], ["quantity","TEXT"], ["unit","TEXT"],
      ["valid_upto","TEXT"], ["cancel_remark","TEXT"], ["invoice_id","INTEGER"],
      ["from_pincode","TEXT"], ["to_pincode","TEXT"], ["transporter_name","TEXT"],
      ["approximate_distance","TEXT"], ["cgst","TEXT"], ["sgst","TEXT"],
    ];
    for (const [col, type] of allCols) {
      try { await db.execute(sql.raw(`ALTER TABLE lb_eway_bills ADD COLUMN IF NOT EXISTS ${col} ${type}`)); } catch {}
    }

    // Step 3: UPDATE with all provided fields — accept both frontend field names and DB field names
    const today = new Date().toISOString().split("T")[0];
    const fields: [string, any][] = [
      ["invoice_number", data.invoiceNumber || null],
      ["invoice_date", data.invoiceDate || today],
      ["from_gstin", data.fromGstin || null],
      ["to_gstin", data.toGstin || null],
      ["from_place", data.fromName || data.fromPlace || null],
      ["to_place", data.toName || data.toPlace || null],
      ["from_pincode", data.fromPincode || null],
      ["to_pincode", data.toPincode || null],
      ["from_state", data.fromState || null],
      ["to_state", data.toState || null],
      ["transaction_type", data.transactionType || "1"],
      ["supply_type", data.supplyType || "O"],
      ["sub_supply_type", data.subSupplyType || "1"],
      ["transport_mode", data.transportMode || "road"],
      ["vehicle_number", data.vehicleNumber || null],
      ["train_number", data.trainNumber || null],
      ["flight_number", data.flightNumber || null],
      ["ship_number", data.shipNumber || null],
      ["transporter_name", data.transporterName || null],
      ["approximate_distance", data.approximateDistance != null ? String(data.approximateDistance) : null],
      ["invoice_value", String(data.totalValue ?? data.invoiceValue ?? 0)],
      ["cgst", data.cgst != null ? String(data.cgst) : null],
      ["sgst", data.sgst != null ? String(data.sgst) : null],
      ["hsn_code", data.hsnCode || null],
      ["product_name", data.productDescription || data.productName || null],
      ["quantity", data.quantity != null ? String(data.quantity) : null],
      ["unit", data.unit || null],
      ["valid_upto", data.validUpto || null],
    ];
    for (const [col, val] of fields) {
      try { await db.execute(sql.raw(`UPDATE lb_eway_bills SET ${col} = ${s(val)} WHERE id = ${id}`)); } catch {}
    }

    // Step 4: fetch the full row
    const fetched = await db.execute(sql.raw(`SELECT * FROM lb_eway_bills WHERE id = ${id}`));
    const full: any = (fetched as any).rows?.[0] ?? (fetched as any)[0] ?? { id, company_id: companyId, ewb_number: ewbNumber, status: "generated" };
    res.status(201).json({ ...full, invoiceValue: toNum(full.invoice_value ?? full.invoiceValue) });
  } catch (e: any) {
    res.status(500).json({ error: e.message });
  }
});

router.get("/eway-bills/:id", requireResolvedCompany, async (req, res) => {
  const companyId = resolveCompanyId(req);
  const [row] = await db.select().from(ewayBillsTable).where(and(eq(ewayBillsTable.id, parseInt(req.params.id as string)), eq(ewayBillsTable.companyId, companyId!))).limit(1);
  if (!row) { res.status(404).json({ error: "Not found" }); return; }
  res.json({ ...row, invoiceValue: toNum(row.invoiceValue) });
});

router.patch("/eway-bills/:id", requireResolvedCompany, async (req, res) => {
  const companyId = resolveCompanyId(req);
  const allowed = ["invoiceNumber","invoiceDate","fromGstin","toGstin","fromPlace","toPlace","fromState","toState","transportMode","vehicleNumber","trainNumber","flightNumber","shipNumber","invoiceValue","hsnCode","productName","quantity","unit","status","validUpto","cancelRemark","ewbNumber"];
  const update: any = {};
  for (const k of allowed) if (req.body[k] !== undefined) update[k] = k === "invoiceValue" ? String(req.body[k]) : req.body[k];
  const [row] = await db.update(ewayBillsTable).set(update).where(and(eq(ewayBillsTable.id, parseInt(req.params.id as string)), eq(ewayBillsTable.companyId, companyId!))).returning();
  if (!row) { res.status(404).json({ error: "Not found" }); return; }
  res.json({ ...row, invoiceValue: toNum(row.invoiceValue) });
});

router.delete("/eway-bills/:id", requireResolvedCompany, async (req, res) => {
  const companyId = resolveCompanyId(req);
  await db.delete(ewayBillsTable).where(and(eq(ewayBillsTable.id, parseInt(req.params.id as string)), eq(ewayBillsTable.companyId, companyId!)));
  res.sendStatus(204);
});

router.post("/eway-bills/:id/generate-nic", requireResolvedCompany, async (req, res) => {
  const companyId = resolveCompanyId(req);
  const [ewb] = await db.select().from(ewayBillsTable).where(and(eq(ewayBillsTable.id, parseInt(req.params.id as string)), eq(ewayBillsTable.companyId, companyId!))).limit(1);
  if (!ewb) { res.status(404).json({ error: "E-Way Bill not found" }); return; }

  const nicUsername = process.env.NIC_EWB_USERNAME;
  const nicPassword = process.env.NIC_EWB_PASSWORD;
  const nicGstin = process.env.NIC_EWB_GSTIN;
  const nicBaseUrl = process.env.NIC_EWB_BASE_URL || "https://einvoice1-uat.nic.in";

  if (!nicUsername || !nicPassword || !nicGstin) {
    res.status(503).json({
      error: "NIC API not configured",
      message: "Add NIC_EWB_USERNAME, NIC_EWB_PASSWORD, NIC_EWB_GSTIN to Render environment variables to enable real E-Way Bill generation.",
      sandbox_url: "https://einvoice1-uat.nic.in"
    });
    return;
  }

  try {
    const authResp = await fetch(`${nicBaseUrl}/eivital/v1.04/auth`, {
      method: "POST",
      headers: { "Content-Type": "application/json", "gstin": nicGstin, "user_name": nicUsername },
      body: JSON.stringify({ action: "ACCESSTOKEN", username: nicUsername, password: nicPassword, app_key: nicGstin })
    });

    if (!authResp.ok) {
      const err = await authResp.json();
      res.status(400).json({ error: "NIC auth failed", detail: err });
      return;
    }

    const authData = await authResp.json() as any;
    const accessToken = authData?.data?.authToken;

    const ewbPayload = {
      supplyType: ewb.supplyType || "O",
      subSupplyType: ewb.subSupplyType || "1",
      docType: "INV",
      docNo: ewb.invoiceNumber,
      docDate: ewb.invoiceDate,
      fromGstin: ewb.fromGstin || nicGstin,
      fromTrdName: "", fromAddr1: "",
      fromPlace: ewb.fromPlace,
      fromStateCode: ewb.fromState,
      actFromStateCode: ewb.fromState,
      toGstin: ewb.toGstin,
      toTrdName: "", toAddr1: "",
      toPlace: ewb.toPlace,
      toStateCode: ewb.toState,
      actToStateCode: ewb.toState,
      totalValue: Number(ewb.invoiceValue),
      cgstValue: 0, sgstValue: 0, igstValue: 0, cessValue: 0, cessNonAdvolValue: 0, otherValue: 0,
      transactionType: Number(ewb.transactionType || 1),
      transMode: ewb.transportMode === "road" ? "1" : ewb.transportMode === "rail" ? "2" : ewb.transportMode === "air" ? "3" : "4",
      transDistance: "0",
      transporterName: "", transporterId: "",
      transDocNo: ewb.vehicleNumber || ewb.trainNumber || ewb.flightNumber || ewb.shipNumber || "",
      transDocDate: ewb.invoiceDate,
      vehicleNo: ewb.vehicleNumber || "",
      vehicleType: "R",
      itemList: [{
        productName: ewb.productName || "Goods",
        productDesc: ewb.productName || "Goods",
        hsnCode: ewb.hsnCode || "0000",
        quantity: Number(ewb.quantity || 1),
        qtyUnit: ewb.unit || "NOS",
        cgstRate: 0, sgstRate: 0, igstRate: 0, cessRate: 0,
        taxableAmount: Number(ewb.invoiceValue),
      }],
    };

    const genResp = await fetch(`${nicBaseUrl}/eivital/v1.04/ewaybill`, {
      method: "POST",
      headers: { "Content-Type": "application/json", "gstin": nicGstin, "user_name": nicUsername, "authtoken": accessToken },
      body: JSON.stringify(ewbPayload)
    });
    const genData = await genResp.json() as any;

    if (!genResp.ok || genData.status === "0") {
      res.status(400).json({ error: "NIC EWB generation failed", detail: genData });
      return;
    }

    const ewbNo = genData?.data?.ewayBillNo;
    const validUpto = genData?.data?.validUpto;
    const [updated] = await db.update(ewayBillsTable).set({ ewbNumber: ewbNo || ewb.ewbNumber, status: "generated", validUpto: validUpto || null }).where(eq(ewayBillsTable.id, ewb.id)).returning();
    res.json({ success: true, ewbNumber: ewbNo, validUpto, data: genData?.data, row: updated });
  } catch (e: any) {
    res.status(500).json({ error: e.message });
  }
});

export default router;
