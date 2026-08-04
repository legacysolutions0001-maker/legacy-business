import { useState } from "react";
import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { apiFetch } from "../../lib/auth";
import { Card, CardContent } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogFooter } from "@/components/ui/dialog";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Badge } from "@/components/ui/badge";
import { CreditCard, Plus, Edit, Printer, Eye, Settings, CheckCircle, XCircle } from "lucide-react";
import { useToast } from "@/hooks/use-toast";
import { format } from "date-fns";
import { cn } from "@/lib/utils";
import { printSubscriptionInvoice } from "../../lib/pdf";

const PLANS = ["starter", "professional", "enterprise"];
const fmt = (n: number) => `₹${new Intl.NumberFormat("en-IN", { maximumFractionDigits: 0 }).format(n)}`;

export default function SuperSubscriptions() {
  const qc = useQueryClient();
  const { toast } = useToast();
  const [open, setOpen] = useState(false);
  const [pricingOpen, setPricingOpen] = useState(false);
  const [previewSub, setPreviewSub] = useState<any>(null);
  const [editing, setEditing] = useState<any>(null);
  const [form, setForm] = useState({ companyId: "", plan: "starter", status: "active", paidStatus: "unpaid", startDate: format(new Date(), "yyyy-MM-dd"), endDate: format(new Date(Date.now() + 365 * 86400000), "yyyy-MM-dd"), amount: "" });
  const [pricingForm, setPricingForm] = useState<Record<string, string>>({});

  const { data: subs = [], isLoading } = useQuery({ queryKey: ["super-subs"], queryFn: () => apiFetch("/super/subscriptions").then(r => r.json()) });
  const { data: companies = [] } = useQuery({ queryKey: ["super-companies"], queryFn: () => apiFetch("/super/companies").then(r => r.json()) });
  const { data: summary } = useQuery({ queryKey: ["super-sub-summary"], queryFn: () => apiFetch("/super/subscriptions/summary").then(r => r.json()) });
  const { data: pricing = [] } = useQuery({ queryKey: ["sub-pricing"], queryFn: () => apiFetch("/subscriptions/pricing").then(r => r.json()) });
  const { data: previewData } = useQuery({
    queryKey: ["sub-invoice", previewSub?.id],
    queryFn: () => apiFetch(`/subscriptions/${previewSub.id}`).then(r => r.json()),
    enabled: !!previewSub?.id,
  });

  const save = useMutation({
    mutationFn: (d: any) => editing
      ? apiFetch(`/super/subscriptions/${editing.id}`, { method: "PATCH", body: JSON.stringify(d) }).then(r => r.json())
      : apiFetch("/super/subscriptions", { method: "POST", body: JSON.stringify(d) }).then(r => r.json()),
    onSuccess: () => { qc.invalidateQueries({ queryKey: ["super-subs"] }); setOpen(false); toast({ title: editing ? "Subscription updated" : "Subscription created" }); },
    onError: () => toast({ title: "Failed", variant: "destructive" }),
  });

  const markPaid = useMutation({
    mutationFn: ({ id, paidStatus }: { id: number; paidStatus: string }) => apiFetch(`/super/subscriptions/${id}`, { method: "PATCH", body: JSON.stringify({ paidStatus }) }).then(r => r.json()),
    onSuccess: () => { qc.invalidateQueries({ queryKey: ["super-subs"] }); toast({ title: "Payment status updated" }); },
    onError: () => toast({ title: "Failed", variant: "destructive" }),
  });

  const savePricing = useMutation({
    mutationFn: async (updates: Record<string, string>) => {
      await Promise.all(Object.entries(updates).map(([plan, price]) =>
        apiFetch(`/subscriptions/pricing/${plan}`, { method: "PATCH", body: JSON.stringify({ price: parseFloat(price) }) })
      ));
    },
    onSuccess: () => { qc.invalidateQueries({ queryKey: ["sub-pricing"] }); setPricingOpen(false); toast({ title: "Pricing updated" }); },
    onError: () => toast({ title: "Failed", variant: "destructive" }),
  });

  const openCreate = () => {
    setEditing(null);
    const defaultPrice = (pricing as any[]).find((p: any) => p.plan === "starter")?.price || "";
    setForm({ companyId: "", plan: "starter", status: "active", paidStatus: "unpaid", startDate: format(new Date(), "yyyy-MM-dd"), endDate: format(new Date(Date.now() + 365 * 86400000), "yyyy-MM-dd"), amount: String(defaultPrice) });
    setOpen(true);
  };

  const openEdit = (s: any) => {
    setEditing(s);
    setForm({ companyId: String(s.companyId), plan: s.plan, status: s.status, paidStatus: s.paidStatus || "unpaid", startDate: s.startDate ? format(new Date(s.startDate), "yyyy-MM-dd") : "", endDate: s.endDate ? format(new Date(s.endDate), "yyyy-MM-dd") : "", amount: String(s.amount || "") });
    setOpen(true);
  };

  const openPricing = () => {
    const pf: Record<string, string> = {};
    (pricing as any[]).forEach((p: any) => { pf[p.plan] = String(p.price); });
    if (!pf.starter) pf.starter = "1500";
    if (!pf.professional) pf.professional = "3000";
    if (!pf.enterprise) pf.enterprise = "4500";
    setPricingForm(pf);
    setPricingOpen(true);
  };

  const handlePlanChange = (plan: string) => {
    const price = (pricing as any[]).find((p: any) => p.plan === plan)?.price || "";
    setForm(f => ({ ...f, plan, amount: String(price) }));
  };

  const s = summary as any || {};

  return (
    <div className="space-y-5">
      <div className="flex items-center justify-between flex-wrap gap-3">
        <div><h1 className="text-2xl font-bold text-white">Subscriptions</h1><p className="text-slate-400 text-sm">Manage company subscriptions and plans</p></div>
        <div className="flex gap-2">
          <Button variant="outline" className="border-slate-700 text-slate-300 hover:bg-slate-800" onClick={openPricing}><Settings className="w-4 h-4 mr-2" />Pricing</Button>
          <Button className="bg-red-700 hover:bg-red-600" onClick={openCreate}><Plus className="w-4 h-4 mr-2" />Add Subscription</Button>
        </div>
      </div>

      <div className="grid grid-cols-2 md:grid-cols-4 gap-3">
        {[
          { label: "Active", value: s.active ?? 0, cls: "text-emerald-400" },
          { label: "Expired", value: s.expired ?? 0, cls: "text-red-400" },
          { label: "Paid", value: s.paid ?? 0, cls: "text-blue-400" },
          { label: "Revenue", value: s.totalRevenue ? fmt(s.totalRevenue) : "₹0", cls: "text-purple-400" },
        ].map(st => (
          <Card key={st.label} className="bg-slate-900/50 border-slate-800"><CardContent className="pt-4 pb-4">
            <p className="text-xs text-slate-500">{st.label}</p>
            <p className={cn("text-xl font-bold mt-1", st.cls)}>{st.value}</p>
          </CardContent></Card>
        ))}
      </div>

      <Card className="bg-slate-900/50 border-slate-800">
        <Table>
          <TableHeader><TableRow className="border-slate-800">
            <TableHead className="text-slate-400">Company</TableHead>
            <TableHead className="text-slate-400">Plan</TableHead>
            <TableHead className="text-slate-400">Status</TableHead>
            <TableHead className="text-slate-400">Payment</TableHead>
            <TableHead className="text-slate-400">Amount</TableHead>
            <TableHead className="text-slate-400">Invoice #</TableHead>
            <TableHead className="text-slate-400">Expires</TableHead>
            <TableHead className="w-24" />
          </TableRow></TableHeader>
          <TableBody>
            {isLoading ? <TableRow><TableCell colSpan={8} className="text-center py-8 text-slate-500">Loading...</TableCell></TableRow>
              : (subs as any[]).length === 0 ? <TableRow><TableCell colSpan={8} className="text-center py-12 text-slate-500">No subscriptions yet</TableCell></TableRow>
                : (subs as any[]).map((sub: any) => (
                  <TableRow key={sub.id} className="border-slate-800 hover:bg-slate-800/50">
                    <TableCell className="text-white font-medium">{sub.companyName || sub.companyId}</TableCell>
                    <TableCell>
                      <Badge className={cn("capitalize text-xs", sub.plan === "enterprise" ? "bg-purple-900/30 text-purple-400 border-purple-900" : sub.plan === "professional" ? "bg-blue-900/30 text-blue-400 border-blue-900" : "bg-slate-800 text-slate-400 border-slate-700")}>{sub.plan}</Badge>
                    </TableCell>
                    <TableCell>
                      <Badge className={sub.status === "active" ? "bg-emerald-900/30 text-emerald-400 border-emerald-900" : "bg-slate-800 text-slate-400 border-slate-700"}>{sub.status}</Badge>
                    </TableCell>
                    <TableCell>
                      <Badge className={sub.paidStatus === "paid" ? "bg-emerald-900/30 text-emerald-400 border-emerald-900" : "bg-red-900/30 text-red-400 border-red-900"}>
                        {sub.paidStatus === "paid" ? "Paid" : "Unpaid"}
                      </Badge>
                    </TableCell>
                    <TableCell className="text-slate-300">{sub.amount ? fmt(sub.amount) : "—"}</TableCell>
                    <TableCell className="text-slate-400 text-xs font-mono">{sub.invoiceNumber || "—"}</TableCell>
                    <TableCell className="text-slate-500 text-sm">{sub.endDate ? format(new Date(sub.endDate), "dd MMM yyyy") : "—"}</TableCell>
                    <TableCell>
                      <div className="flex items-center gap-1">
                        <Button variant="ghost" size="icon" className="h-7 w-7 text-slate-400 hover:text-white" title="Preview Invoice" onClick={() => setPreviewSub(sub)}>
                          <Eye className="h-3.5 w-3.5" />
                        </Button>
                        {sub.paidStatus !== "paid"
                          ? <Button variant="ghost" size="icon" className="h-7 w-7 text-emerald-400" title="Mark Paid" onClick={() => markPaid.mutate({ id: sub.id, paidStatus: "paid" })}><CheckCircle className="h-3.5 w-3.5" /></Button>
                          : <Button variant="ghost" size="icon" className="h-7 w-7 text-red-400" title="Mark Unpaid" onClick={() => markPaid.mutate({ id: sub.id, paidStatus: "unpaid" })}><XCircle className="h-3.5 w-3.5" /></Button>
                        }
                        <Button variant="ghost" size="icon" className="h-7 w-7 text-slate-400" onClick={() => openEdit(sub)}><Edit className="h-3.5 w-3.5" /></Button>
                      </div>
                    </TableCell>
                  </TableRow>
                ))}
          </TableBody>
        </Table>
      </Card>

      {/* Subscription Invoice Preview */}
      <Dialog open={!!previewSub} onOpenChange={() => setPreviewSub(null)}>
        <DialogContent className="max-w-lg bg-slate-900 border-slate-700 text-white">
          <DialogHeader><DialogTitle className="text-white">Subscription Invoice</DialogTitle></DialogHeader>
          {previewData && (
            <div className="space-y-4">
              <div className="bg-slate-800 rounded-lg p-4 space-y-2">
                <div className="flex justify-between text-sm"><span className="text-slate-400">Invoice #</span><span className="font-mono font-semibold">{previewData.invoiceNumber}</span></div>
                <div className="flex justify-between text-sm"><span className="text-slate-400">Company</span><span>{previewData.company?.name}</span></div>
                <div className="flex justify-between text-sm"><span className="text-slate-400">Plan</span><span className="capitalize font-semibold">{previewData.plan}</span></div>
                <div className="flex justify-between text-sm"><span className="text-slate-400">Period</span><span>{previewData.startDate} → {previewData.endDate}</span></div>
                <div className="flex justify-between text-sm"><span className="text-slate-400">Amount</span><span className="text-lg font-bold text-emerald-400">{fmt(Number(previewData.amount))}</span></div>
                <div className="flex justify-between text-sm"><span className="text-slate-400">Status</span>
                  <Badge className={previewData.paidStatus === "paid" ? "bg-emerald-900/30 text-emerald-400" : "bg-red-900/30 text-red-400"}>{previewData.paidStatus === "paid" ? "Paid" : "Unpaid"}</Badge>
                </div>
              </div>
              <div className="flex gap-2">
                <Button className="flex-1 bg-red-700 hover:bg-red-600" onClick={() => printSubscriptionInvoice(previewData, previewData.company, previewData.settings)}>
                  <Printer className="w-4 h-4 mr-2" />Print / Download PDF
                </Button>
                <Button variant="outline" className="border-slate-700 text-slate-300" onClick={() => setPreviewSub(null)}>Close</Button>
              </div>
            </div>
          )}
        </DialogContent>
      </Dialog>

      {/* Pricing Dialog */}
      <Dialog open={pricingOpen} onOpenChange={setPricingOpen}>
        <DialogContent className="max-w-sm bg-slate-900 border-slate-700 text-white">
          <DialogHeader><DialogTitle className="text-white">Subscription Pricing</DialogTitle></DialogHeader>
          <div className="grid gap-4 py-2">
            {PLANS.map(plan => (
              <div key={plan} className="grid gap-2">
                <Label className="text-slate-300 capitalize">{plan} Plan (₹/month)</Label>
                <Input type="number" value={pricingForm[plan] || ""} onChange={e => setPricingForm(f => ({ ...f, [plan]: e.target.value }))} className="bg-slate-800 border-slate-700 text-white" />
              </div>
            ))}
          </div>
          <DialogFooter>
            <Button variant="outline" className="border-slate-700 text-slate-300" onClick={() => setPricingOpen(false)}>Cancel</Button>
            <Button className="bg-red-700 hover:bg-red-600" onClick={() => savePricing.mutate(pricingForm)} disabled={savePricing.isPending}>Save Pricing</Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      {/* Create/Edit Dialog */}
      <Dialog open={open} onOpenChange={setOpen}>
        <DialogContent className="max-w-md bg-slate-900 border-slate-700 text-white">
          <DialogHeader><DialogTitle className="text-white">{editing ? "Edit Subscription" : "Add Subscription"}</DialogTitle></DialogHeader>
          <div className="grid gap-4 py-2">
            {!editing && <div className="grid gap-2"><Label className="text-slate-300">Company *</Label>
              <Select value={form.companyId} onValueChange={v => setForm(f => ({ ...f, companyId: v }))}><SelectTrigger className="bg-slate-800 border-slate-700 text-white"><SelectValue placeholder="Select company" /></SelectTrigger>
                <SelectContent className="bg-slate-800 border-slate-700">{(companies as any[]).map((c: any) => <SelectItem key={c.id} value={String(c.id)} className="text-white">{c.name} ({c.code})</SelectItem>)}</SelectContent></Select>
            </div>}
            <div className="grid grid-cols-2 gap-3">
              <div className="grid gap-2"><Label className="text-slate-300">Plan</Label>
                <Select value={form.plan} onValueChange={handlePlanChange}><SelectTrigger className="bg-slate-800 border-slate-700 text-white"><SelectValue /></SelectTrigger>
                  <SelectContent className="bg-slate-800 border-slate-700">{PLANS.map(p => <SelectItem key={p} value={p} className="text-white capitalize">{p}</SelectItem>)}</SelectContent></Select>
              </div>
              <div className="grid gap-2"><Label className="text-slate-300">Status</Label>
                <Select value={form.status} onValueChange={v => setForm(f => ({ ...f, status: v }))}><SelectTrigger className="bg-slate-800 border-slate-700 text-white"><SelectValue /></SelectTrigger>
                  <SelectContent className="bg-slate-800 border-slate-700"><SelectItem value="active" className="text-white">Active</SelectItem><SelectItem value="expired" className="text-white">Expired</SelectItem><SelectItem value="suspended" className="text-white">Suspended</SelectItem></SelectContent></Select>
              </div>
            </div>
            <div className="grid gap-2"><Label className="text-slate-300">Payment Status</Label>
              <Select value={form.paidStatus} onValueChange={v => setForm(f => ({ ...f, paidStatus: v }))}><SelectTrigger className="bg-slate-800 border-slate-700 text-white"><SelectValue /></SelectTrigger>
                <SelectContent className="bg-slate-800 border-slate-700"><SelectItem value="unpaid" className="text-white">Unpaid</SelectItem><SelectItem value="paid" className="text-white">Paid</SelectItem></SelectContent></Select>
            </div>
            <div className="grid grid-cols-2 gap-3">
              <div className="grid gap-2"><Label className="text-slate-300">Start Date</Label><Input type="date" value={form.startDate} onChange={e => setForm(f => ({ ...f, startDate: e.target.value }))} className="bg-slate-800 border-slate-700 text-white" /></div>
              <div className="grid gap-2"><Label className="text-slate-300">End Date</Label><Input type="date" value={form.endDate} onChange={e => setForm(f => ({ ...f, endDate: e.target.value }))} className="bg-slate-800 border-slate-700 text-white" /></div>
            </div>
            <div className="grid gap-2"><Label className="text-slate-300">Amount (₹)</Label><Input type="number" value={form.amount} onChange={e => setForm(f => ({ ...f, amount: e.target.value }))} placeholder="0" className="bg-slate-800 border-slate-700 text-white" /></div>
          </div>
          <DialogFooter>
            <Button variant="outline" className="border-slate-700 text-slate-300" onClick={() => setOpen(false)}>Cancel</Button>
            <Button className="bg-red-700 hover:bg-red-600" onClick={() => save.mutate({ companyId: Number(form.companyId), plan: form.plan, status: form.status, paidStatus: form.paidStatus, startDate: form.startDate, endDate: form.endDate, amount: parseFloat(form.amount || "0") || undefined })} disabled={save.isPending}>{editing ? "Update" : "Create"} Subscription</Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </div>
  );
}
