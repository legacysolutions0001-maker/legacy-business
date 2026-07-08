import { useState } from "react";
import { apiFetch } from "../lib/auth";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Download, Database, FileSpreadsheet, FileText, HardDrive, CheckCircle, AlertCircle } from "lucide-react";
import { useToast } from "@/hooks/use-toast";
import * as XLSX from "xlsx";

const TABLE_EXPORTS = [
  { key:"products", label:"Products & Variants", icon:"📦" },
  { key:"invoices", label:"Invoices", icon:"🧾" },
  { key:"customers", label:"Customers", icon:"👥" },
  { key:"suppliers", label:"Suppliers", icon:"🏭" },
  { key:"purchase_orders", label:"Purchase Orders", icon:"🛒" },
  { key:"employees", label:"Employees", icon:"👷" },
  { key:"salary_records", label:"Salary Records", icon:"💰" },
  { key:"daybook", label:"Daybook / Expenses", icon:"📒" },
  { key:"payments", label:"Payments", icon:"💳" },
];

export default function Backup() {
  const { toast } = useToast();
  const [downloading,setDownloading]=useState<string|null>(null);

  const downloadExcelBackup = async () => {
    setDownloading("excel");
    try {
      const resp = await apiFetch("/backup/export");
      if (!resp.ok) throw new Error(await resp.text());
      const { data } = await resp.json();
      const wb = XLSX.utils.book_new();
      const tableOrder = ["customers","suppliers","products","product_variants","invoices","purchase_orders",
        "payments","employees","salary_records","daybook","eway_bills","sales_returns","purchase_returns",
        "cash_bank_ledger","stock_batches","company_settings","company"];
      for (const name of tableOrder) {
        const rows: any[] = data[name];
        if (!rows || rows.length === 0) continue;
        const ws = XLSX.utils.json_to_sheet(rows);
        // Auto-width columns
        const colWidths = Object.keys(rows[0]).map(k => ({ wch: Math.max(k.length, 12) }));
        ws["!cols"] = colWidths;
        const sheetName = name.replace(/_/g," ").replace(/\b\w/g, c => c.toUpperCase()).slice(0,31);
        XLSX.utils.book_append_sheet(wb, ws, sheetName);
      }
      const date = new Date().toISOString().split("T")[0];
      XLSX.writeFile(wb, `legacy-erp-backup-${date}.xlsx`);
      toast({ title: "Excel backup downloaded!", description: "Open in Excel or Google Sheets. Save to pen drive or Google Drive." });
    } catch (e: any) {
      toast({ title: "Backup failed", description: e.message, variant: "destructive" });
    } finally {
      setDownloading(null);
    }
  };

  const downloadFullBackup = async () => {
    setDownloading("full");
    try {
      const resp = await apiFetch("/backup/export");
      if (!resp.ok) throw new Error(await resp.text());
      const blob = await resp.blob();
      const url = URL.createObjectURL(blob);
      const a = document.createElement("a");
      a.href = url;
      const date = new Date().toISOString().split("T")[0];
      a.download = `legacy-erp-backup-${date}.json`;
      a.click();
      URL.revokeObjectURL(url);
      toast({ title: "JSON backup downloaded!", description: "Save this file to your pen drive, Google Drive, or OneDrive." });
    } catch (e: any) {
      toast({ title: "Backup failed", description: e.message, variant: "destructive" });
    } finally {
      setDownloading(null);
    }
  };

  const downloadCSV = async (table: string, label: string) => {
    setDownloading(table);
    try {
      const resp = await apiFetch(`/backup/export-csv?table=${table}`);
      const blob = await resp.blob();
      const url = URL.createObjectURL(blob);
      const a = document.createElement("a");
      a.href = url;
      const date = new Date().toISOString().split("T")[0];
      a.download = `${table}-${date}.csv`;
      a.click();
      URL.revokeObjectURL(url);
      toast({ title: `${label} CSV downloaded!` });
    } catch (e: any) {
      toast({ title: "Download failed", description: e.message, variant: "destructive" });
    } finally {
      setDownloading(null);
    }
  };

  return (
    <div className="space-y-6">
      <div>
        <h1 className="text-2xl font-bold">Backup & Export</h1>
        <p className="text-muted-foreground text-sm">Download all your data to save on pen drive, Google Drive, OneDrive, or any storage</p>
      </div>

      <div className="grid md:grid-cols-2 gap-4">
        <Card className="border-2 border-emerald-500/40 bg-emerald-500/5">
          <CardHeader>
            <div className="flex items-center gap-3">
              <div className="w-12 h-12 rounded-xl bg-emerald-500/20 flex items-center justify-center">
                <FileSpreadsheet className="w-6 h-6 text-emerald-500"/>
              </div>
              <div>
                <CardTitle className="text-lg">Full Backup — Excel (Recommended)</CardTitle>
                <p className="text-sm text-muted-foreground">All tables in one .xlsx file — open in Excel or Google Sheets</p>
              </div>
            </div>
          </CardHeader>
          <CardContent className="space-y-3">
            <div className="grid grid-cols-2 gap-2 text-sm">
              {["Products","Invoices","Customers","Suppliers","Employees","Salary","Purchases","Payments","E-Way Bills","Daybook","Returns","Cash/Bank Ledger"].map(item=>(
                <div key={item} className="flex items-center gap-1.5 text-muted-foreground"><CheckCircle className="w-3.5 h-3.5 text-emerald-500"/>{item}</div>
              ))}
            </div>
            <Button className="w-full bg-emerald-600 hover:bg-emerald-700 text-white" size="lg" onClick={downloadExcelBackup} disabled={!!downloading}>
              <FileSpreadsheet className="w-5 h-5 mr-2"/>
              {downloading==="excel"?"Preparing Excel…":"Download Full Backup (.xlsx)"}
            </Button>
            <Button className="w-full" size="sm" variant="outline" onClick={downloadFullBackup} disabled={!!downloading}>
              <Download className="w-4 h-4 mr-2"/>
              {downloading==="full"?"Preparing…":"Also available: JSON backup (for IT restore)"}
            </Button>
            <div className="flex items-start gap-2 text-xs text-muted-foreground bg-muted/30 rounded-lg p-3">
              <HardDrive className="w-4 h-4 mt-0.5 flex-shrink-0 text-blue-400"/>
              <div>
                <p className="font-medium text-foreground mb-1">How to save to pen drive / Google Drive:</p>
                <ol className="space-y-1 list-decimal list-inside">
                  <li>Click "Download Full Backup" — file saves to your Downloads folder</li>
                  <li><strong>Pen Drive:</strong> Plug in pen drive → copy the .xlsx file to it</li>
                  <li><strong>Google Drive:</strong> Open drive.google.com → drag and drop the file</li>
                  <li><strong>OneDrive / Microsoft:</strong> Open OneDrive folder → paste the file</li>
                </ol>
              </div>
            </div>
          </CardContent>
        </Card>

        <Card>
          <CardHeader>
            <div className="flex items-center gap-3">
              <div className="w-12 h-12 rounded-xl bg-blue-500/10 flex items-center justify-center">
                <FileText className="w-6 h-6 text-blue-400"/>
              </div>
              <div>
                <CardTitle className="text-lg">Export Individual Tables</CardTitle>
                <p className="text-sm text-muted-foreground">Download each module as an Excel-compatible CSV file</p>
              </div>
            </div>
          </CardHeader>
          <CardContent>
            <div className="space-y-2">
              {TABLE_EXPORTS.map(t=>(
                <div key={t.key} className="flex items-center justify-between py-2 border-b border-muted/30 last:border-0">
                  <div className="flex items-center gap-2">
                    <span className="text-lg">{t.icon}</span>
                    <span className="text-sm font-medium">{t.label}</span>
                  </div>
                  <Button size="sm" variant="outline" onClick={()=>downloadCSV(t.key,t.label)} disabled={downloading===t.key}>
                    <Download className="w-3.5 h-3.5 mr-1"/>
                    {downloading===t.key?"...":"CSV"}
                  </Button>
                </div>
              ))}
            </div>
          </CardContent>
        </Card>
      </div>

      <Card className="bg-amber-500/5 border-amber-500/20">
        <CardContent className="pt-4">
          <div className="flex items-start gap-3">
            <AlertCircle className="w-5 h-5 text-amber-400 mt-0.5 flex-shrink-0"/>
            <div className="space-y-1">
              <p className="font-semibold text-sm">Backup Tips</p>
              <ul className="text-sm text-muted-foreground space-y-1">
                <li>• Take a full backup at least once a week and before making major changes</li>
                <li>• Store the backup file in at least 2 places (pen drive + Google Drive)</li>
                <li>• The JSON backup file contains all your data and can be shared with your IT person to restore if needed</li>
                <li>• CSV files can be opened in Excel, Google Sheets, or LibreOffice</li>
                <li>• Your data is also automatically backed up by Render's database every day</li>
              </ul>
            </div>
          </div>
        </CardContent>
      </Card>
    </div>
  );
}
