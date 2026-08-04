import { useState } from "react";
import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { apiFetch } from "../lib/auth";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { Card, CardContent } from "@/components/ui/card";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";
import { Badge } from "@/components/ui/badge";
import { Input } from "@/components/ui/input";
import { Search, Plus } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Dialog, DialogContent, DialogDescription, DialogFooter, DialogHeader, DialogTitle, DialogTrigger } from "@/components/ui/dialog";
import { Label } from "@/components/ui/label";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { useToast } from "@/hooks/use-toast";

export default function CRM() {
  const [searchTerm, setSearchTerm] = useState("");
  const qc = useQueryClient();
  const { toast } = useToast();

  const { data: leads = [], isLoading: isLeadsLoading } = useQuery({
    queryKey: ["leads", searchTerm],
    queryFn: () => apiFetch(`/leads${searchTerm ? `?search=${encodeURIComponent(searchTerm)}` : ""}`).then(r => r.json()),
  });

  const { data: customers = [], isLoading: isCustomersLoading } = useQuery({
    queryKey: ["customers", searchTerm],
    queryFn: () => apiFetch(`/customers${searchTerm ? `?search=${encodeURIComponent(searchTerm)}` : ""}`).then(r => r.json()),
  });

  const { data: pipeline = [], isLoading: isPipelineLoading } = useQuery({
    queryKey: ["crm-pipeline"],
    queryFn: () => apiFetch("/leads/pipeline").then(r => r.json()),
  });

  const [leadOpen, setLeadOpen] = useState(false);
  const [leadForm, setLeadForm] = useState({ name: "", email: "", status: "new", source: "website" });

  const createLead = useMutation({
    mutationFn: async (data: any) => {
      const r = await apiFetch("/leads", { method: "POST", body: JSON.stringify(data) });
      if (!r.ok) { const e = await r.json().catch(() => ({})); throw new Error(e.error || "Failed"); }
      return r.json();
    },
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: ["leads"] });
      qc.invalidateQueries({ queryKey: ["crm-pipeline"] });
      setLeadOpen(false);
      setLeadForm({ name: "", email: "", status: "new", source: "website" });
      toast({ title: "Lead created successfully" });
    },
    onError: (e: any) => toast({ title: "Failed to create lead", description: e.message, variant: "destructive" }),
  });

  const [customerOpen, setCustomerOpen] = useState(false);
  const [customerForm, setCustomerForm] = useState({ name: "", email: "", company: "" });

  const createCustomer = useMutation({
    mutationFn: async (data: any) => {
      const r = await apiFetch("/customers", { method: "POST", body: JSON.stringify(data) });
      if (!r.ok) { const e = await r.json().catch(() => ({})); throw new Error(e.error || "Failed"); }
      return r.json();
    },
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: ["customers"] });
      setCustomerOpen(false);
      setCustomerForm({ name: "", email: "", company: "" });
      toast({ title: "Customer created successfully" });
    },
    onError: (e: any) => toast({ title: "Failed to create customer", description: e.message, variant: "destructive" }),
  });

  return (
    <div className="space-y-6 h-full flex flex-col">
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-3xl font-bold tracking-tight">CRM</h1>
          <p className="text-muted-foreground">Manage leads, customers, and deals.</p>
        </div>
      </div>

      <Tabs defaultValue="pipeline" className="flex-1 flex flex-col">
        <div className="flex items-center justify-between">
          <TabsList>
            <TabsTrigger value="pipeline">Pipeline</TabsTrigger>
            <TabsTrigger value="leads">Leads</TabsTrigger>
            <TabsTrigger value="customers">Customers</TabsTrigger>
          </TabsList>

          <div className="flex gap-2 items-center">
            <div className="relative w-64">
              <Search className="absolute left-2.5 top-2.5 h-4 w-4 text-muted-foreground" />
              <Input
                placeholder="Search..."
                className="pl-9 h-9"
                value={searchTerm}
                onChange={(e) => setSearchTerm(e.target.value)}
              />
            </div>

            <Dialog open={leadOpen} onOpenChange={setLeadOpen}>
              <DialogTrigger asChild>
                <Button size="sm" className="h-9"><Plus className="w-4 h-4 mr-2" /> New Lead</Button>
              </DialogTrigger>
              <DialogContent>
                <DialogHeader>
                  <DialogTitle>Create New Lead</DialogTitle>
                  <DialogDescription>Add a new prospective customer to your pipeline.</DialogDescription>
                </DialogHeader>
                <div className="grid gap-4 py-4">
                  <div className="grid gap-2">
                    <Label>Full Name</Label>
                    <Input value={leadForm.name} onChange={e => setLeadForm({ ...leadForm, name: e.target.value })} placeholder="Enter name" />
                  </div>
                  <div className="grid gap-2">
                    <Label>Email</Label>
                    <Input type="email" value={leadForm.email} onChange={e => setLeadForm({ ...leadForm, email: e.target.value })} placeholder="email@example.com" />
                  </div>
                  <div className="grid grid-cols-2 gap-4">
                    <div className="grid gap-2">
                      <Label>Status</Label>
                      <Select value={leadForm.status} onValueChange={v => setLeadForm({ ...leadForm, status: v })}>
                        <SelectTrigger><SelectValue /></SelectTrigger>
                        <SelectContent>
                          <SelectItem value="new">New</SelectItem>
                          <SelectItem value="contacted">Contacted</SelectItem>
                          <SelectItem value="qualified">Qualified</SelectItem>
                          <SelectItem value="won">Won</SelectItem>
                          <SelectItem value="lost">Lost</SelectItem>
                        </SelectContent>
                      </Select>
                    </div>
                    <div className="grid gap-2">
                      <Label>Source</Label>
                      <Select value={leadForm.source} onValueChange={v => setLeadForm({ ...leadForm, source: v })}>
                        <SelectTrigger><SelectValue /></SelectTrigger>
                        <SelectContent>
                          <SelectItem value="website">Website</SelectItem>
                          <SelectItem value="referral">Referral</SelectItem>
                          <SelectItem value="cold_outbound">Cold Outbound</SelectItem>
                          <SelectItem value="social_media">Social Media</SelectItem>
                          <SelectItem value="other">Other</SelectItem>
                        </SelectContent>
                      </Select>
                    </div>
                  </div>
                </div>
                <DialogFooter>
                  <Button variant="outline" onClick={() => setLeadOpen(false)}>Cancel</Button>
                  <Button onClick={() => createLead.mutate(leadForm)} disabled={createLead.isPending || !leadForm.name}>
                    {createLead.isPending ? "Creating…" : "Create Lead"}
                  </Button>
                </DialogFooter>
              </DialogContent>
            </Dialog>

            <Dialog open={customerOpen} onOpenChange={setCustomerOpen}>
              <DialogTrigger asChild>
                <Button size="sm" variant="secondary" className="h-9"><Plus className="w-4 h-4 mr-2" /> New Customer</Button>
              </DialogTrigger>
              <DialogContent>
                <DialogHeader>
                  <DialogTitle>Add Customer</DialogTitle>
                  <DialogDescription>Add a new active customer record.</DialogDescription>
                </DialogHeader>
                <div className="grid gap-4 py-4">
                  <div className="grid gap-2">
                    <Label>Company / Name</Label>
                    <Input value={customerForm.name} onChange={e => setCustomerForm({ ...customerForm, name: e.target.value })} placeholder="Enter name" />
                  </div>
                  <div className="grid gap-2">
                    <Label>Billing Email</Label>
                    <Input type="email" value={customerForm.email} onChange={e => setCustomerForm({ ...customerForm, email: e.target.value })} placeholder="email@example.com" />
                  </div>
                  <div className="grid gap-2">
                    <Label>Company</Label>
                    <Input value={customerForm.company} onChange={e => setCustomerForm({ ...customerForm, company: e.target.value })} placeholder="Company name" />
                  </div>
                </div>
                <DialogFooter>
                  <Button variant="outline" onClick={() => setCustomerOpen(false)}>Cancel</Button>
                  <Button onClick={() => createCustomer.mutate(customerForm)} disabled={createCustomer.isPending || !customerForm.name}>
                    {createCustomer.isPending ? "Saving…" : "Save Customer"}
                  </Button>
                </DialogFooter>
              </DialogContent>
            </Dialog>
          </div>
        </div>

        <TabsContent value="pipeline" className="flex-1 mt-6">
          <div className="grid grid-cols-1 md:grid-cols-5 gap-4 h-full min-h-[500px]">
            {isPipelineLoading ? (
              <div className="col-span-5 flex items-center justify-center text-muted-foreground">Loading pipeline...</div>
            ) : (pipeline as any[]).length === 0 ? (
              <div className="col-span-5 flex items-center justify-center text-muted-foreground">No pipeline data yet. Create leads to populate.</div>
            ) : (pipeline as any[]).map((stage: any) => (
              <div key={stage.stage} className="bg-muted/50 rounded-xl p-4 flex flex-col gap-4 border">
                <div className="flex items-center justify-between">
                  <h3 className="font-semibold text-sm uppercase tracking-wider capitalize">{stage.stage}</h3>
                  <Badge variant="secondary">{stage.count}</Badge>
                </div>
                <div className="text-sm font-medium">₹{Number(stage.totalValue || 0).toLocaleString("en-IN")}</div>
                <div className="flex-1 flex flex-col gap-3">
                  {stage.count === 0 && (
                    <div className="flex-1 border-2 border-dashed rounded-lg border-muted-foreground/20 flex items-center justify-center py-8">
                      <span className="text-xs text-muted-foreground">Empty</span>
                    </div>
                  )}
                </div>
              </div>
            ))}
          </div>
        </TabsContent>

        <TabsContent value="leads" className="mt-6">
          <Card>
            <Table>
              <TableHeader>
                <TableRow>
                  <TableHead>Name</TableHead>
                  <TableHead>Company</TableHead>
                  <TableHead>Status</TableHead>
                  <TableHead>Value</TableHead>
                  <TableHead>Source</TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                {isLeadsLoading ? (
                  <TableRow><TableCell colSpan={5} className="text-center py-8">Loading...</TableCell></TableRow>
                ) : (leads as any[]).length === 0 ? (
                  <TableRow><TableCell colSpan={5} className="text-center text-muted-foreground py-8">No leads found</TableCell></TableRow>
                ) : (leads as any[]).map((lead: any) => (
                  <TableRow key={lead.id} className="cursor-pointer hover:bg-muted/50">
                    <TableCell>
                      <div className="font-medium">{lead.name}</div>
                      <div className="text-xs text-muted-foreground">{lead.email}</div>
                    </TableCell>
                    <TableCell>{lead.company || "-"}</TableCell>
                    <TableCell>
                      <Badge variant={lead.status === "won" ? "default" : lead.status === "lost" ? "destructive" : "secondary"} className="capitalize">
                        {lead.status}
                      </Badge>
                    </TableCell>
                    <TableCell>{lead.value ? `₹${Number(lead.value).toLocaleString("en-IN")}` : "-"}</TableCell>
                    <TableCell className="text-muted-foreground capitalize">{(lead.source || "").replace(/_/g, " ")}</TableCell>
                  </TableRow>
                ))}
              </TableBody>
            </Table>
          </Card>
        </TabsContent>

        <TabsContent value="customers" className="mt-6">
          <Card>
            <Table>
              <TableHeader>
                <TableRow>
                  <TableHead>Name</TableHead>
                  <TableHead>Company</TableHead>
                  <TableHead>Location</TableHead>
                  <TableHead className="text-right">Total Revenue</TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                {isCustomersLoading ? (
                  <TableRow><TableCell colSpan={4} className="text-center py-8">Loading...</TableCell></TableRow>
                ) : (customers as any[]).length === 0 ? (
                  <TableRow><TableCell colSpan={4} className="text-center text-muted-foreground py-8">No customers found</TableCell></TableRow>
                ) : (customers as any[]).map((customer: any) => (
                  <TableRow key={customer.id} className="cursor-pointer hover:bg-muted/50">
                    <TableCell>
                      <div className="font-medium">{customer.name}</div>
                      <div className="text-xs text-muted-foreground">{customer.email}</div>
                    </TableCell>
                    <TableCell>{customer.company || "-"}</TableCell>
                    <TableCell>{customer.city ? `${customer.city}, ${customer.country || ""}` : "-"}</TableCell>
                    <TableCell className="text-right font-medium">{customer.totalRevenue ? `₹${Number(customer.totalRevenue).toLocaleString("en-IN")}` : "₹0"}</TableCell>
                  </TableRow>
                ))}
              </TableBody>
            </Table>
          </Card>
        </TabsContent>
      </Tabs>
    </div>
  );
}
