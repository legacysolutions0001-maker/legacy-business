import { useState } from "react";
import { useQuery } from "@tanstack/react-query";
import { apiFetch } from "../lib/auth";
import { exportToExcel } from "../lib/excel";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";
import { Badge } from "@/components/ui/badge";
import { BookOpen, Search, FileDown, TrendingUp, TrendingDown, ArrowRightLeft, Printer, ShoppingCart, IndianRupee, AlertCircle } from "lucide-react";
import { cn } from "@/lib/utils";

const fmt = (n: number) => `₹${new Intl.NumberFormat("en-IN", { maximumFractionDigits: 0 }).format(n)}`;

export default function Ledger() {
  const [partyType, setPartyType] = useState<"customer" | "supplier">("customer");
  const [selectedId, setSelectedId] = useState<string>("");
  const [fromDate, setFromDate] = useState("");
  const [toDate, setToDate] = useState("");
  const [search, setSearch] = useState("");

  const { data: customers = [] } = useQuery({ queryKey: ["customers"], queryFn: () => apiFetch("/customers").then(r => r.json()) });
  const { data: suppliers = [] } = useQuery({ queryKey: ["suppliers"], queryFn: () => apiFetch("/suppliers").then(r => r.json()) });
  const parties = partyType === "customer" ? customers as any[] : suppliers as any[];
  const filteredParties = parties.filter((p: any) => p.name.toLowerCase().includes(search.toLowerCase()));

  const { data: ledger, isLoading } = useQuery({
    queryKey: ["ledger", partyType, selectedId, fromDate, toDate],
    queryFn: () => {
      if (!selectedId) return null;
      const params = new URLSearchParams({ partyType, partyId: selectedId });
      if (fromDate) params.append("from", fromDate);
      if (toDate) params.append("to", toDate);
      return apiFetch(`/reports/ledger?${params}`).then(r => r.json());
    },
    enabled: !!selectedId,
  });

  const selectedParty = parties.find((p: any) => String(p.id) === selectedId);

  const handleExport = () => {
    if (!ledger?.entries) return;
    const rows = ledger.entries.map((e: any) => ({
      "Date": e.date, "Type": e.type, "Reference": e.reference || "",
      "Description": e.description || "", "Debit (₹)": e.debit || 0, "Credit (₹)": e.credit || 0,
      "Balance (₹)": e.balance || 0,
    }));
    exportToExcel(rows, `Ledger_${selectedParty?.name}_${new Date().toISOString().split("T")[0]}`, "Ledger");
  };

  const buildPrintHTML = (lang: "en" | "hi") => {
    const entries = ledger?.entries || [];
    const summary = ledger?.summary || {};
    const labels = lang === "hi" ? {
      title: "खाता बही", totalPurchase: "कुल खरीद", totalPaid: "कुल भुगतान", totalDue: "कुल बकाया",
      date: "तारीख", type: "प्रकार", ref: "संदर्भ", desc: "विवरण",
      debit: "डेबिट", credit: "क्रेडिट", balance: "शेष", cr: "जमा", dr: "नामे",
    } : {
      title: "Ledger", totalPurchase: "Total Purchase", totalPaid: "Total Paid", totalDue: "Total Due",
      date: "Date", type: "Type", ref: "Reference", desc: "Description",
      debit: "Debit", credit: "Credit", balance: "Balance", cr: "Cr", dr: "Dr",
    };
    return `<!DOCTYPE html><html><head><meta charset="UTF-8"/><title>${labels.title} - ${selectedParty?.name}</title>
    <style>* { margin:0;padding:0;box-sizing:border-box; } body { font-family:Arial,sans-serif;font-size:12px;color:#111; }
    .page { max-width:210mm;margin:0 auto;padding:15mm; }
    h1 { font-size:20px;font-weight:800;color:#1a1a2e;border-bottom:2px solid #1a1a2e;padding-bottom:8px;margin-bottom:16px; }
    .summary { display:grid;grid-template-columns:repeat(3,1fr);gap:12px;margin-bottom:16px; }
    .sum-box { background:#f8f9fa;border-radius:6px;padding:10px; }
    .sum-label { font-size:10px;color:#888;text-transform:uppercase; }
    .sum-value { font-size:16px;font-weight:700;margin-top:3px; }
    table { width:100%;border-collapse:collapse; }
    th { background:#1a1a2e;color:#fff;padding:7px 10px;font-size:11px;text-align:left; }
    td { padding:7px 10px;border-bottom:1px solid #eee;font-size:11px; }
    tr:nth-child(even) td { background:#f9f9f9; }
    @media print { body { print-color-adjust:exact; } }</style></head><body>
    <div class="page">
      <h1>${labels.title}: ${selectedParty?.name}</h1>
      <div class="summary">
        <div class="sum-box"><div class="sum-label">${labels.totalPurchase}</div><div class="sum-value" style="color:#2563eb">${fmt(Math.abs(summary.totalDebit || 0))}</div></div>
        <div class="sum-box"><div class="sum-label">${labels.totalPaid}</div><div class="sum-value" style="color:#059669">${fmt(Math.abs(summary.totalCredit || 0))}</div></div>
        <div class="sum-box"><div class="sum-label">${labels.totalDue}</div><div class="sum-value" style="color:${(summary.balance || 0) >= 0 ? "#2563eb" : "#dc2626"}">${fmt(Math.abs(summary.balance || 0))}</div></div>
      </div>
      <table><thead><tr><th>${labels.date}</th><th>${labels.type}</th><th>${labels.ref}</th><th>${labels.desc}</th><th style="text-align:right">${labels.debit}</th><th style="text-align:right">${labels.credit}</th><th style="text-align:right">${labels.balance}</th></tr></thead>
      <tbody>${entries.map((e: any) => `<tr><td>${e.date}</td><td>${e.type}</td><td>${e.reference || "—"}</td><td>${e.description || "—"}</td><td style="text-align:right;color:#dc2626">${e.debit > 0 ? fmt(e.debit) : "—"}</td><td style="text-align:right;color:#059669">${e.credit > 0 ? fmt(e.credit) : "—"}</td><td style="text-align:right;font-weight:700">${fmt(Math.abs(e.balance))} ${e.balance < 0 ? labels.cr : labels.dr}</td></tr>`).join("")}</tbody></table>
    </div><script>window.onload=function(){window.print();}</script></body></html>`;
  };

  const handlePrint = () => {
    const html = buildPrintHTML("en");
    const w = window.open("", "_blank");
    if (w) { w.document.write(html); w.document.close(); }
  };

  const totalPurchase = Math.abs(ledger?.summary?.totalDebit || 0);
  const totalPaid = Math.abs(ledger?.summary?.totalCredit || 0);
  const totalDue = Math.abs(ledger?.summary?.balance || 0);

  return (
    <div className="space-y-5">
      <div className="flex items-center justify-between">
        <div><h1 className="text-2xl font-bold">Ledger</h1><p className="text-muted-foreground text-sm">Customer & supplier account statements</p></div>
        {ledger && (
          <div className="flex gap-2 flex-wrap">
            <Button variant="outline" size="sm" onClick={handlePrint}><Printer className="w-4 h-4 mr-1" />Print (English)</Button>
            <Button variant="outline" size="sm" onClick={() => { const html = buildPrintHTML("hi"); const w = window.open("", "_blank"); if (w) { w.document.write(html); w.document.close(); } }}><Printer className="w-4 h-4 mr-1" />प्रिंट (हिन्दी)</Button>
            <Button variant="outline" size="sm" onClick={handleExport}><FileDown className="w-4 h-4 mr-1" />Download PDF</Button>
          </div>
        )}
      </div>

      <div className="grid md:grid-cols-4 gap-4">
        <div className="space-y-3">
          <Card>
            <CardContent className="pt-4 space-y-3">
              <div className="grid gap-2">
                <Select value={partyType} onValueChange={v => { setPartyType(v as any); setSelectedId(""); }}>
                  <SelectTrigger><SelectValue /></SelectTrigger>
                  <SelectContent><SelectItem value="customer">Customers</SelectItem><SelectItem value="supplier">Suppliers</SelectItem></SelectContent>
                </Select>
              </div>
              <div className="relative"><Search className="absolute left-2.5 top-2.5 h-4 w-4 text-muted-foreground" /><Input placeholder="Search..." className="pl-8 h-9 text-sm" value={search} onChange={e => setSearch(e.target.value)} /></div>
              <div className="grid gap-1 max-h-64 overflow-y-auto">
                {filteredParties.map((p: any) => (
                  <button key={p.id} onClick={() => setSelectedId(String(p.id))} className={cn("flex items-center justify-between px-3 py-2 rounded-lg text-sm text-left transition-colors", selectedId === String(p.id) ? "bg-primary text-primary-foreground" : "hover:bg-muted")}>
                    <span className="truncate">{p.name}</span>
                    {partyType === "customer" && Number(p.totalRevenue || 0) > 0 && <span className="text-xs opacity-70">{fmt(Number(p.totalRevenue))}</span>}
                  </button>
                ))}
                {filteredParties.length === 0 && <p className="text-center text-sm text-muted-foreground py-4">No {partyType}s</p>}
              </div>
            </CardContent>
          </Card>

          <Card>
            <CardContent className="pt-4 space-y-2">
              <p className="text-xs font-semibold text-muted-foreground uppercase tracking-wide">Filter by Date</p>
              <div className="grid gap-2">
                <Input type="date" value={fromDate} onChange={e => setFromDate(e.target.value)} className="h-8 text-xs" placeholder="From" />
                <Input type="date" value={toDate} onChange={e => setToDate(e.target.value)} className="h-8 text-xs" placeholder="To" />
                {(fromDate || toDate) && <Button size="sm" variant="ghost" onClick={() => { setFromDate(""); setToDate(""); }}>Clear</Button>}
              </div>
            </CardContent>
          </Card>
        </div>

        <div className="md:col-span-3 space-y-4">
          {!selectedId ? (
            <Card className="h-64 flex items-center justify-center">
              <div className="text-center text-muted-foreground">
                <BookOpen className="w-12 h-12 mb-3 mx-auto opacity-30" />
                <p>Select a {partyType} to view ledger</p>
              </div>
            </Card>
          ) : (
            <>
              {selectedParty && (
                <div className="grid grid-cols-3 gap-3">
                  {[
                    { label: "Total Purchase", value: totalPurchase, icon: ShoppingCart, cls: "text-blue-400" },
                    { label: "Total Paid", value: totalPaid, icon: IndianRupee, cls: "text-emerald-400" },
                    { label: "Total Due", value: totalDue, icon: AlertCircle, cls: (ledger?.summary?.balance ?? 0) >= 0 ? "text-orange-400" : "text-red-400" },
                  ].map(s => (
                    <Card key={s.label} className="bg-card/50"><CardContent className="pt-3 pb-3 flex items-center gap-3">
                      <s.icon className={`w-7 h-7 ${s.cls}`} />
                      <div><p className="text-xs text-muted-foreground">{s.label}</p><p className={`text-lg font-bold ${s.cls}`}>{fmt(s.value)}</p></div>
                    </CardContent></Card>
                  ))}
                </div>
              )}

              <Card>
                <CardHeader className="pb-2">
                  <CardTitle className="text-sm flex items-center gap-2">
                    <BookOpen className="w-4 h-4" />{selectedParty?.name} — Account Statement
                  </CardTitle>
                </CardHeader>
                <CardContent className="p-0">
                  {isLoading ? (
                    <div className="flex items-center justify-center py-12"><div className="animate-spin w-6 h-6 border-4 border-primary border-t-transparent rounded-full" /></div>
                  ) : (
                    <Table>
                      <TableHeader><TableRow><TableHead>Date</TableHead><TableHead>Type</TableHead><TableHead>Reference</TableHead><TableHead>Description</TableHead><TableHead className="text-right">Debit</TableHead><TableHead className="text-right">Credit</TableHead><TableHead className="text-right">Balance</TableHead></TableRow></TableHeader>
                      <TableBody>
                        {(ledger?.entries || []).map((e: any, i: number) => (
                          <TableRow key={i} className="hover:bg-muted/40">
                            <TableCell className="text-sm">{e.date}</TableCell>
                            <TableCell><Badge variant="outline" className="text-xs capitalize">{e.type}</Badge></TableCell>
                            <TableCell className="font-mono text-xs text-muted-foreground">{e.reference || "—"}</TableCell>
                            <TableCell className="text-sm max-w-48 truncate">{e.description || "—"}</TableCell>
                            <TableCell className="text-right text-sm text-red-400">{e.debit > 0 ? fmt(e.debit) : "—"}</TableCell>
                            <TableCell className="text-right text-sm text-emerald-400">{e.credit > 0 ? fmt(e.credit) : "—"}</TableCell>
                            <TableCell className={cn("text-right text-sm font-semibold", e.balance >= 0 ? "text-blue-400" : "text-red-400")}>{fmt(Math.abs(e.balance))}{e.balance < 0 ? " Cr" : " Dr"}</TableCell>
                          </TableRow>
                        ))}
                        {(!ledger?.entries || ledger.entries.length === 0) && (
                          <TableRow><TableCell colSpan={7} className="text-center py-12 text-muted-foreground">No transactions found</TableCell></TableRow>
                        )}
                      </TableBody>
                    </Table>
                  )}
                </CardContent>
              </Card>
            </>
          )}
        </div>
      </div>
    </div>
  );
}
