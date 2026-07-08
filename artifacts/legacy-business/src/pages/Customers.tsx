import { useState } from "react";
import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { apiFetch } from "../lib/auth";
import { Card } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogFooter } from "@/components/ui/dialog";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";
import { DropdownMenu, DropdownMenuContent, DropdownMenuItem, DropdownMenuTrigger } from "@/components/ui/dropdown-menu";
import { Plus, Search, Users, MoreHorizontal, Edit, Trash2, FileDown, MessageCircle } from "lucide-react";
import { exportCustomers } from "../lib/excel";
import { useToast } from "@/hooks/use-toast";

const EMPTY = { name: "", mobile: "", whatsappNumber: "", email: "", aadhaarNumber: "", address: "", city: "", state: "", pincode: "" };
const fmt = (n: number) => `₹${new Intl.NumberFormat("en-IN", { maximumFractionDigits: 0 }).format(n)}`;

export default function Customers() {
  const qc = useQueryClient();
  const { toast } = useToast();
  const [search, setSearch] = useState("");
  const [open, setOpen] = useState(false);
  const [editing, setEditing] = useState<any>(null);
  const [form, setForm] = useState(EMPTY);

  const { data: customers = [], isLoading } = useQuery({
    queryKey: ["customers", search],
    queryFn: () => apiFetch(`/customers${search ? `?search=${encodeURIComponent(search)}` : ""}`).then(r => r.json()),
  });

  const create = useMutation({
    mutationFn: (data: any) => apiFetch("/customers", { method: "POST", body: JSON.stringify(data) }).then(r => r.json()),
    onSuccess: () => { qc.invalidateQueries({ queryKey: ["customers"] }); setOpen(false); toast({ title: "Customer added" }); },
    onError: () => toast({ title: "Failed", variant: "destructive" }),
  });

  const update = useMutation({
    mutationFn: ({ id, ...data }: any) => apiFetch(`/customers/${id}`, { method: "PATCH", body: JSON.stringify(data) }).then(r => r.json()),
    onSuccess: () => { qc.invalidateQueries({ queryKey: ["customers"] }); setOpen(false); toast({ title: "Customer updated" }); },
    onError: () => toast({ title: "Failed", variant: "destructive" }),
  });

  const del = useMutation({
    mutationFn: (id: number) => apiFetch(`/customers/${id}`, { method: "DELETE" }),
    onSuccess: () => { qc.invalidateQueries({ queryKey: ["customers"] }); toast({ title: "Customer deleted" }); },
    onError: () => toast({ title: "Failed", variant: "destructive" }),
  });

  const openCreate = () => { setEditing(null); setForm(EMPTY); setOpen(true); };
  const openEdit = (c: any) => {
    setEditing(c);
    setForm({
      name: c.name, mobile: c.mobile || "", whatsappNumber: c.whatsappNumber || "",
      email: c.email || "", aadhaarNumber: c.aadhaarNumber || "",
      address: c.address || "", city: c.city || "", state: c.state || "", pincode: c.pincode || ""
    });
    setOpen(true);
  };

  const handleSave = () => {
    if (!form.name) { toast({ title: "Name required", variant: "destructive" }); return; }
    if (editing) update.mutate({ id: editing.id, ...form });
    else create.mutate(form);
  };

  const setF = (k: keyof typeof EMPTY) => (e: React.ChangeEvent<HTMLInputElement>) => setForm(f => ({ ...f, [k]: e.target.value }));

  return (
    <div className="space-y-5">
      <div className="flex items-center justify-between">
        <div><h1 className="text-2xl font-bold">Customers</h1><p className="text-muted-foreground text-sm">Manage your customer accounts</p></div>
        <div className="flex gap-2">
          <Button variant="outline" size="sm" onClick={() => exportCustomers(customers as any[])}><FileDown className="w-4 h-4 mr-1" />Export</Button>
          <Button onClick={openCreate}><Plus className="w-4 h-4 mr-2" />Add Customer</Button>
        </div>
      </div>

      <div className="flex gap-3">
        <div className="relative flex-1 max-w-sm">
          <Search className="absolute left-2.5 top-2.5 h-4 w-4 text-muted-foreground" />
          <Input placeholder="Search customers..." className="pl-9" value={search} onChange={e => setSearch(e.target.value)} />
        </div>
        <div className="flex items-center gap-2 px-3 py-2 bg-card rounded-lg border text-sm">
          <Users className="w-4 h-4 text-muted-foreground" />
          <span className="font-medium">{(customers as any[]).length}</span>
          <span className="text-muted-foreground">total</span>
        </div>
      </div>

      <Card>
        <Table>
          <TableHeader>
            <TableRow>
              <TableHead>Name</TableHead>
              <TableHead>Mobile</TableHead>
              <TableHead>WhatsApp</TableHead>
              <TableHead>Email</TableHead>
              <TableHead>Aadhaar</TableHead>
              <TableHead>Address</TableHead>
              <TableHead className="text-right">Revenue</TableHead>
              <TableHead className="text-right">Dues</TableHead>
              <TableHead className="w-10" />
            </TableRow>
          </TableHeader>
          <TableBody>
            {isLoading ? (
              <TableRow><TableCell colSpan={9} className="text-center py-8 text-muted-foreground">Loading...</TableCell></TableRow>
            ) : (customers as any[]).length === 0 ? (
              <TableRow><TableCell colSpan={9} className="text-center py-12">
                <div className="flex flex-col items-center text-muted-foreground">
                  <Users className="w-10 h-10 mb-2 opacity-30" /><p>No customers yet</p>
                  <Button variant="outline" size="sm" className="mt-3" onClick={openCreate}><Plus className="w-4 h-4 mr-1" />Add first customer</Button>
                </div>
              </TableCell></TableRow>
            ) : (customers as any[]).map((c: any) => (
              <TableRow key={c.id} className="hover:bg-muted/40">
                <TableCell className="font-medium">{c.name}</TableCell>
                <TableCell className="text-muted-foreground text-sm">{c.mobile || "—"}</TableCell>
                <TableCell className="text-sm">
                  {c.whatsappNumber ? (
                    <a
                      href={`https://wa.me/${c.whatsappNumber.replace(/[^0-9]/g, "")}`}
                      target="_blank"
                      rel="noopener noreferrer"
                      className="flex items-center gap-1.5 text-green-500 hover:text-green-400 transition-colors"
                    >
                      <MessageCircle className="w-3.5 h-3.5 flex-shrink-0" />
                      <span>{c.whatsappNumber}</span>
                    </a>
                  ) : <span className="text-muted-foreground">—</span>}
                </TableCell>
                <TableCell className="text-muted-foreground text-sm">{c.email || "—"}</TableCell>
                <TableCell className="text-muted-foreground text-sm font-mono">{c.aadhaarNumber ? `XXXX-XXXX-${c.aadhaarNumber.slice(-4)}` : "—"}</TableCell>
                <TableCell className="text-muted-foreground text-sm">{[c.address, c.city, c.state].filter(Boolean).join(", ") || "—"}</TableCell>
                <TableCell className="text-right text-sm text-emerald-500 font-medium">{fmt(Number(c.totalRevenue || 0))}</TableCell>
                <TableCell className="text-right text-sm text-red-400 font-medium">{fmt(Number(c.pendingDues || 0))}</TableCell>
                <TableCell>
                  <DropdownMenu>
                    <DropdownMenuTrigger asChild><Button variant="ghost" size="icon" className="h-8 w-8"><MoreHorizontal className="h-4 w-4" /></Button></DropdownMenuTrigger>
                    <DropdownMenuContent align="end">
                      <DropdownMenuItem onClick={() => openEdit(c)}><Edit className="h-4 w-4 mr-2" />Edit</DropdownMenuItem>
                      {c.whatsappNumber && (
                        <DropdownMenuItem asChild>
                          <a href={`https://wa.me/${c.whatsappNumber.replace(/[^0-9]/g, "")}`} target="_blank" rel="noopener noreferrer" className="flex items-center">
                            <MessageCircle className="h-4 w-4 mr-2 text-green-500" />WhatsApp
                          </a>
                        </DropdownMenuItem>
                      )}
                      <DropdownMenuItem className="text-destructive" onClick={() => del.mutate(c.id)}><Trash2 className="h-4 w-4 mr-2" />Delete</DropdownMenuItem>
                    </DropdownMenuContent>
                  </DropdownMenu>
                </TableCell>
              </TableRow>
            ))}
          </TableBody>
        </Table>
      </Card>

      <Dialog open={open} onOpenChange={setOpen}>
        <DialogContent className="max-w-lg">
          <DialogHeader><DialogTitle>{editing ? "Edit Customer" : "Add Customer"}</DialogTitle></DialogHeader>
          <div className="grid gap-4 py-2">
            <div className="grid gap-2"><Label>Name *</Label><Input value={form.name} onChange={setF("name")} placeholder="Customer name" /></div>
            <div className="grid grid-cols-2 gap-3">
              <div className="grid gap-2"><Label>Mobile</Label><Input value={form.mobile} onChange={setF("mobile")} placeholder="Mobile number" /></div>
              <div className="grid gap-2">
                <Label className="flex items-center gap-1.5"><MessageCircle className="w-3.5 h-3.5 text-green-500" />WhatsApp Number</Label>
                <Input value={form.whatsappNumber} onChange={setF("whatsappNumber")} placeholder="919876543210" />
                <p className="text-xs text-muted-foreground">Country code + number (e.g. 91 for India)</p>
              </div>
            </div>
            <div className="grid gap-2"><Label>Email</Label><Input type="email" value={form.email} onChange={setF("email")} placeholder="email@example.com" /></div>
            <div className="grid gap-2">
              <Label>Aadhaar Number <span className="text-muted-foreground text-xs">(Optional)</span></Label>
              <Input value={form.aadhaarNumber} onChange={setF("aadhaarNumber")} placeholder="XXXX XXXX XXXX" maxLength={14} />
            </div>
            <div className="grid gap-2"><Label>Address</Label><Input value={form.address} onChange={setF("address")} placeholder="Street address" /></div>
            <div className="grid grid-cols-3 gap-3">
              <div className="grid gap-2"><Label>City</Label><Input value={form.city} onChange={setF("city")} placeholder="City" /></div>
              <div className="grid gap-2"><Label>State</Label><Input value={form.state} onChange={setF("state")} placeholder="State" /></div>
              <div className="grid gap-2"><Label>Pincode</Label><Input value={form.pincode} onChange={setF("pincode")} placeholder="Pincode" /></div>
            </div>
          </div>
          <DialogFooter>
            <Button variant="outline" onClick={() => setOpen(false)}>Cancel</Button>
            <Button onClick={handleSave} disabled={create.isPending || update.isPending}>{editing ? "Update" : "Add"} Customer</Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </div>
  );
}
