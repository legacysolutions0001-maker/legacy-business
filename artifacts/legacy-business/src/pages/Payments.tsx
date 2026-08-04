import { useState } from "react";
import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { apiFetch } from "../lib/auth";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogFooter } from "@/components/ui/dialog";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Badge } from "@/components/ui/badge";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { Plus, IndianRupee, ArrowUpRight, ArrowDownLeft, FileDown, Banknote, Smartphone, CreditCard, Building2, Trash2 } from "lucide-react";
import { DropdownMenu, DropdownMenuContent, DropdownMenuItem, DropdownMenuTrigger } from "@/components/ui/dropdown-menu";
import { MoreHorizontal } from "lucide-react";
import { exportPayments } from "../lib/excel";
import { useToast } from "@/hooks/use-toast";
import { format } from "date-fns";
import { cn } from "@/lib/utils";

const fmt = (n: number) => `₹${new Intl.NumberFormat("en-IN", { maximumFractionDigits: 0 }).format(n)}`;
const MODES = ["cash", "upi", "card", "bank", "cheque", "dd"];
const EMPTY = { type: "receipt" as "receipt" | "payment", amount: "", paymentMode: "cash", referenceNumber: "", payerName: "", payerType: "customer", notes: "", date: format(new Date(), "yyyy-MM-dd") };

const METHOD_CARDS = [
  { key: "cash", label: "Cash", icon: Banknote, cls: "text-green-400" },
  { key: "upi", label: "UPI", icon: Smartphone, cls: "text-orange-400" },
  { key: "card", label: "Card", icon: CreditCard, cls: "text-cyan-400" },
  { key: "bank", label: "Bank Transfer", icon: Building2, cls: "text-blue-400" },
  { key: "cheque", label: "Cheque", icon: FileDown, cls: "text-purple-400" },
  { key: "dd", label: "DD", icon: FileDown, cls: "text-yellow-400" },
];

export default function Payments() {
  const qc = useQueryClient();
  const { toast } = useToast();
  const [open, setOpen] = useState(false);
  const [form, setForm] = useState({ ...EMPTY });
  const [activeTab, setActiveTab] = useState("today");

  const { data: payments = [], isLoading } = useQuery({ queryKey: ["payments"], queryFn: () => apiFetch("/payments").then(r => r.json()) });
  const { data: summary } = useQuery({ queryKey: ["payment-summary"], queryFn: () => apiFetch("/payments/summary").then(r => r.json()) });

  const save = useMutation({
    mutationFn: (d: any) => apiFetch("/payments", { method: "POST", body: JSON.stringify(d) }).then(r => r.json()),
    onSuccess: () => { qc.invalidateQueries({ queryKey: ["payments"] }); qc.invalidateQueries({ queryKey: ["payment-summary"] }); setOpen(false); toast({ title: "Payment recorded" }); },
    onError: () => toast({ title: "Failed", variant: "destructive" }),
  });
  const del = useMutation({
    mutationFn: (id: number) => apiFetch(`/payments/${id}`, { method: "DELETE" }),
    onSuccess: () => { qc.invalidateQueries({ queryKey: ["payments"] }); qc.invalidateQueries({ queryKey: ["payment-summary"] }); toast({ title: "Payment deleted" }); },
    onError: () => toast({ title: "Failed", variant: "destructive" }),
  });

  const setF = (k: keyof typeof EMPTY) => (e: React.ChangeEvent<HTMLInputElement>) => setForm(f => ({ ...f, [k]: e.target.value }));

  const s = summary as any || {};
  const today = new Date().toISOString().split("T")[0];
  const monthStart = new Date(new Date().getFullYear(), new Date().getMonth(), 1).toISOString().split("T")[0];
  const yearStart = `${new Date().getFullYear()}-01-01`;

  const filterPayments = (tab: string) => {
    const all = payments as any[];
    if (tab === "today") return all.filter((p: any) => (p.date || p.createdAt)?.split("T")[0] === today);
    if (tab === "monthly") return all.filter((p: any) => (p.date || p.createdAt)?.split("T")[0] >= monthStart);
    if (tab === "yearly") return all.filter((p: any) => (p.date || p.createdAt)?.split("T")[0] >= yearStart);
    return all;
  };

  const tabPayments = filterPayments(activeTab);

  const tabTotal = (tab: string) => {
    return filterPayments(tab).filter((p: any) => p.type === "receipt").reduce((s: number, p: any) => s + Number(p.amount || 0), 0);
  };
  const tabOut = (tab: string) => {
    return filterPayments(tab).filter((p: any) => p.type === "payment").reduce((s: number, p: any) => s + Number(p.amount || 0), 0);
  };

  const methodBreakdown = (tab: string) => {
    const filtered = filterPayments(tab).filter((p: any) => p.type === "receipt");
    return METHOD_CARDS.map(m => ({
      ...m,
      total: filtered.filter((p: any) => p.paymentMode === m.key).reduce((s: number, p: any) => s + Number(p.amount || 0), 0),
    }));
  };

  return (
    <div className="space-y-5">
      <div className="flex items-center justify-between">
        <div><h1 className="text-2xl font-bold">Payments & Receipts</h1><p className="text-muted-foreground text-sm">Record and track all money movements</p></div>
        <div className="flex gap-2">
          <Button variant="outline" size="sm" onClick={() => exportPayments(payments as any[])}><FileDown className="w-4 h-4 mr-1" />Export</Button>
          <Button onClick={() => { setForm({ ...EMPTY }); setOpen(true); }}><Plus className="w-4 h-4 mr-2" />Record Payment</Button>
        </div>
      </div>

      <Tabs value={activeTab} onValueChange={setActiveTab}>
        <TabsList>
          <TabsTrigger value="today">Today</TabsTrigger>
          <TabsTrigger value="monthly">This Month</TabsTrigger>
          <TabsTrigger value="yearly">This Year</TabsTrigger>
          <TabsTrigger value="all">All Time</TabsTrigger>
        </TabsList>

        {["today", "monthly", "yearly", "all"].map(tab => (
          <TabsContent key={tab} value={tab} className="space-y-4 mt-4">
            <div className="grid grid-cols-2 md:grid-cols-3 lg:grid-cols-6 gap-3">
              {methodBreakdown(tab).map(m => (
                <Card key={m.key} className="bg-card/50">
                  <CardContent className="pt-3 pb-3">
                    <div className="flex items-center gap-2 mb-1">
                      <m.icon className={`w-3.5 h-3.5 ${m.cls}`} />
                      <p className="text-xs text-muted-foreground">{m.label}</p>
                    </div>
                    <p className={cn("text-base font-bold", m.cls)}>{fmt(m.total)}</p>
                  </CardContent>
                </Card>
              ))}
            </div>

            <div className="grid grid-cols-3 gap-3">
              <Card className="bg-emerald-500/5 border-emerald-500/20">
                <CardContent className="pt-4 pb-4">
                  <div className="flex items-center gap-2 mb-1"><ArrowDownLeft className="w-4 h-4 text-emerald-400"/><p className="text-xs text-muted-foreground">Money In (Receipts)</p></div>
                  <p className="text-xl font-bold text-emerald-400">{fmt(tabTotal(tab))}</p>
                </CardContent>
              </Card>
              <Card className="bg-red-500/5 border-red-500/20">
                <CardContent className="pt-4 pb-4">
                  <div className="flex items-center gap-2 mb-1"><ArrowUpRight className="w-4 h-4 text-red-400"/><p className="text-xs text-muted-foreground">Money Out (Payments)</p></div>
                  <p className="text-xl font-bold text-red-400">{fmt(tabOut(tab))}</p>
                </CardContent>
              </Card>
              <Card className={cn("border", tabTotal(tab)-tabOut(tab)>=0?"bg-blue-500/5 border-blue-500/20":"bg-orange-500/5 border-orange-500/20")}>
                <CardContent className="pt-4 pb-4">
                  <div className="flex items-center gap-2 mb-1"><IndianRupee className="w-4 h-4 text-blue-400"/><p className="text-xs text-muted-foreground">Net Balance</p></div>
                  <p className={cn("text-xl font-bold",tabTotal(tab)-tabOut(tab)>=0?"text-blue-400":"text-orange-400")}>{fmt(Math.abs(tabTotal(tab)-tabOut(tab)))}{tabTotal(tab)-tabOut(tab)<0?" ▼":""}</p>
                </CardContent>
              </Card>
            </div>

            <Card>
              <Table>
                <TableHeader>
                  <TableRow>
                    <TableHead>Date</TableHead>
                    <TableHead>Type</TableHead>
                    <TableHead>Party</TableHead>
                    <TableHead>Mode</TableHead>
                    <TableHead>Ref #</TableHead>
                    <TableHead className="text-right">Amount</TableHead>
                    <TableHead className="w-10"/>
                  </TableRow>
                </TableHeader>
                <TableBody>
                  {isLoading ? <TableRow><TableCell colSpan={7} className="text-center py-8 text-muted-foreground">Loading...</TableCell></TableRow>
                    : tabPayments.length === 0 ? <TableRow><TableCell colSpan={7} className="text-center py-12">
                      <div className="flex flex-col items-center text-muted-foreground">
                        <IndianRupee className="w-10 h-10 mb-2 opacity-30" /><p>No payments for this period</p>
                        <Button variant="outline" size="sm" className="mt-3" onClick={() => { setForm({ ...EMPTY }); setOpen(true); }}><Plus className="w-4 h-4 mr-1" />Record payment</Button>
                      </div>
                    </TableCell></TableRow>
                      : tabPayments.map((p: any) => (
                        <TableRow key={p.id} className="hover:bg-muted/40">
                          <TableCell className="text-sm text-muted-foreground">{p.date ? format(new Date(p.date), "dd MMM yyyy") : format(new Date(p.createdAt), "dd MMM yyyy")}</TableCell>
                          <TableCell>
                            <div className={cn("inline-flex items-center gap-1.5 text-xs font-medium px-2 py-0.5 rounded-full border", p.type==="receipt"?"bg-emerald-500/10 text-emerald-400 border-emerald-500/20":"bg-red-500/10 text-red-400 border-red-500/20")}>
                              {p.type === "receipt" ? <ArrowDownLeft className="w-3 h-3" /> : <ArrowUpRight className="w-3 h-3" />}
                              {p.type === "receipt" ? "Receipt" : "Payment"}
                            </div>
                          </TableCell>
                          <TableCell><div className="font-medium text-sm">{p.payerName || "—"}</div><div className="text-xs text-muted-foreground capitalize">{p.payerType}</div></TableCell>
                          <TableCell><Badge variant="outline" className="capitalize text-xs">{p.paymentMode}</Badge></TableCell>
                          <TableCell className="text-xs font-mono text-muted-foreground">{p.referenceNumber || "—"}</TableCell>
                          <TableCell className={cn("text-right font-semibold", p.type === "receipt" ? "text-emerald-400" : "text-red-400")}>{p.type==="payment"?"−":""}{fmt(p.amount)}</TableCell>
                          <TableCell>
                            <DropdownMenu>
                              <DropdownMenuTrigger asChild><Button variant="ghost" size="icon" className="h-7 w-7"><MoreHorizontal className="h-3.5 w-3.5"/></Button></DropdownMenuTrigger>
                              <DropdownMenuContent align="end">
                                <DropdownMenuItem className="text-destructive" onClick={()=>del.mutate(p.id)}><Trash2 className="h-4 w-4 mr-2"/>Delete</DropdownMenuItem>
                              </DropdownMenuContent>
                            </DropdownMenu>
                          </TableCell>
                        </TableRow>
                      ))}
                </TableBody>
              </Table>
            </Card>
          </TabsContent>
        ))}
      </Tabs>

      <Dialog open={open} onOpenChange={setOpen}>
        <DialogContent className="max-w-md">
          <DialogHeader><DialogTitle>Record Payment</DialogTitle></DialogHeader>
          <div className="grid gap-4 py-2">
            <div className="grid grid-cols-2 gap-3">
              <div className="grid gap-2"><Label>Type</Label>
                <Select value={form.type} onValueChange={v => setForm(f => ({ ...f, type: v as any }))}>
                  <SelectTrigger><SelectValue /></SelectTrigger>
                  <SelectContent><SelectItem value="receipt">Receipt (Money In)</SelectItem><SelectItem value="payment">Payment (Money Out)</SelectItem></SelectContent>
                </Select>
              </div>
              <div className="grid gap-2"><Label>Date</Label><Input type="date" value={form.date} onChange={setF("date")} /></div>
            </div>
            <div className="grid gap-2"><Label>Amount (₹) *</Label><Input type="number" value={form.amount} onChange={setF("amount")} placeholder="Enter amount" /></div>
            <div className="grid grid-cols-2 gap-3">
              <div className="grid gap-2"><Label>Payment Mode</Label>
                <Select value={form.paymentMode} onValueChange={v => setForm(f => ({ ...f, paymentMode: v }))}>
                  <SelectTrigger><SelectValue /></SelectTrigger>
                  <SelectContent>{MODES.map(m => <SelectItem key={m} value={m} className="capitalize">{m.toUpperCase()}</SelectItem>)}</SelectContent>
                </Select>
              </div>
              <div className="grid gap-2"><Label>Party Type</Label>
                <Select value={form.payerType} onValueChange={v => setForm(f => ({ ...f, payerType: v }))}>
                  <SelectTrigger><SelectValue /></SelectTrigger>
                  <SelectContent><SelectItem value="customer">Customer</SelectItem><SelectItem value="supplier">Supplier</SelectItem><SelectItem value="other">Other</SelectItem></SelectContent>
                </Select>
              </div>
            </div>
            <div className="grid gap-2"><Label>Party Name</Label><Input value={form.payerName} onChange={setF("payerName")} placeholder="Customer/Supplier name" /></div>
            <div className="grid gap-2"><Label>Reference / UTR / Cheque #</Label><Input value={form.referenceNumber} onChange={setF("referenceNumber")} placeholder="Reference number" /></div>
            <div className="grid gap-2"><Label>Notes</Label><Input value={form.notes} onChange={setF("notes")} placeholder="Optional notes" /></div>
          </div>
          <DialogFooter>
            <Button variant="outline" onClick={() => setOpen(false)}>Cancel</Button>
            <Button onClick={() => { if (!form.amount) { toast({ title: "Amount required", variant: "destructive" }); return; } save.mutate({ ...form, amount: parseFloat(form.amount), date: new Date(form.date).toISOString() }); }} disabled={save.isPending}>Record Payment</Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </div>
  );
}
