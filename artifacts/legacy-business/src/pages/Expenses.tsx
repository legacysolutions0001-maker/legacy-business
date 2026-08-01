import { useState } from "react";
import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { apiFetch } from "../lib/auth";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Plus, Receipt, Search } from "lucide-react";
import { format } from "date-fns";
import { Input } from "@/components/ui/input";
import { PieChart, Pie, Cell, ResponsiveContainer, Tooltip, Legend } from "recharts";
import { Dialog, DialogContent, DialogDescription, DialogFooter, DialogHeader, DialogTitle, DialogTrigger } from "@/components/ui/dialog";
import { Label } from "@/components/ui/label";
import { useToast } from "@/hooks/use-toast";

const COLORS = ["hsl(var(--chart-1))", "hsl(var(--chart-2))", "hsl(var(--chart-3))", "hsl(var(--chart-4))", "hsl(var(--chart-5))"];

export default function Expenses() {
  const [searchTerm, setSearchTerm] = useState("");
  const qc = useQueryClient();
  const { toast } = useToast();

  const { data: expenses = [], isLoading } = useQuery({
    queryKey: ["expenses"],
    queryFn: () => apiFetch("/expenses").then(r => r.json()),
  });

  const { data: categoryData = [], isLoading: isCategoryLoading } = useQuery({
    queryKey: ["expenses-by-category"],
    queryFn: () => apiFetch("/expenses/by-category").then(r => r.json()),
  });

  const [open, setOpen] = useState(false);
  const [form, setForm] = useState({ title: "", amount: "", category: "general", date: format(new Date(), "yyyy-MM-dd") });

  const createExpense = useMutation({
    mutationFn: async (data: any) => {
      const r = await apiFetch("/expenses", { method: "POST", body: JSON.stringify(data) });
      if (!r.ok) { const e = await r.json().catch(() => ({})); throw new Error(e.error || "Failed"); }
      return r.json();
    },
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: ["expenses"] });
      qc.invalidateQueries({ queryKey: ["expenses-by-category"] });
      setOpen(false);
      setForm({ title: "", amount: "", category: "general", date: format(new Date(), "yyyy-MM-dd") });
      toast({ title: "Expense logged successfully" });
    },
    onError: (e: any) => toast({ title: "Failed to log expense", description: e.message, variant: "destructive" }),
  });

  const handleCreate = () => {
    createExpense.mutate({
      title: form.title,
      amount: parseFloat(form.amount) || 0,
      category: form.category,
      date: new Date(form.date).toISOString(),
    });
  };

  const filtered = (expenses as any[]).filter((e: any) =>
    (e.title || "").toLowerCase().includes(searchTerm.toLowerCase()) ||
    (e.category || "").toLowerCase().includes(searchTerm.toLowerCase())
  );

  const totalAmount = (expenses as any[]).reduce((s: number, e: any) => s + Number(e.amount || 0), 0);

  return (
    <div className="space-y-6 h-full flex flex-col">
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-3xl font-bold tracking-tight">Expenses</h1>
          <p className="text-muted-foreground">Track company spending and overhead.</p>
        </div>

        <Dialog open={open} onOpenChange={setOpen}>
          <DialogTrigger asChild>
            <Button><Plus className="w-4 h-4 mr-2" />Log Expense</Button>
          </DialogTrigger>
          <DialogContent>
            <DialogHeader>
              <DialogTitle>Log New Expense</DialogTitle>
              <DialogDescription>Record a new business expense.</DialogDescription>
            </DialogHeader>
            <div className="grid gap-4 py-4">
              <div className="grid gap-2">
                <Label>Description</Label>
                <Input value={form.title} onChange={e => setForm({ ...form, title: e.target.value })} placeholder="e.g. Office Supplies" />
              </div>
              <div className="grid grid-cols-2 gap-4">
                <div className="grid gap-2">
                  <Label>Amount (₹)</Label>
                  <Input type="number" step="0.01" value={form.amount} onChange={e => setForm({ ...form, amount: e.target.value })} placeholder="0.00" />
                </div>
                <div className="grid gap-2">
                  <Label>Date</Label>
                  <Input type="date" value={form.date} onChange={e => setForm({ ...form, date: e.target.value })} />
                </div>
              </div>
              <div className="grid gap-2">
                <Label>Category</Label>
                <Input value={form.category} onChange={e => setForm({ ...form, category: e.target.value })} placeholder="e.g. software, travel, office..." />
              </div>
            </div>
            <DialogFooter>
              <Button variant="outline" onClick={() => setOpen(false)}>Cancel</Button>
              <Button onClick={handleCreate} disabled={createExpense.isPending || !form.title || !form.amount}>
                {createExpense.isPending ? "Saving…" : "Save Expense"}
              </Button>
            </DialogFooter>
          </DialogContent>
        </Dialog>
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
        <Card className="lg:col-span-1">
          <CardHeader>
            <CardTitle className="text-base">Spending by Category</CardTitle>
          </CardHeader>
          <CardContent>
            {isCategoryLoading ? (
              <div className="h-[250px] flex items-center justify-center bg-muted/20 animate-pulse rounded-lg">
                <span className="text-sm text-muted-foreground">Loading chart...</span>
              </div>
            ) : (categoryData as any[]).length === 0 ? (
              <div className="h-[250px] flex items-center justify-center text-muted-foreground text-sm">No expense data yet</div>
            ) : (
              <div className="h-[250px]">
                <ResponsiveContainer width="100%" height="100%">
                  <PieChart>
                    <Pie data={categoryData as any[]} cx="50%" cy="50%" innerRadius={60} outerRadius={80} paddingAngle={5} dataKey="total" nameKey="category">
                      {(categoryData as any[]).map((_: any, index: number) => (
                        <Cell key={`cell-${index}`} fill={COLORS[index % COLORS.length]} />
                      ))}
                    </Pie>
                    <Tooltip formatter={(value: any) => `₹${Number(value).toLocaleString("en-IN")}`} contentStyle={{ borderRadius: "8px", border: "1px solid hsl(var(--border))", background: "hsl(var(--card))" }} />
                    <Legend />
                  </PieChart>
                </ResponsiveContainer>
              </div>
            )}
            <div className="mt-3 pt-3 border-t text-center">
              <p className="text-xs text-muted-foreground">Total spent</p>
              <p className="text-xl font-bold">₹{totalAmount.toLocaleString("en-IN")}</p>
            </div>
          </CardContent>
        </Card>

        <div className="lg:col-span-2 flex flex-col gap-4">
          <div className="flex items-center gap-2">
            <div className="relative flex-1 max-w-sm">
              <Search className="absolute left-2.5 top-2.5 h-4 w-4 text-muted-foreground" />
              <Input placeholder="Search expenses..." className="pl-9" value={searchTerm} onChange={(e) => setSearchTerm(e.target.value)} />
            </div>
          </div>

          <Card className="flex-1">
            <Table>
              <TableHeader>
                <TableRow>
                  <TableHead>Date</TableHead>
                  <TableHead>Description</TableHead>
                  <TableHead>Category</TableHead>
                  <TableHead>Vendor</TableHead>
                  <TableHead className="text-right">Amount</TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                {isLoading ? (
                  <TableRow><TableCell colSpan={5} className="text-center py-8">Loading expenses...</TableCell></TableRow>
                ) : filtered.length === 0 ? (
                  <TableRow>
                    <TableCell colSpan={5} className="text-center py-12">
                      <div className="flex flex-col items-center justify-center text-muted-foreground">
                        <Receipt className="h-8 w-8 mb-2 opacity-50" />
                        <p>{searchTerm ? "No matching expenses" : "No expenses yet"}</p>
                      </div>
                    </TableCell>
                  </TableRow>
                ) : filtered.map((expense: any) => (
                  <TableRow key={expense.id} className="hover:bg-muted/50 cursor-pointer">
                    <TableCell className="text-muted-foreground whitespace-nowrap">
                      {expense.date ? format(new Date(expense.date), "MMM d, yyyy") : "—"}
                    </TableCell>
                    <TableCell className="font-medium">{expense.title}</TableCell>
                    <TableCell>
                      <span className="inline-flex items-center px-2 py-1 rounded-full text-[10px] uppercase font-bold tracking-wider bg-muted text-muted-foreground">
                        {expense.category}
                      </span>
                    </TableCell>
                    <TableCell className="text-muted-foreground">{expense.vendor || "—"}</TableCell>
                    <TableCell className="text-right font-medium">₹{Number(expense.amount || 0).toLocaleString("en-IN")}</TableCell>
                  </TableRow>
                ))}
              </TableBody>
            </Table>
          </Card>
        </div>
      </div>
    </div>
  );
}
