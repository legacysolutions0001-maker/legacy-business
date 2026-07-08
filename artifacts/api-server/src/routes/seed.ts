import { Router } from "express";
import bcrypt from "bcryptjs";
import { db, usersTable, companiesTable, customersTable, productsTable, employeesTable, suppliersTable, invoicesTable, paymentsTable, attendanceTable, legacyBusinessSettingsTable, purchaseOrdersTable, ewayBillsTable, daybookTable, cashBankLedgerTable, salaryRecordsTable, productVariantsTable, stockBatchesTable } from "@workspace/db";
import { eq, count } from "drizzle-orm";

const router = Router();

function fmtDate(d: Date) {
  const y = d.getFullYear();
  const m = String(d.getMonth()+1).padStart(2,"0");
  const day = String(d.getDate()).padStart(2,"0");
  return `${y}-${m}-${day}`;
}

function randBetween(min: number, max: number) {
  return Math.floor(Math.random() * (max - min + 1)) + min;
}

function pastDate(daysAgo: number) {
  const d = new Date();
  d.setDate(d.getDate() - daysAgo);
  return fmtDate(d);
}

// `forceResetPassword` is only ever true when explicitly requested via the
// master-key-protected /seed/repair-super-admin endpoint. On normal server
// boot we must NOT overwrite an existing super admin's password — otherwise
// any operator who changed their password gets silently reset to the
// env/default password on every restart.
export async function ensureSuperAdmin(forceResetPassword = false) {
  const saUsername = (process.env.SUPER_ADMIN_USERNAME || "bhullar01").toLowerCase();
  const saPassword = process.env.SUPER_ADMIN_PASSWORD || "Bhullar_01";
  const [existing] = await db.select().from(usersTable).where(eq(usersTable.username, saUsername)).limit(1);
  if (existing) {
    const update: Record<string, unknown> = { isActive: true, role: "super_admin" };
    if (forceResetPassword) {
      update.passwordHash = await bcrypt.hash(saPassword, 10);
    }
    await db.update(usersTable).set(update).where(eq(usersTable.username, saUsername));
  } else {
    const superHash = await bcrypt.hash(saPassword, 10);
    await db.insert(usersTable).values({
      username: saUsername,
      passwordHash: superHash,
      name: "Super Admin",
      email: "admin@legacybusiness.in",
      role: "super_admin",
      companyId: null,
      isActive: true,
    });
  }
  const [existingSettings] = await db.select().from(legacyBusinessSettingsTable).limit(1);
  if (!existingSettings) {
    await db.insert(legacyBusinessSettingsTable).values({
      businessName: "Legacy Business",
      address: "123, Business Hub, Delhi, India 110001",
      phone: "+91-9876543210",
      email: "info@legacybusiness.in",
      gstNumber: "29AABCT1332L1ZN",
      panNumber: "AABCT1332L",
      accountHolderName: "Legacy Business Solutions",
      bankName: "State Bank of India",
      accountNumber: "123456789012",
      ifscCode: "SBIN0001234",
      upiId: "legacybusiness@upi",
    });
  }
}

// Demo-data seeding must never be reachable in production — it's an
// unauthenticated bootstrap tool intended for local/dev setup only.
function blockInProduction(req: import("express").Request, res: import("express").Response, next: import("express").NextFunction) {
  if (process.env.NODE_ENV === "production") {
    res.status(404).json({ error: "Not found" });
    return;
  }
  next();
}

router.post("/seed/init", blockInProduction, async (req, res) => {
  try {
    const today = fmtDate(new Date());
    await ensureSuperAdmin();

    const [existingCompany] = await db.select().from(companiesTable).where(eq(companiesTable.code, "DEMO01")).limit(1);
    let companyId: number;
    if (existingCompany) {
      companyId = existingCompany.id;
    } else {
      const [company] = await db.insert(companiesTable).values({
        code: "DEMO01",
        name: "Demo Traders Pvt Ltd",
        ownerName: "Rajesh Kumar",
        gstNumber: "29AAACT2727Q1ZR",
        panNumber: "AAACT2727Q",
        address: "45, Market Road, Connaught Place",
        city: "New Delhi",
        state: "Delhi",
        country: "India",
        pincode: "110001",
        mobile: "+91-9876543210",
        email: "info@demotraders.in",
        subscriptionStatus: "active",
        subscriptionStart: "2025-01-01",
        subscriptionEnd: "2026-12-31",
        plan: "premium",
      }).returning();
      companyId = company.id;
    }

    const [ownerUser] = await db.select().from(usersTable).where(eq(usersTable.username, "demo_owner")).limit(1);
    if (!ownerUser) {
      const ownerHash = await bcrypt.hash("Demo@123", 10);
      await db.insert(usersTable).values({
        companyId,
        username: "demo_owner",
        passwordHash: ownerHash,
        name: "Rajesh Kumar",
        email: "rajesh@demotraders.in",
        role: "owner",
        isActive: true,
      });
    }

    const existingCustomers = await db.select().from(customersTable).where(eq(customersTable.companyId, companyId)).limit(1);
    if (existingCustomers.length === 0) {
      const customers = [
        { companyId, name: "Amit Sharma", mobile: "9876543001", email: "amit@example.com", gstNumber: "07AABCS1429B1ZB", address: "12 Gandhi Nagar", city: "Delhi", state: "Delhi", pincode: "110031" },
        { companyId, name: "Priya Singh", mobile: "9876543002", email: "priya@example.com", address: "45 MG Road", city: "Mumbai", state: "Maharashtra", pincode: "400001" },
        { companyId, name: "Ravi Industries", mobile: "9876543003", email: "ravi@raviindustries.com", gstNumber: "09AABCR2727Q1ZB", address: "78 Industrial Area", city: "Noida", state: "UP", pincode: "201301" },
        { companyId, name: "Sunita Medical", mobile: "9876543004", email: "sunita@medical.com", address: "23 Medical Lane", city: "Jaipur", state: "Rajasthan", pincode: "302001" },
        { companyId, name: "Tech Solutions Ltd", mobile: "9876543005", email: "info@techsolutions.com", gstNumber: "27AABCT1332L1ZN", address: "56 Tech Park", city: "Bangalore", state: "Karnataka", pincode: "560001" },
      ];
      for (const c of customers) await db.insert(customersTable).values(c);
    }

    const existingSuppliers = await db.select().from(suppliersTable).where(eq(suppliersTable.companyId, companyId)).limit(1);
    if (existingSuppliers.length === 0) {
      await db.insert(suppliersTable).values([
        { companyId, name: "Sharma Wholesale", gstNumber: "07AAACS1234B1ZB", address: "100 Wholesale Market", city: "Delhi", phone: "9988776601", email: "sharma@wholesale.com" },
        { companyId, name: "Gupta Distributors", gstNumber: "09AAACG4567Q1ZB", address: "55 Trade Center", city: "Noida", phone: "9988776602", email: "gupta@dist.com" },
        { companyId, name: "National Traders", gstNumber: "27AAACN7890L1ZB", address: "12 Business Hub", city: "Mumbai", phone: "9988776603", email: "national@traders.com" },
      ]);
    }

    const existingProducts = await db.select().from(productsTable).where(eq(productsTable.companyId, companyId)).limit(1);
    if (existingProducts.length === 0) {
      await db.insert(productsTable).values([
        { companyId, name: "Office Chair", sku: "OC001", barcode: "8901234567890", category: "Furniture", hsnCode: "9401", gstRate: "18", purchasePrice: "2500", sellingPrice: "3500", currentStock: 25, minStock: 5, unit: "pcs" },
        { companyId, name: "Laptop Stand", sku: "LS002", barcode: "8901234567891", category: "Electronics", hsnCode: "8473", gstRate: "18", purchasePrice: "800", sellingPrice: "1200", currentStock: 3, minStock: 10, unit: "pcs" },
        { companyId, name: "A4 Paper Ream", sku: "AP003", barcode: "8901234567892", category: "Stationery", hsnCode: "4802", gstRate: "12", purchasePrice: "180", sellingPrice: "250", currentStock: 120, minStock: 20, unit: "ream" },
        { companyId, name: "Printer Ink", sku: "PI004", barcode: "8901234567893", category: "Electronics", hsnCode: "3215", gstRate: "18", purchasePrice: "400", sellingPrice: "600", currentStock: 8, minStock: 15, unit: "pcs" },
        { companyId, name: "Desk Lamp", sku: "DL005", barcode: "8901234567894", category: "Electronics", hsnCode: "9405", gstRate: "18", purchasePrice: "350", sellingPrice: "550", currentStock: 0, minStock: 5, unit: "pcs" },
        { companyId, name: "Notebook A5", sku: "NB006", barcode: "8901234567895", category: "Stationery", hsnCode: "4820", gstRate: "12", purchasePrice: "50", sellingPrice: "80", currentStock: 200, minStock: 50, unit: "pcs" },
      ]);
    }

    const existingEmployees = await db.select().from(employeesTable).where(eq(employeesTable.companyId, companyId)).limit(1);
    if (existingEmployees.length === 0) {
      const employees = await db.insert(employeesTable).values([
        { companyId, name: "Vikram Patel", email: "vikram@demotraders.in", phone: "9876500001", department: "Sales", position: "Sales Executive", role: "sales", basicSalary: "25000", joiningDate: "2023-01-15" },
        { companyId, name: "Neha Joshi", email: "neha@demotraders.in", phone: "9876500002", department: "Accounts", position: "Accountant", role: "accountant", basicSalary: "30000", joiningDate: "2022-06-01" },
        { companyId, name: "Suresh Kumar", email: "suresh@demotraders.in", phone: "9876500003", department: "Warehouse", position: "Store Keeper", role: "worker", basicSalary: "18000", joiningDate: "2023-03-10" },
      ]).returning();

      if (employees.length > 0) {
        const empId = employees[0].id;
        const last7Days = Array.from({ length: 7 }, (_, i) => {
          const d = new Date();
          d.setDate(d.getDate() - i);
          return fmtDate(d);
        });
        await db.insert(attendanceTable).values(
          last7Days.map((date, i) => ({
            companyId,
            employeeId: empId,
            date,
            status: i === 3 ? "absent" : i === 5 ? "half_day" : "present",
          }))
        );
      }
    }

    res.json({ success: true, message: "Database seeded successfully. See replit.md for demo login credentials." });
  } catch (err: any) {
    const causeChain: string[] = [];
    let cur: unknown = err?.cause;
    let depth = 0;
    while (cur instanceof Error && depth < 5) {
      causeChain.push(`${cur.name}: ${cur.message}`);
      cur = (cur as Error).cause;
      depth++;
    }
    res.status(500).json({ error: err.message, causeChain });
  }
});

// Massive demo data endpoint — call this after /seed/init
router.post("/seed/demo", blockInProduction, async (req, res) => {
  try {
    const [company] = await db.select().from(companiesTable).where(eq(companiesTable.code, "DEMO01")).limit(1);
    if (!company) {
      res.status(400).json({ error: "Run /seed/init first" });
      return;
    }
    const companyId = company.id;

    const supplierNames = [
      "Agro Solutions Pvt Ltd","Bharat Chemicals","Delhi Pharma Distributors","Eastern Traders","Frontier Supplies",
      "Global Agri Corp","Himalayan Seeds Co","Indo-Asian Chemicals","Jain Agro Industries","Krishna Pesticides",
      "Lakshmi Distributors","Mehta Wholesale","National Agri Inputs","Om Sai Traders","Punjab Seeds House",
      "Quality Farm Inputs","Rajasthan Agro Mart","Sharma Brothers","Tata Agri Sciences","United Farm Solutions",
    ];
    const existingSupCount = await db.select({ c: count() }).from(suppliersTable).where(eq(suppliersTable.companyId, companyId));
    if (Number(existingSupCount[0]?.c ?? 0) < 5) {
      for (let i = 0; i < supplierNames.length; i++) {
        const n = supplierNames[i];
        await db.insert(suppliersTable).values({
          companyId,
          name: n,
          gstNumber: `29AAAC${String.fromCharCode(65+i)}${(1000+i).toString()}Q1ZB`,
          address: `${10+i} Industrial Area, Sector ${i+1}`,
          city: ["Delhi","Mumbai","Noida","Jaipur","Bangalore","Hyderabad","Chennai","Pune"][i%8],
          phone: `99887${String(77000+i).padStart(5,"0")}`,
          email: `${n.toLowerCase().replace(/\s/g,".")}@supplier.com`,
        }).catch(() => {});
      }
    }

    const allSuppliers = await db.select().from(suppliersTable).where(eq(suppliersTable.companyId, companyId));

    const productDefs = [
      {name:"Roundup Weedkiller",category:"Agrochemicals",hsn:"3808",gst:"18",pp:480,sp:650,unit:"bottle",brand:"Monsanto"},
      {name:"NPK Fertilizer 19:19:19",category:"Agrochemicals",hsn:"3105",gst:"0",pp:1200,sp:1500,unit:"bag",brand:"Coromandel"},
      {name:"Urea Fertilizer 50kg",category:"Agrochemicals",hsn:"3102",gst:"0",pp:280,sp:350,unit:"bag",brand:"IFFCO"},
      {name:"DAP Fertilizer 50kg",category:"Agrochemicals",hsn:"3105",gst:"0",pp:1350,sp:1600,unit:"bag",brand:"IFFCO"},
      {name:"Chlorpyrifos Insecticide",category:"Agrochemicals",hsn:"3808",gst:"18",pp:320,sp:440,unit:"bottle",brand:"Dhanuka"},
      {name:"Imidacloprid 17.8% SL",category:"Agrochemicals",hsn:"3808",gst:"18",pp:850,sp:1100,unit:"bottle",brand:"Bayer"},
      {name:"Mancozeb 75% WP",category:"Agrochemicals",hsn:"3808",gst:"18",pp:180,sp:250,unit:"kg",brand:"UPL"},
      {name:"Glyphosate 41% SL",category:"Agrochemicals",hsn:"3808",gst:"18",pp:390,sp:520,unit:"bottle",brand:"PI Industries"},
      {name:"Cypermethrin 25% EC",category:"Agrochemicals",hsn:"3808",gst:"18",pp:275,sp:380,unit:"bottle",brand:"FMC"},
      {name:"Thiamethoxam 25% WG",category:"Agrochemicals",hsn:"3808",gst:"18",pp:920,sp:1250,unit:"bottle",brand:"Syngenta"},
      {name:"Carbendazim 50% WP",category:"Agrochemicals",hsn:"3808",gst:"18",pp:140,sp:195,unit:"kg",brand:"Indofil"},
      {name:"Propiconazole 25% EC",category:"Agrochemicals",hsn:"3808",gst:"18",pp:680,sp:920,unit:"bottle",brand:"BASF"},
      {name:"Acephate 75% SP",category:"Agrochemicals",hsn:"3808",gst:"18",pp:245,sp:330,unit:"kg",brand:"Gharda"},
      {name:"Fipronil 5% SC",category:"Agrochemicals",hsn:"3808",gst:"18",pp:380,sp:510,unit:"bottle",brand:"BASF"},
      {name:"Azoxystrobin 23% SC",category:"Agrochemicals",hsn:"3808",gst:"18",pp:1100,sp:1450,unit:"bottle",brand:"Syngenta"},
      {name:"Ammonium Nitrate 50kg",category:"Agrochemicals",hsn:"3102",gst:"0",pp:850,sp:1050,unit:"bag",brand:"Deepak Fertilizers"},
      {name:"Boron Micronutrient",category:"Agrochemicals",hsn:"3105",gst:"18",pp:290,sp:400,unit:"kg",brand:"Sanyasi Agro"},
      {name:"Zinc Sulphate 33%",category:"Agrochemicals",hsn:"3105",gst:"18",pp:80,sp:120,unit:"kg",brand:"Gujarat Chemical"},
      {name:"Seaweed Extract Liquid",category:"Agrochemicals",hsn:"3101",gst:"18",pp:550,sp:750,unit:"bottle",brand:"BioStadt"},
      {name:"Humic Acid 98% Granules",category:"Agrochemicals",hsn:"3101",gst:"18",pp:420,sp:580,unit:"kg",brand:"NutriGrow"},
      {name:"Office Chair Ergonomic",category:"Furniture",hsn:"9401",gst:"18",pp:4500,sp:6500,unit:"pcs",brand:"Godrej"},
      {name:"Wooden Study Table",category:"Furniture",hsn:"9403",gst:"18",pp:3200,sp:4800,unit:"pcs",brand:"Nilkamal"},
      {name:"Steel Almirah 2-door",category:"Furniture",hsn:"9403",gst:"18",pp:5500,sp:7800,unit:"pcs",brand:"Godrej"},
      {name:"Printer HP LaserJet",category:"Electronics",hsn:"8443",gst:"18",pp:12000,sp:16500,unit:"pcs",brand:"HP"},
      {name:"Dell Monitor 24 inch",category:"Electronics",hsn:"8528",gst:"18",pp:9500,sp:13000,unit:"pcs",brand:"Dell"},
      {name:"Logitech Wireless Keyboard",category:"Electronics",hsn:"8471",gst:"18",pp:850,sp:1200,unit:"pcs",brand:"Logitech"},
      {name:"USB-C Hub 7-port",category:"Electronics",hsn:"8473",gst:"18",pp:650,sp:950,unit:"pcs",brand:"Portronics"},
      {name:"A4 Paper Ream 500 sheets",category:"Stationery",hsn:"4802",gst:"12",pp:180,sp:250,unit:"ream",brand:"ITC"},
      {name:"Pen Blue Ballpoint Box",category:"Stationery",hsn:"9608",gst:"12",pp:80,sp:120,unit:"box",brand:"Cello"},
      {name:"Stapler Heavy Duty",category:"Stationery",hsn:"8305",gst:"12",pp:320,sp:450,unit:"pcs",brand:"Kangaro"},
    ];

    const existingProdCount = await db.select({ c: count() }).from(productsTable).where(eq(productsTable.companyId, companyId));
    let productIds: number[] = [];

    if (Number(existingProdCount[0]?.c ?? 0) < 10) {
      for (let i = 0; i < productDefs.length; i++) {
        const pd = productDefs[i];
        const [p] = await db.insert(productsTable).values({
          companyId,
          name: pd.name,
          sku: `SKU${String(1000+i).padStart(4,"0")}`,
          barcode: `890${String(1234567890+i).padStart(10,"0")}`,
          category: pd.category,
          hsnCode: pd.hsn,
          gstRate: pd.gst,
          purchasePrice: String(pd.pp),
          sellingPrice: String(pd.sp),
          currentStock: randBetween(10, 500),
          minStock: 10,
          unit: pd.unit,
          brand: pd.brand,
        }).returning();
        productIds.push(p.id);
        // Add a stock batch for each product
        await db.insert(stockBatchesTable).values({
          companyId,
          productId: p.id,
          variantId: null,
          quantityReceived: randBetween(50, 300),
          currentQty: randBetween(10, 200),
          purchasePrice: String(pd.pp),
          sellingPrice: String(pd.sp),
          batchNumber: `BATCH-${String(1000+i)}`,
          isActive: 1,
        }).catch(() => {});
      }
    } else {
      const existingProds = await db.select({ id: productsTable.id }).from(productsTable).where(eq(productsTable.companyId, companyId)).limit(50);
      productIds = existingProds.map(p => p.id);
    }

    const allCustomers = await db.select().from(customersTable).where(eq(customersTable.companyId, companyId));
    const allProducts = await db.select().from(productsTable).where(eq(productsTable.companyId, companyId)).limit(50);

    // Seed 200 invoices
    const existingInvCount = await db.select({ c: count() }).from(invoicesTable).where(eq(invoicesTable.companyId, companyId));
    if (Number(existingInvCount[0]?.c ?? 0) < 10) {
      const invTypes = ["gst_invoice","gst_invoice","gst_invoice","quotation","proforma_invoice","credit_note"];
      const payStatuses = ["paid","paid","paid","pending","pending"];
      for (let i = 0; i < 200; i++) {
        const cust = allCustomers[i % allCustomers.length];
        const prod = allProducts[i % allProducts.length];
        const qty = randBetween(1, 20);
        const price = Number(prod?.sellingPrice ?? 500);
        const subtotal = qty * price;
        const gstRate = Number(prod?.gstRate ?? 18);
        const gstAmt = (subtotal * gstRate) / 100;
        const cgst = gstAmt / 2;
        const sgst = gstAmt / 2;
        const total = subtotal + gstAmt;
        const invType = invTypes[i % invTypes.length];
        const payStatus = payStatuses[i % payStatuses.length];
        const prefix = invType === "quotation" ? "QT" : invType === "credit_note" ? "CN" : invType === "proforma_invoice" ? "PRO" : "INV";
        const invNum = `${prefix}-2025-${String(i+1).padStart(4,"0")}`;
        const invDate = pastDate(randBetween(0, 180));

        await db.insert(invoicesTable).values({
          companyId,
          invoiceNumber: invNum,
          invoiceType: invType,
          customerId: cust?.id ?? null,
          customerName: cust?.name ?? "Walk-in Customer",
          customerGst: (cust as any)?.gstNumber ?? null,
          customerAddress: cust?.address ?? null,
          status: "confirmed",
          invoiceDate: invDate,
          items: [{ productId: prod?.id, productName: prod?.name, quantity: qty, unitPrice: price, gstRate, amount: subtotal }] as any,
          subtotal: String(subtotal),
          cgst: String(cgst),
          sgst: String(sgst),
          igst: "0",
          roundOff: "0",
          total: String(total),
          paymentMethod: ["cash","upi","card","net_banking"][i%4],
          paymentStatus: payStatus,
          discountAmount: "0",
        }).catch(() => {});

        if (payStatus === "paid" && cust) {
          await db.insert(paymentsTable).values({
            companyId,
            entityType: "customer",
            entityId: cust.id,
            entityName: cust.name,
            amount: String(total),
            method: ["cash","upi","card","net_banking"][i%4],
            paidAt: invDate,
          }).catch(() => {});
        }
      }
    }

    // Seed 150 purchase orders
    const existingPOCount = await db.select({ c: count() }).from(purchaseOrdersTable).where(eq(purchaseOrdersTable.companyId, companyId));
    if (Number(existingPOCount[0]?.c ?? 0) < 10) {
      for (let i = 0; i < 150; i++) {
        const sup = allSuppliers[i % Math.max(allSuppliers.length, 1)];
        const prod = allProducts[i % Math.max(allProducts.length, 1)];
        const qty = randBetween(10, 100);
        const price = Number(prod?.purchasePrice ?? 300);
        const subtotal = qty * price;
        const gstAmt = (subtotal * 18) / 100;
        const total = subtotal + gstAmt;
        const billDate = pastDate(randBetween(0, 180));

        await db.insert(purchaseOrdersTable).values({
          companyId,
          supplierId: sup?.id ?? null,
          supplierName: sup?.name ?? "Unknown Supplier",
          billNumber: `BILL-2025-${String(i+1).padStart(4,"0")}`,
          billDate,
          items: [{ productId: prod?.id, productName: prod?.name, quantity: qty, unitPrice: price, gstRate: 18, amount: subtotal }] as any,
          subtotal: String(subtotal),
          cgst: String(gstAmt/2),
          sgst: String(gstAmt/2),
          igst: "0",
          total: String(total),
          paymentStatus: i % 3 === 0 ? "pending" : "paid",
        }).catch(() => {});
      }
    }

    // Seed 100 cash/bank ledger entries
    const existingCBCount = await db.select({ c: count() }).from(cashBankLedgerTable).where(eq(cashBankLedgerTable.companyId, companyId));
    if (Number(existingCBCount[0]?.c ?? 0) < 10) {
      const cbDescriptions = [
        "Sales collection","Purchase payment","Salary payment","Office rent","Utility bills",
        "Transport charges","Miscellaneous income","Bank deposit","ATM withdrawal","Cheque received",
        "UPI payment received","NEFT transfer","Cash sales","Purchase return","Customer advance",
      ];
      for (let i = 0; i < 100; i++) {
        const entryDate = pastDate(randBetween(0, 180));
        const amount = randBetween(1000, 50000);
        await db.insert(cashBankLedgerTable).values({
          companyId,
          ledgerType: i % 3 === 0 ? "bank" : "cash",
          entryType: i % 4 === 0 ? "debit" : "credit",
          amount: String(amount),
          balance: String(randBetween(10000, 500000)),
          description: cbDescriptions[i % cbDescriptions.length],
          reference: `REF${String(1000+i)}`,
          entryDate,
          paymentMethod: ["cash","upi","cheque","neft"][i%4],
        }).catch(() => {});
      }
    }

    // Seed employees + salary records
    const existingEmpCount = await db.select({ c: count() }).from(employeesTable).where(eq(employeesTable.companyId, companyId));
    let empIds: number[] = [];
    if (Number(existingEmpCount[0]?.c ?? 0) === 0) {
      const empDefs = [
        { name: "Vikram Patel", email: "vikram@demo.in", phone: "9876500001", department: "Sales", position: "Sales Executive", role: "sales", basicSalary: "25000", joiningDate: "2023-01-15" },
        { name: "Neha Joshi", email: "neha@demo.in", phone: "9876500002", department: "Accounts", position: "Senior Accountant", role: "accountant", basicSalary: "35000", joiningDate: "2022-06-01" },
        { name: "Suresh Kumar", email: "suresh@demo.in", phone: "9876500003", department: "Warehouse", position: "Store Keeper", role: "worker", basicSalary: "20000", joiningDate: "2023-03-10" },
        { name: "Anjali Verma", email: "anjali@demo.in", phone: "9876500004", department: "HR", position: "HR Manager", role: "hr", basicSalary: "40000", joiningDate: "2022-01-01" },
        { name: "Rajan Mehta", email: "rajan@demo.in", phone: "9876500005", department: "Sales", position: "Field Sales Officer", role: "sales", basicSalary: "22000", joiningDate: "2023-07-01" },
      ];
      for (const e of empDefs) {
        const [emp] = await db.insert(employeesTable).values({ companyId, ...e }).returning();
        empIds.push(emp.id);
      }
    } else {
      const emps = await db.select({ id: employeesTable.id }).from(employeesTable).where(eq(employeesTable.companyId, companyId));
      empIds = emps.map(e => e.id);
    }

    // Salary records for last 12 months
    const existingSalCount = await db.select({ c: count() }).from(salaryRecordsTable).where(eq(salaryRecordsTable.companyId, companyId));
    if (Number(existingSalCount[0]?.c ?? 0) < 5 && empIds.length > 0) {
      const now = new Date();
      for (const empId of empIds) {
        for (let m = 0; m < 12; m++) {
          const d = new Date(now.getFullYear(), now.getMonth() - m, 1);
          const basic = randBetween(18000, 50000);
          const hra = Math.round(basic * 0.4);
          const allowances = randBetween(1000, 5000);
          const deductions = randBetween(500, 3000);
          const gross = basic + hra + allowances;
          const net = gross - deductions;
          await db.insert(salaryRecordsTable).values({
            companyId,
            employeeId: empId,
            month: d.getMonth() + 1,
            year: d.getFullYear(),
            basicSalary: String(basic),
            hra: String(hra),
            allowances: String(allowances),
            deductions: String(deductions),
            grossSalary: String(gross),
            netSalary: String(net),
            status: m > 0 ? "paid" : "pending",
            paidAt: m > 0 ? fmtDate(new Date(d.getFullYear(), d.getMonth()+1, 5)) : null,
            paymentMode: "bank_transfer",
          }).catch(() => {});
        }
      }
    }

    // Seed 50 e-way bills
    const existingEWBCount = await db.select({ c: count() }).from(ewayBillsTable).where(eq(ewayBillsTable.companyId, companyId));
    if (Number(existingEWBCount[0]?.c ?? 0) < 5) {
      const states = ["Delhi","Maharashtra","Karnataka","Rajasthan","UP","Haryana","Punjab","Gujarat","Tamil Nadu","West Bengal"];
      for (let i = 0; i < 50; i++) {
        const invDate = pastDate(randBetween(0, 180));
        const validDate = pastDate(randBetween(-10, 5));
        await db.insert(ewayBillsTable).values({
          companyId,
          ewbNumber: `EWB${String(2300000000+i)}`,
          invoiceNumber: `INV-2025-${String(i+1).padStart(4,"0")}`,
          invoiceDate: invDate,
          fromGstin: "29AAACT2727Q1ZR",
          toGstin: (allCustomers[i%Math.max(allCustomers.length,1)] as any)?.gstNumber ?? null,
          fromPlace: "New Delhi",
          toPlace: states[(i+2) % states.length],
          fromState: "Delhi",
          toState: states[i % states.length],
          transportMode: ["road","rail","air"][i%3],
          vehicleNumber: i%3===0 ? `DL${String(i+1).padStart(2,"0")}AB${String(1000+i)}` : null,
          invoiceValue: String(randBetween(5000, 200000)),
          productName: allProducts[i%Math.max(allProducts.length,1)]?.name ?? "Product",
          quantity: String(randBetween(5, 100)),
          unit: "pcs",
          status: i % 5 === 0 ? "cancelled" : "generated",
          validUpto: validDate,
        }).catch(() => {});
      }
    }

    // Seed 100 daybook entries
    const existingDBCount = await db.select({ c: count() }).from(daybookTable).where(eq(daybookTable.companyId, companyId));
    if (Number(existingDBCount[0]?.c ?? 0) < 10) {
      const dbCategories = ["Sales","Purchase","Expense","Receipt","Payment","Journal","Contra","Debit Note","Credit Note","Bank Charge"];
      const dbDescriptions = [
        "Cash sales for the day","Purchase from supplier","Office maintenance expense",
        "Customer payment received","Payment to supplier","Salary advance paid",
        "Bank charges deducted","Interest income","Freight charges paid","GST payment",
        "Rent paid for office","Electricity bill payment","Commission received","Miscellaneous expense","Insurance premium paid",
      ];
      for (let i = 0; i < 100; i++) {
        await db.insert(daybookTable).values({
          companyId,
          date: pastDate(randBetween(0, 180)),
          category: dbCategories[i % dbCategories.length],
          description: dbDescriptions[i % dbDescriptions.length],
          amount: String(randBetween(500, 100000)),
          notes: i % 4 === 0 ? "Verified and approved" : null,
        }).catch(() => {});
      }
    }

    res.json({
      success: true,
      message: "Demo data seeded successfully",
      seeded: {
        suppliers: "up to 20",
        products: "up to 30 with stock batches",
        invoices: "up to 200",
        purchaseOrders: "up to 150",
        payments: "auto from invoices",
        cashBankEntries: "up to 100",
        employees: "up to 5",
        salaryRecords: "12 months per employee",
        ewayBills: "up to 50",
        daybookEntries: "up to 100",
      }
    });
  } catch (err: any) {
    res.status(500).json({ error: err.message, stack: err.stack });
  }
});

export default router;

// Repair super admin endpoint — protected by SESSION_SECRET master key
router.post("/seed/repair-super-admin", async (req, res) => {
  const { masterKey } = req.body as { masterKey?: string };
  if (!masterKey || masterKey !== process.env.SESSION_SECRET) {
    res.status(403).json({ error: "Forbidden" });
    return;
  }
  try {
    await ensureSuperAdmin(true);
    const saUsername = (process.env.SUPER_ADMIN_USERNAME || "bhullar01").toLowerCase();
    res.json({ success: true, message: `Super admin '${saUsername}' created/updated successfully` });
  } catch (err: any) {
    res.status(500).json({ error: err.message });
  }
});
