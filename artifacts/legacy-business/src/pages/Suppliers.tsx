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
import { Plus, Search, Truck, MoreHorizontal, Edit, Trash2, FileDown } from "lucide-react";
import { exportSuppliers } from "../lib/excel";
import { useToast } from "@/hooks/use-toast";

const EMPTY = { name: "", gstNumber: "", panNumber: "", address: "", city: "", state: "", phone: "", email: "", contactPerson: "", notes: "" };

export default function Suppliers() {
  const qc = useQueryClient();
  const { toast } = useToast();
  const [search, setSearch] = useState("");
  const [open, setOpen] = useState(false);
  const [editing, setEditing] = useState<any>(null);
  const [form, setForm] = useState(EMPTY);

  const { data: suppliers = [], isLoading } = useQuery({
    queryKey: ["suppliers", search],
    queryFn: () => apiFetch(`/suppliers${search ? `?search=${encodeURIComponent(search)}` : ""}`).then(r => r.json()),
  });

  const save = useMutation({
    mutationFn: (d: any) => editing
      ? apiFetch(`/suppliers/${editing.id}`, { method: "PATCH", body: JSON.stringify(d) }).then(r => r.json())
      : apiFetch("/suppliers", { method: "POST", body: JSON.stringify(d) }).then(r => r.json()),
    onSuccess: () => { qc.invalidateQueries({ queryKey: ["suppliers"] }); setOpen(false); toast({ title: editing ? "Supplier updated" : "Supplier added" }); },
    onError: () => toast({ title: "Failed", variant: "destructive" }),
  });

  const del = useMutation({
    mutationFn: (id: number) => apiFetch(`/suppliers/${id}`, { method: "DELETE" }),
    onSuccess: () => { qc.invalidateQueries({ queryKey: ["suppliers"] }); toast({ title: "Supplier deleted" }); },
  });

  const openCreate = () => { setEditing(null); setForm(EMPTY); setOpen(true); };
  const openEdit = (s: any) => { setEditing(s); setForm({ name: s.name, gstNumber: s.gstNumber || "", panNumber: s.panNumber || "", address: s.address || "", city: s.city || "", state: s.state || "", phone: s.phone || "", email: s.email || "", contactPerson: s.contactPerson || "", notes: s.notes || "" }); setOpen(true); };
  const setF = (k: keyof typeof EMPTY) => (e: React.ChangeEvent<HTMLInputElement>) => setForm(f => ({ ...f, [k]: e.target.value }));

  return (
    <div className="space-y-5">
      <div className="flex items-center justify-between">
        <div><h1 className="text-2xl font-bold">Suppliers</h1><p className="text-muted-foreground text-sm">Manage your suppliers and vendors</p></div>
        <div className="flex gap-2">
          <Button variant="outline" size="sm" onClick={()=>exportSuppliers(suppliers as any[])}><FileDown className="w-4 h-4 mr-1"/>Export</Button>
          <Button onClick={openCreate}><Plus className="w-4 h-4 mr-2" />Add Supplier</Button>
        </div>
      </div>
      <div className="relative max-w-sm">
        <Search className="absolute left-2.5 top-2.5 h-4 w-4 text-muted-foreground" />
        <Input placeholder="Search suppliers..." className="pl-9" value={search} onChange={e => setSearch(e.target.value)} />
      </div>
      <Card>
        <Table>
          <TableHeader>
            <TableRow>
              <TableHead>Supplier</TableHead>
              <TableHead>Contact</TableHead>
              <TableHead>GST / PAN</TableHead>
              <TableHead>Location</TableHead>
              <TableHead className="w-10" />
            </TableRow>
          </TableHeader>
          <TableBody>
            {isLoading ? <TableRow><TableCell colSpan={5} className="text-center py-8 text-muted-foreground">Loading...</TableCell></TableRow>
              : suppliers.length === 0 ? (
                <TableRow><TableCell colSpan={5} className="text-center py-12">
                  <div className="flex flex-col items-center text-muted-foreground">
                    <Truck className="w-10 h-10 mb-2 opacity-30" /><p>No suppliers yet</p>
                    <Button variant="outline" size="sm" className="mt-3" onClick={openCreate}><Plus className="w-4 h-4 mr-1" />Add supplier</Button>
                  </div>
                </TableCell></TableRow>
              ) : suppliers.map((s: any) => (
                <TableRow key={s.id} className="hover:bg-muted/40">
                  <TableCell><div className="font-medium">{s.name}</div>{s.contactPerson && <div className="text-xs text-muted-foreground">{s.contactPerson}</div>}</TableCell>
                  <TableCell className="text-sm"><div>{s.phone}</div><div className="text-muted-foreground">{s.email}</div></TableCell>
                  <TableCell className="text-xs font-mono"><div>{s.gstNumber}</div><div>{s.panNumber}</div></TableCell>
                  <TableCell className="text-sm">{[s.city, s.state].filter(Boolean).join(", ") || "—"}</TableCell>
                  <TableCell>
                    <DropdownMenu>
                      <DropdownMenuTrigger asChild><Button variant="ghost" size="icon" className="h-8 w-8"><MoreHorizontal className="h-4 w-4" /></Button></DropdownMenuTrigger>
                      <DropdownMenuContent align="end">
                        <DropdownMenuItem onClick={() => openEdit(s)}><Edit className="h-4 w-4 mr-2" />Edit</DropdownMenuItem>
                        <DropdownMenuItem className="text-destructive" onClick={() => del.mutate(s.id)}><Trash2 className="h-4 w-4 mr-2" />Delete</DropdownMenuItem>
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
          <DialogHeader><DialogTitle>{editing ? "Edit Supplier" : "Add Supplier"}</DialogTitle></DialogHeader>
          <div className="grid gap-4 py-2">
            <div className="grid gap-2"><Label>Supplier Name *</Label><Input value={form.name} onChange={setF("name")} placeholder="Supplier name" /></div>
            <div className="grid grid-cols-2 gap-3">
              <div className="grid gap-2"><Label>Phone</Label><Input value={form.phone} onChange={setF("phone")} /></div>
              <div className="grid gap-2"><Label>Email</Label><Input value={form.email} onChange={setF("email")} /></div>
            </div>
            <div className="grid grid-cols-2 gap-3">
              <div className="grid gap-2"><Label>GST Number</Label><Input value={form.gstNumber} onChange={setF("gstNumber")} className="font-mono uppercase" /></div>
              <div className="grid gap-2"><Label>Contact Person</Label><Input value={form.contactPerson} onChange={setF("contactPerson")} /></div>
            </div>
            <div className="grid gap-2"><Label>Address</Label><Input value={form.address} onChange={setF("address")} /></div>
            <div className="grid grid-cols-2 gap-3">
              <div className="grid gap-2"><Label>City</Label><Input value={form.city} onChange={setF("city")} /></div>
              <div className="grid gap-2"><Label>State</Label><Input value={form.state} onChange={setF("state")} /></div>
            </div>
          </div>
          <DialogFooter>
            <Button variant="outline" onClick={() => setOpen(false)}>Cancel</Button>
            <Button onClick={() => { if (!form.name) { toast({ title: "Name required", variant: "destructive" }); return; } save.mutate(form); }} disabled={save.isPending}>{editing ? "Update" : "Add"} Supplier</Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </div>
  );
}
