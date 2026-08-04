import * as XLSX from "xlsx";

export function exportToExcel(data: any[], filename: string, sheetName = "Sheet1") {
  const ws = XLSX.utils.json_to_sheet(data);
  const wb = XLSX.utils.book_new();
  XLSX.utils.book_append_sheet(wb, ws, sheetName);
  XLSX.writeFile(wb, `${filename}.xlsx`);
}

export function exportInvoices(invoices: any[]) {
  const rows = invoices.map((inv: any) => ({
    "Invoice #": inv.invoiceNumber,
    "Type": inv.invoiceType || "gst_invoice",
    "Customer": inv.customerName || "",
    "Date": inv.invoiceDate || "",
    "Due Date": inv.dueDate || "",
    "Subtotal (₹)": Number(inv.subtotal || 0),
    "Discount (₹)": Number(inv.discountAmount || 0),
    "CGST (₹)": Number(inv.cgst || 0),
    "SGST (₹)": Number(inv.sgst || 0),
    "IGST (₹)": Number(inv.igst || 0),
    "Total (₹)": Number(inv.total || 0),
    "Payment Status": inv.paymentStatus || "",
    "Status": inv.status || "",
  }));
  exportToExcel(rows, `Invoices_${new Date().toISOString().split("T")[0]}`, "Invoices");
}

export function exportCustomers(customers: any[]) {
  const rows = customers.map((c: any) => ({
    "Name": c.name, "Mobile": c.mobile || "", "Email": c.email || "",
    "GST": c.gstNumber || "", "City": c.city || "", "State": c.state || "",
    "Total Revenue (₹)": Number(c.totalRevenue || 0),
  }));
  exportToExcel(rows, `Customers_${new Date().toISOString().split("T")[0]}`, "Customers");
}

export function exportSuppliers(suppliers: any[]) {
  const rows = suppliers.map((s: any) => ({
    "Name": s.name, "Phone": s.phone || "", "Email": s.email || "",
    "GST": s.gstNumber || "", "City": s.city || "",
  }));
  exportToExcel(rows, `Suppliers_${new Date().toISOString().split("T")[0]}`, "Suppliers");
}

export function exportSalaries(salaries: any[], employees: any[]) {
  const empMap = Object.fromEntries(employees.map((e: any) => [e.id, e]));
  const rows = salaries.map((s: any) => {
    const emp = empMap[s.employeeId] || {};
    return {
      "Employee": emp.name || s.employeeId, "Department": emp.department || "",
      "Month": s.month, "Year": s.year,
      "Basic (₹)": Number(s.basic || 0), "HRA (₹)": Number(s.hra || 0),
      "Allowances (₹)": Number(s.allowances || 0), "Bonus (₹)": Number(s.bonus || 0),
      "Deductions (₹)": Number(s.deductions || 0), "Net Pay (₹)": Number(s.netPay || 0),
      "Payment Mode": s.paymentMode || "", "Status": s.status || "",
    };
  });
  exportToExcel(rows, `Salaries_${new Date().toISOString().split("T")[0]}`, "Salaries");
}

export function exportProducts(products: any[]) {
  const rows = products.map((p: any) => ({
    "Name": p.name, "SKU": p.sku || "", "Barcode": p.barcode || "",
    "Category": p.category || "", "HSN": p.hsnCode || "",
    "GST Rate (%)": p.gstRate || "0",
    "Purchase Price (₹)": Number(p.purchasePrice || 0),
    "Selling Price (₹)": Number(p.sellingPrice || 0),
    "Current Stock": p.currentStock || 0, "Min Stock": p.minStock || 0, "Unit": p.unit || "",
  }));
  exportToExcel(rows, `Inventory_${new Date().toISOString().split("T")[0]}`, "Products");
}

export function exportPayments(payments: any[]) {
  const rows = payments.map((p: any) => ({
    "Date": p.paidAt || "", "Type": p.type || "", "Reference": p.reference || "",
    "Party": p.partyName || "", "Method": p.method || "",
    "Amount (₹)": Number(p.amount || 0), "Notes": p.notes || "",
  }));
  exportToExcel(rows, `Payments_${new Date().toISOString().split("T")[0]}`, "Payments");
}

export function exportReportSummary(report: any, period: string) {
  const rows = [
    { "Metric": "Revenue (₹)", "Value": Number(report.revenue || 0) },
    { "Metric": "Expenses (₹)", "Value": Number(report.expenses || 0) },
    { "Metric": "Gross Profit (₹)", "Value": Number(report.profit || 0) },
    { "Metric": "Net Profit (₹)", "Value": Number(report.netProfit || 0) },
    { "Metric": "Total Invoices", "Value": Number(report.invoiceCount || 0) },
    { "Metric": "Paid Invoices", "Value": Number(report.paidCount || 0) },
    { "Metric": "Total Customers", "Value": Number(report.totalCustomers || 0) },
    { "Metric": "Period", "Value": period },
  ];
  exportToExcel(rows, `Report_${period}_${new Date().toISOString().split("T")[0]}`, "Summary");
}
