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
import { Plus, BookOpen, Fuel, Coffee, Truck, Users, Layers, Edit, Trash2, FileDown, Calendar } from "lucide-react";
import { useToast } from "@/hooks/use-toast";
import { format } from "date-fns";
import { exportToExcel } from "../lib/excel";
import { cn } from "@/lib/utils";

const fmt = (n: number) => `₹${new Intl.NumberFormat("en-IN", { maximumFractionDigits: 0 }).format(n)}`;
const today = () => format(new Date(), "yyyy-MM-dd");

const CATEGORIES = [
  { value: "petrol", label: "Petrol / Fuel", icon: Fuel, color: "text-orange-400 bg-orange-500/10" },
  { value: "tea", label: "Tea / Refreshments", icon: Coffee, color: "text-yellow-400 bg-yellow-500/10" },
  { value: "delivery", label: "Delivery / Courier", icon: Truck, color: "text-blue-400 bg-blue-500/10" },
  { value: "labour", label: "Labour / Wages", icon: Users, color: "text-purple-400 bg-purple-500/10" },
  { value: "miscellaneous", label: "Miscellaneous", icon: Layers, color: "text-slate-400 bg-slate-500/10" },
];

const EMPTY = { date: today(), category: "petrol", description: "", amount: "", notes: "" };

function getCategoryMeta(cat: string) {
  return CATEGORIES.find(c => c.value === cat) || CATEGORIES[4];
}

export default function DayBook() {
  const qc = useQueryClient();
  const { toast } = useToast();
  const [open, setOpen] = useState(false);
  const [editing, setEditing] = useState<any>(null);
  const [form, setForm] = useState({ ...EMPTY });
  const [filterDate, setFilterDate] = useState(today());
  const [filterCat, setFilterCat] = useState("all");

  const params = new URLSearchParams();
  if (filterDate) { params.append("from", filterDate); params.append("to", filterDate); }
  if (filterCat !== "all") params.append("category", filterCat);

  const { data: entries = [], isLoading } = useQuery({
    queryKey: ["daybook", filterDate, filterCat],
    queryFn: () => apiFetch(`/daybook?${params}`).then(r => r.json()),
  });

  const { data: summary } = useQuery({
    queryKey: ["daybook-summary"],
    queryFn: () => apiFetch("/daybook/summary").then(r => r.json()),
  });

  const save = useMutation({
    mutationFn: (d: any) => editing
      ? apiFetch(`/daybook/${editing.id}`, { method: "PATCH", body: JSON.stringify(d) }).then(r => r.json())
      : apiFetch("/daybook", { method: "POST", body: JSON.stringify(d) }).then(r => r.json()),
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: ["daybook"] });
      qc.invalidateQueries({ queryKey: ["daybook-summary"] });
      setOpen(false);
      toast({ title: editing ? "Entry updated" : "Expense recorded" });
    },
    onError: () => toast({ title: "Failed", variant: "destructive" }),
  });

  const del = useMutation({
    mutationFn: (id: number) => apiFetch(`/daybook/${id}`, { method: "DELETE" }),
    onSuccess: () => { qc.invalidateQueries({ queryKey: ["daybook"] }); qc.invalidateQueries({ queryKey: ["daybook-summary"] }); toast({ title: "Entry deleted" }); },
    onError: () => toast({ title: "Failed", variant: "destructive" }),
  });

  const openCreate = () => { setEditing(null); setForm({ ...EMPTY, date: filterDate || today() }); setOpen(true); };
  const openEdit = (e: any) => {
    setEditing(e);
    setForm({ date: e.date, category: e.category, description: e.description || "", amount: String(e.amount), notes: e.notes || "" });
    setOpen(true);
  };

  const handleSave = () => {
    if (!form.amount || !form.date) { toast({ title: "Date and amount required", variant: "destructive" }); return; }
    save.mutate({ ...form, amount: parseFloat(form.amount) });
  };

  const handleExport = () => {
    const rows = (entries as any[]).map((e: any) => ({
      "Date": e.date,
      "Category": getCategoryMeta(e.category).label,
      "Description": e.description || "",
      "Amount (₹)": Number(e.amount),
      "Notes": e.notes || "",
    }));
    exportToExcel(rows, `DayBook_${filterDate || format(new Date(), "yyyy-MM-dd")}`, "Day Book");
  };

  const s = summary as any || {};
  const dayTotal = (entries as any[]).reduce((acc: number, e: any) => acc + Number(e.amount || 0), 0);

  const catBreakdown = CATEGORIES.map(cat => ({
    ...cat,
    total: (entries as any[]).filter((e: any) => e.category === cat.value).reduce((a: number, e: any) => a + Number(e.amount || 0), 0),
  }));

  return (
    <div className="space-y-5">
      <div className="flex items-center justify-between flex-wrap gap-3">
        <div><h1 className="text-2xl font-bold">Day Book</h1><p className="text-muted-foreground text-sm">Track daily petty cash & operational expenses</p></div>
        <div className="flex gap-2">
          <Button variant="outline" size="sm" onClick={handleExport}><FileDown className="w-4 h-4 mr-1" />Export</Button>
          <Button onClick={openCreate}><Plus className="w-4 h-4 mr-2" />Add Expense</Button>
        </div>
      </div>

      {/* Summary Cards */}
      <div className="grid grid-cols-3 gap-3">
        {[
          { label: "Today", value: s.daily ?? 0, cls: "text-emerald-400" },
          { label: "This Month", value: s.monthly ?? 0, cls: "text-blue-400" },
          { label: "This Year", value: s.yearly ?? 0, cls: "text-purple-400" },
        ].map(st => (
          <Card key={st.label} className="bg-card/50">
            <CardContent className="pt-4 pb-4">
              <p className="text-xs text-muted-foreground">{st.label}</p>
              <p className={cn("text-xl font-bold mt-1", st.cls)}>{fmt(st.value)}</p>
            </CardContent>
          </Card>
        ))}
      </div>

      {/* Category breakdown */}
      <div className="grid grid-cols-2 md:grid-cols-5 gap-3">
        {catBreakdown.map(cat => {
          const Icon = cat.icon;
          return (
            <Card key={cat.value} className={cn("bg-card/50 cursor-pointer border-2 transition-all", filterCat === cat.value ? "border-primary" : "border-transparent hover:border-muted")}
              onClick={() => setFilterCat(filterCat === cat.value ? "all" : cat.value)}>
              <CardContent className="pt-3 pb-3 flex items-center gap-2">
                <div className={cn("p-2 rounded-lg", cat.color.split(" ")[1])}><Icon className={cn("w-4 h-4", cat.color.split(" ")[0])} /></div>
                <div>
                  <p className="text-xs text-muted-foreground leading-tight">{cat.label.split(" / ")[0]}</p>
                  <p className="text-sm font-bold">{fmt(cat.total)}</p>
                </div>
              </CardContent>
            </Card>
          );
        })}
      </div>

      {/* Filters */}
      <div className="flex items-center gap-3 flex-wrap">
        <div className="flex items-center gap-2">
          <Calendar className="w-4 h-4 text-muted-foreground" />
          <Input type="date" value={filterDate} onChange={e => setFilterDate(e.target.value)} className="h-9 w-40 text-sm" />
          {filterDate && <Button size="sm" variant="ghost" onClick={() => setFilterDate("")} className="text-xs">All dates</Button>}
        </div>
        {filterCat !== "all" && (
          <Badge variant="secondary" className="cursor-pointer" onClick={() => setFilterCat("all")}>
            {getCategoryMeta(filterCat).label} ×
          </Badge>
        )}
        {dayTotal > 0 && <div className="ml-auto text-sm font-semibold">Day Total: <span className="text-red-400">{fmt(dayTotal)}</span></div>}
      </div>

      <Card>
        <Table>
          <TableHeader>
            <TableRow>
              <TableHead>Date</TableHead>
              <TableHead>Category</TableHead>
              <TableHead>Description</TableHead>
              <TableHead className="text-right">Amount</TableHead>
              <TableHead>Notes</TableHead>
              <TableHead className="w-16" />
            </TableRow>
          </TableHeader>
          <TableBody>
            {isLoading ? (
              <TableRow><TableCell colSpan={6} className="text-center py-8 text-muted-foreground">Loading...</TableCell></TableRow>
            ) : (entries as any[]).length === 0 ? (
              <TableRow><TableCell colSpan={6} className="text-center py-12">
                <div className="flex flex-col items-center text-muted-foreground">
                  <BookOpen className="w-10 h-10 mb-2 opacity-30" /><p>No expenses recorded</p>
                  <Button variant="outline" size="sm" className="mt-3" onClick={openCreate}><Plus className="w-4 h-4 mr-1" />Add first entry</Button>
                </div>
              </TableCell></TableRow>
            ) : (entries as any[]).map((e: any) => {
              const cat = getCategoryMeta(e.category);
              const Icon = cat.icon;
              return (
                <TableRow key={e.id} className="hover:bg-muted/40">
                  <TableCell className="text-sm text-muted-foreground">{e.date}</TableCell>
                  <TableCell>
                    <div className="flex items-center gap-2">
                      <div className={cn("p-1.5 rounded", cat.color.split(" ")[1])}><Icon className={cn("w-3.5 h-3.5", cat.color.split(" ")[0])} /></div>
                      <span className="text-sm">{cat.label}</span>
                    </div>
                  </TableCell>
                  <TableCell className="text-sm">{e.description || <span className="text-muted-foreground italic">—</span>}</TableCell>
                  <TableCell className="text-right font-semibold text-red-400">{fmt(Number(e.amount))}</TableCell>
                  <TableCell className="text-xs text-muted-foreground">{e.notes || "—"}</TableCell>
                  <TableCell>
                    <div className="flex gap-1">
                      <Button variant="ghost" size="icon" className="h-7 w-7" onClick={() => openEdit(e)}><Edit className="h-3.5 w-3.5" /></Button>
                      <Button variant="ghost" size="icon" className="h-7 w-7 text-destructive" onClick={() => del.mutate(e.id)}><Trash2 className="h-3.5 w-3.5" /></Button>
                    </div>
                  </TableCell>
                </TableRow>
              );
            })}
          </TableBody>
        </Table>
      </Card>

      <Dialog open={open} onOpenChange={setOpen}>
        <DialogContent className="max-w-md">
          <DialogHeader><DialogTitle>{editing ? "Edit Entry" : "Add Expense"}</DialogTitle></DialogHeader>
          <div className="grid gap-4 py-2">
            <div className="grid grid-cols-2 gap-3">
              <div className="grid gap-2"><Label>Date *</Label><Input type="date" value={form.date} onChange={e => setForm(f => ({ ...f, date: e.target.value }))} /></div>
              <div className="grid gap-2"><Label>Amount (₹) *</Label><Input type="number" min="0" step="0.01" value={form.amount} onChange={e => setForm(f => ({ ...f, amount: e.target.value }))} placeholder="0.00" /></div>
            </div>
            <div className="grid gap-2"><Label>Category</Label>
              <Select value={form.category} onValueChange={v => setForm(f => ({ ...f, category: v }))}>
                <SelectTrigger><SelectValue /></SelectTrigger>
                <SelectContent>
                  {CATEGORIES.map(c => {
                    const Icon = c.icon;
                    return (
                      <SelectItem key={c.value} value={c.value}>
                        <div className="flex items-center gap-2"><Icon className="w-4 h-4" />{c.label}</div>
                      </SelectItem>
                    );
                  })}
                </SelectContent>
              </Select>
            </div>
            <div className="grid gap-2"><Label>Description</Label><Input value={form.description} onChange={e => setForm(f => ({ ...f, description: e.target.value }))} placeholder="What was this expense for?" /></div>
            <div className="grid gap-2"><Label>Notes</Label><Input value={form.notes} onChange={e => setForm(f => ({ ...f, notes: e.target.value }))} placeholder="Optional notes" /></div>
          </div>
          <DialogFooter>
            <Button variant="outline" onClick={() => setOpen(false)}>Cancel</Button>
            <Button onClick={handleSave} disabled={save.isPending}>{editing ? "Update" : "Save"} Entry</Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </div>
  );
}
