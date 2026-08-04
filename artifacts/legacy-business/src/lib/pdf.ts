export function printInvoice(inv: any, company: any) {
  const fmt = (n: number) => new Intl.NumberFormat("en-IN", { maximumFractionDigits: 2 }).format(n);
  const items = Array.isArray(inv.items) ? inv.items : [];
  const typeLabel: Record<string, string> = {
    gst_invoice: "TAX INVOICE",
    quotation: "QUOTATION",
    proforma: "PROFORMA INVOICE",
    credit_note: "CREDIT NOTE",
    debit_note: "DEBIT NOTE",
    purchase: "PURCHASE INVOICE",
  };
  const label = typeLabel[inv.invoiceType] || "TAX INVOICE";

  const html = `<!DOCTYPE html>
<html>
<head>
<meta charset="UTF-8"/>
<title>${label} - ${inv.invoiceNumber}</title>
<style>
  * { margin: 0; padding: 0; box-sizing: border-box; }
  body { font-family: Arial, sans-serif; font-size: 13px; color: #111; background: #fff; }
  .page { max-width: 210mm; margin: 0 auto; padding: 15mm; }
  .header { display: flex; justify-content: space-between; align-items: flex-start; border-bottom: 3px solid #1a1a2e; padding-bottom: 16px; margin-bottom: 16px; }
  .logo-area { display: flex; align-items: center; gap: 14px; }
  .logo-img { width: 64px; height: 64px; object-fit: contain; border-radius: 8px; }
  .company-name { font-size: 22px; font-weight: 800; color: #1a1a2e; }
  .company-info { font-size: 11px; color: #555; margin-top: 4px; line-height: 1.6; }
  .invoice-title { font-size: 20px; font-weight: 700; color: #1a1a2e; text-align: right; }
  .invoice-meta { text-align: right; font-size: 12px; color: #555; margin-top: 4px; line-height: 1.6; }
  .parties { display: grid; grid-template-columns: 1fr 1fr; gap: 20px; margin: 16px 0; }
  .party { background: #f8f9fa; border-radius: 6px; padding: 12px; }
  .party-label { font-size: 10px; text-transform: uppercase; letter-spacing: 1px; color: #888; font-weight: 700; margin-bottom: 6px; }
  .party-name { font-size: 14px; font-weight: 700; color: #111; }
  .party-detail { font-size: 11px; color: #555; margin-top: 3px; }
  table { width: 100%; border-collapse: collapse; margin: 16px 0; font-size: 12px; }
  th { background: #1a1a2e; color: #fff; padding: 8px 10px; text-align: left; font-size: 11px; text-transform: uppercase; letter-spacing: 0.5px; }
  td { padding: 8px 10px; border-bottom: 1px solid #eee; }
  tr:nth-child(even) td { background: #f9f9f9; }
  .totals { margin-left: auto; width: 300px; margin-top: 8px; }
  .total-row { display: flex; justify-content: space-between; padding: 5px 0; font-size: 12px; border-bottom: 1px solid #eee; }
  .total-final { display: flex; justify-content: space-between; padding: 10px 0; font-size: 15px; font-weight: 800; border-top: 2px solid #1a1a2e; margin-top: 4px; }
  .notes { margin-top: 20px; background: #f8f9fa; border-radius: 6px; padding: 12px; font-size: 11px; color: #555; }
  .footer { margin-top: 40px; border-top: 1px solid #eee; padding-top: 12px; }
  .thank-you { text-align: center; font-size: 14px; font-weight: 700; color: #1a1a2e; margin-bottom: 12px; letter-spacing: 0.5px; }
  .footer-bottom { display: flex; justify-content: space-between; align-items: flex-end; font-size: 11px; color: #888; }
  .sig-box { text-align: center; }
  .sig-line { border-top: 1px solid #aaa; margin-top: 40px; padding-top: 4px; font-size: 10px; }
  .badge { display: inline-block; padding: 2px 10px; border-radius: 100px; font-size: 10px; font-weight: 700; text-transform: uppercase; }
  .badge-paid { background: #d1fae5; color: #065f46; }
  .badge-pending { background: #dbeafe; color: #1e40af; }
  .badge-draft { background: #f3f4f6; color: #6b7280; }
  @media print {
    body { print-color-adjust: exact; -webkit-print-color-adjust: exact; }
    .page { padding: 10mm; }
  }
</style>
</head>
<body>
<div class="page">
  <div class="header">
    <div class="logo-area">
      ${company?.logo ? `<img src="${company.logo}" class="logo-img" alt="Logo"/>` : ""}
      <div>
        <div class="company-name">${company?.name || "Your Business"}</div>
        <div class="company-info">
          ${company?.address ? company.address + "<br/>" : ""}
          ${company?.mobile ? "Tel: " + company.mobile : ""}${company?.mobile && company?.email ? " | " : ""}${company?.email ? company.email + "<br/>" : ""}
          ${company?.gstNumber ? "GSTIN: <strong>" + company.gstNumber + "</strong>" : ""}${company?.gstNumber && company?.panNumber ? " &nbsp;|&nbsp; " : ""}${company?.panNumber ? "PAN: <strong>" + company.panNumber + "</strong>" : ""}
        </div>
      </div>
    </div>
    <div>
      <div class="invoice-title">${label}</div>
      <div class="invoice-meta">
        <strong>${inv.invoiceNumber}</strong><br/>
        Date: ${inv.invoiceDate || new Date().toISOString().split("T")[0]}<br/>
        ${inv.dueDate ? "Due: " + inv.dueDate + "<br/>" : ""}
        ${inv.paymentStatus ? "<span class='badge badge-" + (inv.paymentStatus === "paid" ? "paid" : inv.paymentStatus === "pending" ? "pending" : "draft") + "'>" + inv.paymentStatus.toUpperCase() + "</span>" : ""}
      </div>
    </div>
  </div>

  <div class="parties">
    <div class="party">
      <div class="party-label">Bill From</div>
      <div class="party-name">${company?.name || "Your Business"}</div>
      ${company?.address ? `<div class="party-detail">${company.address}</div>` : ""}
      ${company?.gstNumber ? `<div class="party-detail">GSTIN: ${company.gstNumber}</div>` : ""}
      ${company?.panNumber ? `<div class="party-detail">PAN: ${company.panNumber}</div>` : ""}
    </div>
    <div class="party">
      <div class="party-label">Bill To</div>
      <div class="party-name">${inv.customerName || "Customer"}</div>
      ${inv.customerAddress ? `<div class="party-detail">${inv.customerAddress}</div>` : ""}
      ${inv.customerGst ? `<div class="party-detail">GSTIN: ${inv.customerGst}</div>` : ""}
    </div>
  </div>

  <table>
    <thead>
      <tr><th>#</th><th>Description</th><th style="text-align:center">HSN</th><th style="text-align:center">Qty</th><th style="text-align:right">Unit Price</th><th style="text-align:right">Amount</th></tr>
    </thead>
    <tbody>
      ${items.map((it: any, i: number) => `
        <tr>
          <td>${i + 1}</td>
          <td>${it.description || ""}</td>
          <td style="text-align:center">${it.hsnCode || "—"}</td>
          <td style="text-align:center">${it.quantity || 1}</td>
          <td style="text-align:right">₹${fmt(Number(it.unitPrice || 0))}</td>
          <td style="text-align:right">₹${fmt(Number(it.amount || 0))}</td>
        </tr>
      `).join("")}
    </tbody>
  </table>

  <div class="totals">
    <div class="total-row"><span>Subtotal</span><span>₹${fmt(Number(inv.subtotal || 0))}</span></div>
    ${Number(inv.discountAmount) > 0 ? `<div class="total-row" style="color:#059669"><span>Discount</span><span>−₹${fmt(Number(inv.discountAmount))}</span></div>` : ""}
    ${Number(inv.cgst) > 0 ? `<div class="total-row" style="color:#2563eb"><span>CGST</span><span>₹${fmt(Number(inv.cgst))}</span></div>` : ""}
    ${Number(inv.sgst) > 0 ? `<div class="total-row" style="color:#2563eb"><span>SGST</span><span>₹${fmt(Number(inv.sgst))}</span></div>` : ""}
    ${Number(inv.igst) > 0 ? `<div class="total-row" style="color:#2563eb"><span>IGST</span><span>₹${fmt(Number(inv.igst))}</span></div>` : ""}
    ${Number(inv.roundOff) !== 0 ? `<div class="total-row" style="color:#888"><span>Round Off</span><span>${Number(inv.roundOff) >= 0 ? "+" : ""}₹${fmt(Number(inv.roundOff))}</span></div>` : ""}
    <div class="total-final"><span>TOTAL</span><span>₹${fmt(Number(inv.total || 0))}</span></div>
  </div>

  ${inv.notes ? `<div class="notes"><strong>Notes:</strong> ${inv.notes}</div>` : ""}
  ${inv.termsConditions ? `<div class="notes" style="margin-top:8px"><strong>Terms & Conditions:</strong> ${inv.termsConditions}</div>` : ""}

  <div class="footer">
    <div class="thank-you">✦ Thank You For Visiting &nbsp;|&nbsp; Visit Again ✦</div>
    <div class="footer-bottom">
      <div>
        <div style="color:#555">Generated by Legacy Business ERP</div>
      </div>
      <div class="sig-box">
        <div class="sig-line">Authorised Signatory</div>
      </div>
    </div>
  </div>
</div>
<script>window.onload=function(){window.print();}</script>
</body>
</html>`;

  const w = window.open("", "_blank");
  if (w) { w.document.write(html); w.document.close(); }
}

export function printSubscriptionInvoice(sub: any, company: any, settings: any) {
  const fmt = (n: number) => new Intl.NumberFormat("en-IN", { maximumFractionDigits: 2 }).format(n);
  const planLabel: Record<string, string> = { starter: "Starter", professional: "Professional", enterprise: "Enterprise" };

  const html = `<!DOCTYPE html>
<html>
<head>
<meta charset="UTF-8"/>
<title>Subscription Invoice - ${sub.invoiceNumber}</title>
<style>
  * { margin: 0; padding: 0; box-sizing: border-box; }
  body { font-family: Arial, sans-serif; font-size: 13px; color: #111; background: #fff; }
  .page { max-width: 180mm; margin: 0 auto; padding: 15mm; }
  .header { text-align: center; border-bottom: 3px solid #1a1a2e; padding-bottom: 16px; margin-bottom: 20px; }
  .company-name { font-size: 24px; font-weight: 800; color: #1a1a2e; }
  .company-sub { font-size: 12px; color: #555; margin-top: 4px; line-height: 1.6; }
  .inv-title { font-size: 16px; font-weight: 700; color: #1a1a2e; margin-top: 12px; text-transform: uppercase; letter-spacing: 1px; }
  .meta-box { background: #f8f9fa; border-radius: 8px; padding: 14px; margin: 16px 0; display: grid; grid-template-columns: 1fr 1fr; gap: 10px; font-size: 12px; }
  .meta-row { display: flex; flex-direction: column; gap: 2px; }
  .meta-label { color: #888; font-size: 10px; text-transform: uppercase; letter-spacing: 0.5px; }
  .meta-value { font-weight: 600; color: #111; }
  .plan-box { background: #1a1a2e; color: #fff; border-radius: 8px; padding: 16px; margin: 16px 0; display: flex; justify-content: space-between; align-items: center; }
  .plan-name { font-size: 18px; font-weight: 800; }
  .plan-period { font-size: 11px; opacity: 0.7; margin-top: 2px; }
  .plan-amount { font-size: 24px; font-weight: 800; }
  .status-paid { display: inline-block; background: #d1fae5; color: #065f46; padding: 3px 14px; border-radius: 100px; font-size: 11px; font-weight: 700; text-transform: uppercase; }
  .status-unpaid { display: inline-block; background: #fee2e2; color: #991b1b; padding: 3px 14px; border-radius: 100px; font-size: 11px; font-weight: 700; text-transform: uppercase; }
  .footer { margin-top: 30px; border-top: 1px solid #eee; padding-top: 12px; }
  .thank-you { text-align: center; font-size: 13px; font-weight: 700; color: #1a1a2e; margin-bottom: 10px; }
  .footer-bottom { display: flex; justify-content: space-between; font-size: 10px; color: #888; }
  @media print { body { print-color-adjust: exact; -webkit-print-color-adjust: exact; } .page { padding: 10mm; } }
</style>
</head>
<body>
<div class="page">
  <div class="header">
    <div class="company-name">${settings?.companyName || "Legacy Solutions"}</div>
    <div class="company-sub">
      ${settings?.address || ""}<br/>
      ${settings?.mobile ? "Tel: " + settings.mobile + " | " : ""}${settings?.email || ""}<br/>
      ${settings?.gstNumber ? "GSTIN: " + settings.gstNumber : ""}
    </div>
    <div class="inv-title">Subscription Invoice</div>
  </div>

  <div class="meta-box">
    <div class="meta-row"><span class="meta-label">Invoice No.</span><span class="meta-value">${sub.invoiceNumber}</span></div>
    <div class="meta-row"><span class="meta-label">Date</span><span class="meta-value">${sub.createdAt ? new Date(sub.createdAt).toLocaleDateString("en-IN") : new Date().toLocaleDateString("en-IN")}</span></div>
    <div class="meta-row"><span class="meta-label">Company</span><span class="meta-value">${company?.name || ""}</span></div>
    <div class="meta-row"><span class="meta-label">Contact</span><span class="meta-value">${company?.mobile || "—"}</span></div>
    <div class="meta-row"><span class="meta-label">Valid From</span><span class="meta-value">${sub.startDate}</span></div>
    <div class="meta-row"><span class="meta-label">Valid Until</span><span class="meta-value">${sub.endDate}</span></div>
  </div>

  <div class="plan-box">
    <div>
      <div class="plan-name">${planLabel[sub.plan] || sub.plan} Plan</div>
      <div class="plan-period">${sub.startDate} to ${sub.endDate}</div>
    </div>
    <div>
      <div class="plan-amount">₹${fmt(Number(sub.amount || 0))}</div>
      <div style="text-align:right;margin-top:4px">
        <span class="${sub.paidStatus === 'paid' ? 'status-paid' : 'status-unpaid'}">${sub.paidStatus === "paid" ? "PAID" : "UNPAID"}</span>
      </div>
    </div>
  </div>

  ${sub.notes ? `<div style="background:#f8f9fa;border-radius:6px;padding:10px;font-size:11px;color:#555;margin-top:12px"><strong>Notes:</strong> ${sub.notes}</div>` : ""}

  <div class="footer">
    <div class="thank-you">✦ Thank You For Your Business ✦</div>
    <div class="footer-bottom">
      <div>Legacy Solutions — ERP Platform</div>
      <div>Powered by Legacy Business ERP</div>
    </div>
  </div>
</div>
<script>window.onload=function(){window.print();}</script>
</body>
</html>`;

  const w = window.open("", "_blank");
  if (w) { w.document.write(html); w.document.close(); }
}

export function printSalarySlip(sal: any, employee: any, company: any) {
  const fmt = (n: number) => `₹${new Intl.NumberFormat("en-IN", { maximumFractionDigits: 0 }).format(n)}`;
  const MONTHS = ["January","February","March","April","May","June","July","August","September","October","November","December"];
  const monthName = MONTHS[(Number(sal.month) - 1)] || sal.month;

  const html = `<!DOCTYPE html>
<html>
<head>
<meta charset="UTF-8"/>
<title>Salary Slip - ${employee?.name || ""} - ${monthName} ${sal.year}</title>
<style>
  * { margin: 0; padding: 0; box-sizing: border-box; }
  body { font-family: Arial, sans-serif; font-size: 13px; color: #111; }
  .page { max-width: 180mm; margin: 0 auto; padding: 15mm; border: 1px solid #ddd; }
  .header { text-align: center; border-bottom: 2px solid #1a1a2e; padding-bottom: 12px; margin-bottom: 16px; }
  .company-name { font-size: 20px; font-weight: 800; color: #1a1a2e; }
  .slip-title { font-size: 14px; font-weight: 600; color: #555; margin-top: 4px; }
  .period { font-size: 13px; font-weight: 700; margin-top: 2px; }
  .emp-box { display: grid; grid-template-columns: 1fr 1fr; gap: 8px; background: #f8f9fa; border-radius: 6px; padding: 12px; margin: 12px 0; font-size: 12px; }
  .emp-row { display: flex; gap: 6px; }
  .emp-label { color: #888; min-width: 100px; }
  .emp-value { font-weight: 600; }
  table { width: 100%; border-collapse: collapse; margin: 12px 0; }
  th { background: #1a1a2e; color: #fff; padding: 8px 12px; text-align: left; font-size: 11px; text-transform: uppercase; }
  td { padding: 8px 12px; border-bottom: 1px solid #eee; font-size: 12px; }
  .net-box { background: #1a1a2e; color: #fff; border-radius: 6px; padding: 12px 16px; display: flex; justify-content: space-between; align-items: center; margin-top: 16px; }
  .net-label { font-size: 12px; opacity: 0.8; }
  .net-amount { font-size: 20px; font-weight: 800; }
  .footer { margin-top: 24px; display: flex; justify-content: space-between; font-size: 11px; color: #888; }
  .sig-line { border-top: 1px solid #aaa; margin-top: 30px; padding-top: 4px; text-align: center; font-size: 10px; }
  @media print { body { print-color-adjust: exact; -webkit-print-color-adjust: exact; } }
</style>
</head>
<body>
<div class="page">
  <div class="header">
    <div class="company-name">${company?.name || "Company"}</div>
    <div class="slip-title">SALARY SLIP</div>
    <div class="period">${monthName} ${sal.year}</div>
  </div>

  <div class="emp-box">
    <div class="emp-row"><span class="emp-label">Employee:</span><span class="emp-value">${employee?.name || sal.employeeId}</span></div>
    <div class="emp-row"><span class="emp-label">Department:</span><span class="emp-value">${employee?.department || "—"}</span></div>
    <div class="emp-row"><span class="emp-label">Designation:</span><span class="emp-value">${employee?.position || "—"}</span></div>
    <div class="emp-row"><span class="emp-label">Payment Mode:</span><span class="emp-value">${(sal.paymentMode || "—").toUpperCase()}</span></div>
  </div>

  <table>
    <thead><tr><th>Earnings</th><th style="text-align:right">Amount</th><th>Deductions</th><th style="text-align:right">Amount</th></tr></thead>
    <tbody>
      <tr><td>Basic Salary</td><td style="text-align:right">${fmt(Number(sal.basic || 0))}</td><td>Deductions</td><td style="text-align:right">${fmt(Number(sal.deductions || 0))}</td></tr>
      <tr><td>HRA</td><td style="text-align:right">${fmt(Number(sal.hra || 0))}</td><td>—</td><td style="text-align:right">—</td></tr>
      <tr><td>Allowances</td><td style="text-align:right">${fmt(Number(sal.allowances || 0))}</td><td>—</td><td style="text-align:right">—</td></tr>
      <tr><td>Bonus</td><td style="text-align:right">${fmt(Number(sal.bonus || 0))}</td><td>—</td><td style="text-align:right">—</td></tr>
      <tr style="font-weight:700;background:#f3f4f6"><td>Gross</td><td style="text-align:right">${fmt(Number(sal.gross || 0))}</td><td>Total Deductions</td><td style="text-align:right">${fmt(Number(sal.deductions || 0))}</td></tr>
    </tbody>
  </table>

  <div class="net-box">
    <div><div class="net-label">NET PAY</div>${sal.notes ? `<div style="font-size:11px;opacity:0.7;margin-top:2px">${sal.notes}</div>` : ""}</div>
    <div class="net-amount">${fmt(Number(sal.netPay || 0))}</div>
  </div>

  <div class="footer">
    <div>Generated by Legacy Business ERP</div>
    <div class="sig-line">Authorised Signatory</div>
  </div>
</div>
<script>window.onload=function(){window.print();}</script>
</body>
</html>`;

  const w = window.open("", "_blank");
  if (w) { w.document.write(html); w.document.close(); }
}
