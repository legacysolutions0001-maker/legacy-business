import { useState } from "react";
import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { apiFetch } from "../../lib/auth";
import { Card } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogFooter } from "@/components/ui/dialog";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Badge } from "@/components/ui/badge";
import { DropdownMenu, DropdownMenuContent, DropdownMenuItem, DropdownMenuTrigger } from "@/components/ui/dropdown-menu";
import {
  Plus, Search, Building2, MoreHorizontal, Edit, Trash2, UserPlus,
  ImageIcon, Key, Copy, CheckCircle2, Monitor, Loader2,
} from "lucide-react";
import { useToast } from "@/hooks/use-toast";
import { format } from "date-fns";
import { cn } from "@/lib/utils";

const PLANS = ["starter", "professional", "enterprise"];
const EMPTY = {
  name: "", code: "", ownerName: "", ownerEmail: "", ownerUsername: "", ownerPassword: "",
  owner2Name: "", owner2Email: "", owner2Username: "", owner2Password: "",
  plan: "starter", gstNumber: "", panNumber: "", mobile: "", address: "", city: "", state: "", logoUrl: "",
  maxUsers: "5", maxDevices: "1", maxBranches: "1", subscriptionEnd: "",
};

function CopyButton({ text }: { text: string }) {
  const [copied, setCopied] = useState(false);
  return (
    <button
      className="ml-1 text-slate-500 hover:text-slate-200 transition-colors"
      onClick={() => { navigator.clipboard.writeText(text); setCopied(true); setTimeout(() => setCopied(false), 1500); }}
    >
      {copied ? <CheckCircle2 className="w-3.5 h-3.5 text-green-400" /> : <Copy className="w-3.5 h-3.5" />}
    </button>
  );
}

export default function SuperCompanies() {
  const qc = useQueryClient();
  const { toast } = useToast();
  const [search, setSearch] = useState("");
  const [open, setOpen] = useState(false);
  const [editing, setEditing] = useState<any>(null);
  const [form, setForm] = useState({ ...EMPTY });
  const [showOwner2, setShowOwner2] = useState(false);
  const [genLoading, setGenLoading] = useState<number | null>(null);

  const { data: companies = [], isLoading } = useQuery({
    queryKey: ["super-companies", search],
    queryFn: () => apiFetch(`/super/companies${search ? `?search=${encodeURIComponent(search)}` : ""}`).then(r => r.json()),
  });

  const create = useMutation({
    mutationFn: (d: any) => apiFetch("/super/companies", { method: "POST", body: JSON.stringify(d) }).then(async r => {
      const json = await r.json();
      if (!r.ok) throw new Error(json.error || "Failed");
      return json;
    }),
    onSuccess: (data) => {
      qc.invalidateQueries({ queryKey: ["super-companies"] });
      setOpen(false);
      toast({
        title: "Company created",
        description: data.licenseKey ? `License Key: ${data.licenseKey}` : undefined,
      });
    },
    onError: (e: any) => toast({ title: e.message || "Failed", variant: "destructive" }),
  });

  const update = useMutation({
    mutationFn: ({ id, ...d }: any) => apiFetch(`/super/companies/${id}`, { method: "PATCH", body: JSON.stringify(d) }).then(r => r.json()),
    onSuccess: () => { qc.invalidateQueries({ queryKey: ["super-companies"] }); setOpen(false); toast({ title: "Company updated" }); },
    onError: () => toast({ title: "Failed", variant: "destructive" }),
  });

  const del = useMutation({
    mutationFn: (id: number) => apiFetch(`/super/companies/${id}`, { method: "DELETE" }),
    onSuccess: () => { qc.invalidateQueries({ queryKey: ["super-companies"] }); toast({ title: "Company deleted" }); },
  });

  const openCreate = () => { setEditing(null); setForm({ ...EMPTY }); setShowOwner2(false); setOpen(true); };
  const openEdit = (c: any) => {
    setEditing(c);
    setForm({
      name: c.name, code: c.code, ownerName: "", ownerEmail: "", ownerUsername: "", ownerPassword: "",
      owner2Name: "", owner2Email: "", owner2Username: "", owner2Password: "",
      plan: c.plan || "starter", gstNumber: c.gstNumber || "", panNumber: c.panNumber || "",
      mobile: c.mobile || "", address: c.address || "", city: c.city || "", state: c.state || "",
      logoUrl: c.logoUrl || "", maxUsers: String(c.maxUsers ?? 5), maxDevices: String(c.maxDevices ?? 1),
      maxBranches: String(c.maxBranches ?? 1), subscriptionEnd: c.subscriptionEnd ? c.subscriptionEnd.split("T")[0] : "",
    });
    setShowOwner2(false);
    setOpen(true);
  };
  const setF = (k: keyof typeof EMPTY) => (e: React.ChangeEvent<HTMLInputElement>) => setForm(f => ({ ...f, [k]: e.target.value }));

  const handleSave = () => {
    if (!form.name || !form.code) { toast({ title: "Name and code required", variant: "destructive" }); return; }
    const payload = { ...form, maxUsers: Number(form.maxUsers) || 5, maxDevices: Number(form.maxDevices) || 1, maxBranches: Number(form.maxBranches) || 1 };
    if (editing) { update.mutate({ id: editing.id, ...payload }); }
    else {
      if (!form.ownerUsername || !form.ownerPassword) { toast({ title: "Owner username and password required", variant: "destructive" }); return; }
      create.mutate(payload);
    }
  };

  // Generate license key for an existing company
  const handleGenerateLicense = async (company: any) => {
    setGenLoading(company.id);
    try {
      const r = await apiFetch("/license/generate", {
        method: "POST",
        body: JSON.stringify({
          companyCode: company.code,
          maxUsers: company.maxUsers ?? 5,
          maxDevices: company.maxDevices ?? 1,
          maxBranches: company.maxBranches ?? 1,
          plan: company.plan || "starter",
          subscriptionEnd: company.subscriptionEnd ?? null,
        }),
      });
      const data = await r.json();
      if (!r.ok) throw new Error(data.error || "Failed");
      qc.invalidateQueries({ queryKey: ["super-companies"] });
      toast({ title: "License generated", description: `Key: ${data.licenseKey}` });
    } catch (e: any) {
      toast({ title: "Failed to generate license", description: e.message, variant: "destructive" });
    } finally {
      setGenLoading(null);
    }
  };

  const activationBadge = (status: string) => {
    const map: Record<string, string> = {
      active: "bg-emerald-900/30 text-emerald-400 border-emerald-900",
      pending: "bg-yellow-900/30 text-yellow-400 border-yellow-900",
      suspended: "bg-red-900/30 text-red-400 border-red-900",
    };
    return map[status] || "bg-slate-800 text-slate-400 border-slate-700";
  };

  return (
    <div className="space-y-5">
      <div className="flex items-center justify-between">
        <div><h1 className="text-2xl font-bold text-white">Companies</h1><p className="text-slate-400 text-sm">Manage all registered companies and license keys</p></div>
        <Button className="bg-red-700 hover:bg-red-600" onClick={openCreate}><Plus className="w-4 h-4 mr-2" />Add Company</Button>
      </div>
      <div className="relative max-w-sm">
        <Search className="absolute left-2.5 top-2.5 h-4 w-4 text-slate-500" />
        <Input placeholder="Search companies..." className="pl-9 bg-slate-900 border-slate-700 text-white placeholder:text-slate-500" value={search} onChange={e => setSearch(e.target.value)} />
      </div>
      <Card className="bg-slate-900/50 border-slate-800 overflow-x-auto">
        <Table>
          <TableHeader>
            <TableRow className="border-slate-800">
              <TableHead className="text-slate-400">Company</TableHead>
              <TableHead className="text-slate-400">Code</TableHead>
              <TableHead className="text-slate-400">License Key</TableHead>
              <TableHead className="text-slate-400">Plan</TableHead>
              <TableHead className="text-slate-400">Limits</TableHead>
              <TableHead className="text-slate-400">Status</TableHead>
              <TableHead className="text-slate-400">Created</TableHead>
              <TableHead className="w-10" />
            </TableRow>
          </TableHeader>
          <TableBody>
            {isLoading ? (
              <TableRow><TableCell colSpan={8} className="text-center py-8 text-slate-500">Loading...</TableCell></TableRow>
            ) : (companies as any[]).length === 0 ? (
              <TableRow><TableCell colSpan={8} className="text-center py-12">
                <div className="flex flex-col items-center text-slate-500">
                  <Building2 className="w-10 h-10 mb-2 opacity-30" /><p>No companies yet</p>
                </div>
              </TableCell></TableRow>
            ) : (companies as any[]).map((c: any) => (
              <TableRow key={c.id} className="border-slate-800 hover:bg-slate-800/50">
                {/* Company */}
                <TableCell>
                  <div className="flex items-center gap-2">
                    {c.logoUrl
                      ? <img src={c.logoUrl} alt="logo" className="w-7 h-7 rounded-lg object-cover" />
                      : <div className="w-7 h-7 bg-slate-700 rounded-lg flex items-center justify-center"><Building2 className="w-3.5 h-3.5 text-slate-400" /></div>}
                    <div>
                      <div className="font-medium text-white">{c.name}</div>
                      <div className="text-xs text-slate-500">{c.mobile || c.email || "—"}</div>
                    </div>
                  </div>
                </TableCell>

                {/* Code */}
                <TableCell className="font-mono text-sm text-slate-300">{c.code}</TableCell>

                {/* License Key */}
                <TableCell>
                  {c.licenseKey ? (
                    <div className="flex items-center gap-1">
                      <code className="text-xs text-emerald-400 font-mono bg-emerald-950/40 px-1.5 py-0.5 rounded">
                        {c.licenseKey}
                      </code>
                      <CopyButton text={c.licenseKey} />
                    </div>
                  ) : (
                    <Button
                      size="sm"
                      variant="outline"
                      className="h-6 px-2 text-xs border-slate-600 text-slate-400 hover:text-white hover:border-slate-400"
                      disabled={genLoading === c.id}
                      onClick={() => handleGenerateLicense(c)}
                    >
                      {genLoading === c.id ? <Loader2 className="w-3 h-3 animate-spin mr-1" /> : <Key className="w-3 h-3 mr-1" />}
                      Generate
                    </Button>
                  )}
                </TableCell>

                {/* Plan */}
                <TableCell>
                  <Badge className={cn("capitalize text-xs",
                    c.plan === "enterprise" ? "bg-purple-900/30 text-purple-400 border-purple-900"
                    : c.plan === "professional" ? "bg-blue-900/30 text-blue-400 border-blue-900"
                    : "bg-slate-800 text-slate-400 border-slate-700"
                  )}>
                    {c.plan || "starter"}
                  </Badge>
                </TableCell>

                {/* Limits */}
                <TableCell>
                  <div className="flex flex-col gap-0.5 text-xs text-slate-400">
                    <span className="flex items-center gap-1"><UserPlus className="w-3 h-3" />{c.maxUsers ?? 5} users</span>
                    <span className="flex items-center gap-1"><Monitor className="w-3 h-3" />{c.maxDevices ?? 1} device{(c.maxDevices ?? 1) !== 1 ? "s" : ""}</span>
                  </div>
                </TableCell>

                {/* Status */}
                <TableCell>
                  <Badge className={activationBadge(c.activationStatus || "pending")}>
                    {c.activationStatus || "pending"}
                  </Badge>
                </TableCell>

                {/* Created */}
                <TableCell className="text-slate-500 text-sm">{c.createdAt ? format(new Date(c.createdAt), "dd MMM yyyy") : "—"}</TableCell>

                {/* Actions */}
                <TableCell>
                  <DropdownMenu>
                    <DropdownMenuTrigger asChild>
                      <Button variant="ghost" size="icon" className="h-8 w-8 text-slate-400"><MoreHorizontal className="h-4 w-4" /></Button>
                    </DropdownMenuTrigger>
                    <DropdownMenuContent align="end" className="bg-slate-900 border-slate-700">
                      <DropdownMenuItem className="text-slate-300 hover:text-white" onClick={() => openEdit(c)}>
                        <Edit className="h-4 w-4 mr-2" />Edit
                      </DropdownMenuItem>
                      <DropdownMenuItem className="text-slate-300 hover:text-white" onClick={() => handleGenerateLicense(c)}>
                        <Key className="h-4 w-4 mr-2" />Regenerate License
                      </DropdownMenuItem>
                      <DropdownMenuItem className="text-red-400" onClick={() => del.mutate(c.id)}>
                        <Trash2 className="h-4 w-4 mr-2" />Delete
                      </DropdownMenuItem>
                    </DropdownMenuContent>
                  </DropdownMenu>
                </TableCell>
              </TableRow>
            ))}
          </TableBody>
        </Table>
      </Card>

      {/* Create / Edit Dialog */}
      <Dialog open={open} onOpenChange={setOpen}>
        <DialogContent className="max-w-xl bg-slate-900 border-slate-700 text-white max-h-[90vh] overflow-y-auto">
          <DialogHeader><DialogTitle className="text-white">{editing ? "Edit Company" : "Add Company"}</DialogTitle></DialogHeader>
          <div className="grid gap-4 py-2">
            <div className="grid grid-cols-2 gap-3">
              <div className="grid gap-2"><Label className="text-slate-300">Company Name *</Label><Input value={form.name} onChange={setF("name")} placeholder="Business Name" className="bg-slate-800 border-slate-700 text-white" /></div>
              <div className="grid gap-2"><Label className="text-slate-300">Company Code *</Label><Input value={form.code} placeholder="COMP01" className="bg-slate-800 border-slate-700 text-white uppercase" onChange={e => setForm(f => ({ ...f, code: e.target.value.toUpperCase() }))} /></div>
            </div>
            <div className="grid grid-cols-2 gap-3">
              <div className="grid gap-2"><Label className="text-slate-300">GST Number</Label><Input value={form.gstNumber} onChange={setF("gstNumber")} placeholder="29AABCT1332L1ZN" className="bg-slate-800 border-slate-700 text-white font-mono uppercase" /></div>
              <div className="grid gap-2"><Label className="text-slate-300">PAN Number</Label><Input value={form.panNumber} onChange={setF("panNumber")} placeholder="AABCT1332L" className="bg-slate-800 border-slate-700 text-white font-mono uppercase" /></div>
            </div>
            <div className="grid grid-cols-2 gap-3">
              <div className="grid gap-2"><Label className="text-slate-300">Mobile</Label><Input value={form.mobile} onChange={setF("mobile")} placeholder="9876543210" className="bg-slate-800 border-slate-700 text-white" /></div>
              <div className="grid gap-2"><Label className="text-slate-300">Plan</Label>
                <Select value={form.plan} onValueChange={v => setForm(f => ({ ...f, plan: v }))}>
                  <SelectTrigger className="bg-slate-800 border-slate-700 text-white"><SelectValue /></SelectTrigger>
                  <SelectContent className="bg-slate-800 border-slate-700">{PLANS.map(p => <SelectItem key={p} value={p} className="text-white capitalize">{p}</SelectItem>)}</SelectContent>
                </Select>
              </div>
            </div>
            {/* Limits */}
            <div className="border border-slate-700 rounded-lg p-3 space-y-3">
              <p className="text-xs text-slate-400 font-medium uppercase tracking-wide">License Limits</p>
              <div className="grid grid-cols-3 gap-3">
                <div className="grid gap-2">
                  <Label className="text-slate-300 text-xs">Max Users</Label>
                  <Input type="number" min="1" max="1000" value={form.maxUsers} onChange={setF("maxUsers")} className="bg-slate-800 border-slate-700 text-white" />
                </div>
                <div className="grid gap-2">
                  <Label className="text-slate-300 text-xs">Max Devices</Label>
                  <Input type="number" min="1" max="100" value={form.maxDevices} onChange={setF("maxDevices")} className="bg-slate-800 border-slate-700 text-white" />
                </div>
                <div className="grid gap-2">
                  <Label className="text-slate-300 text-xs">Max Branches</Label>
                  <Input type="number" min="1" max="100" value={form.maxBranches} onChange={setF("maxBranches")} className="bg-slate-800 border-slate-700 text-white" />
                </div>
              </div>
              <div className="grid gap-2">
                <Label className="text-slate-300 text-xs">Subscription End Date (optional)</Label>
                <Input type="date" value={form.subscriptionEnd} onChange={setF("subscriptionEnd")} className="bg-slate-800 border-slate-700 text-white" />
              </div>
            </div>
            <div className="grid gap-2"><Label className="text-slate-300">Address</Label><Input value={form.address} onChange={setF("address")} placeholder="Street address" className="bg-slate-800 border-slate-700 text-white" /></div>
            <div className="grid grid-cols-2 gap-3">
              <div className="grid gap-2"><Label className="text-slate-300">City</Label><Input value={form.city} onChange={setF("city")} placeholder="City" className="bg-slate-800 border-slate-700 text-white" /></div>
              <div className="grid gap-2"><Label className="text-slate-300">State</Label><Input value={form.state} onChange={setF("state")} placeholder="State" className="bg-slate-800 border-slate-700 text-white" /></div>
            </div>
            <div className="grid gap-2">
              <Label className="text-slate-300 flex items-center gap-1.5"><ImageIcon className="w-3.5 h-3.5" />Logo URL</Label>
              <Input value={form.logoUrl} onChange={setF("logoUrl")} placeholder="https://example.com/logo.png" className="bg-slate-800 border-slate-700 text-white" />
              {form.logoUrl && <img src={form.logoUrl} alt="logo preview" className="w-12 h-12 rounded-lg object-contain bg-slate-800 p-1" onError={e => (e.currentTarget.style.display = "none")} />}
            </div>

            {!editing && <>
              <div className="border-t border-slate-700 pt-3"><p className="text-sm text-slate-400 flex items-center gap-1.5"><UserPlus className="w-4 h-4" />Owner Account (Company Admin)</p></div>
              <div className="grid grid-cols-2 gap-3">
                <div className="grid gap-2"><Label className="text-slate-300">Owner Name</Label><Input value={form.ownerName} onChange={setF("ownerName")} placeholder="Full Name" className="bg-slate-800 border-slate-700 text-white" /></div>
                <div className="grid gap-2"><Label className="text-slate-300">Owner Email</Label><Input value={form.ownerEmail} onChange={setF("ownerEmail")} placeholder="owner@company.com" className="bg-slate-800 border-slate-700 text-white" /></div>
                <div className="grid gap-2"><Label className="text-slate-300">Username *</Label><Input value={form.ownerUsername} onChange={setF("ownerUsername")} placeholder="owner_username" className="bg-slate-800 border-slate-700 text-white" /></div>
                <div className="grid gap-2"><Label className="text-slate-300">Password *</Label><Input type="password" value={form.ownerPassword} onChange={setF("ownerPassword")} placeholder="Min 6 chars" className="bg-slate-800 border-slate-700 text-white" /></div>
              </div>

              <button type="button" onClick={() => setShowOwner2(!showOwner2)} className="flex items-center gap-2 text-sm text-slate-400 hover:text-white transition-colors">
                <UserPlus className="w-4 h-4" />{showOwner2 ? "Remove second owner" : "+ Add Owner 2 (optional)"}
              </button>
              {showOwner2 && (
                <div className="grid grid-cols-2 gap-3 border border-slate-700 rounded-lg p-3">
                  <div className="grid gap-2"><Label className="text-slate-300">Owner 2 Name</Label><Input value={form.owner2Name} onChange={setF("owner2Name")} placeholder="Full Name" className="bg-slate-800 border-slate-700 text-white" /></div>
                  <div className="grid gap-2"><Label className="text-slate-300">Owner 2 Email</Label><Input value={form.owner2Email} onChange={setF("owner2Email")} placeholder="owner2@company.com" className="bg-slate-800 border-slate-700 text-white" /></div>
                  <div className="grid gap-2"><Label className="text-slate-300">Username *</Label><Input value={form.owner2Username} onChange={setF("owner2Username")} placeholder="owner2_username" className="bg-slate-800 border-slate-700 text-white" /></div>
                  <div className="grid gap-2"><Label className="text-slate-300">Password *</Label><Input type="password" value={form.owner2Password} onChange={setF("owner2Password")} placeholder="Min 6 chars" className="bg-slate-800 border-slate-700 text-white" /></div>
                </div>
              )}
            </>}
          </div>
          <DialogFooter>
            <Button variant="outline" className="border-slate-700 text-slate-300" onClick={() => setOpen(false)}>Cancel</Button>
            <Button className="bg-red-700 hover:bg-red-600" onClick={handleSave} disabled={create.isPending || update.isPending}>
              {editing ? "Update" : "Create"} Company
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </div>
  );
}
