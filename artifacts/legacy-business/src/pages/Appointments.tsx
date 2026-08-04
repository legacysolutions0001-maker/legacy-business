import { useState } from "react";
import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { apiFetch } from "../lib/auth";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Dialog, DialogContent, DialogDescription, DialogFooter, DialogHeader, DialogTitle } from "@/components/ui/dialog";
import { DropdownMenu, DropdownMenuContent, DropdownMenuItem, DropdownMenuSeparator, DropdownMenuTrigger } from "@/components/ui/dropdown-menu";
import { Calendar as CalendarComponent } from "@/components/ui/calendar";
import { Badge } from "@/components/ui/badge";
import { format } from "date-fns";
import { Calendar as CalendarIcon, Clock, User, Plus, MoreHorizontal, Edit, Trash2 } from "lucide-react";
import { useToast } from "@/hooks/use-toast";

const STATUS_OPTIONS = ["scheduled", "completed", "cancelled", "no-show"];
const EMPTY_FORM = {
  title: "",
  customerId: "" as any,
  date: format(new Date(), "yyyy-MM-dd"),
  time: "10:00",
  duration: "30",
  notes: "",
  assignedTo: "",
  status: "scheduled",
};

export default function Appointments() {
  const [date, setDate] = useState<Date | undefined>(new Date());
  const dateStr = date ? format(date, "yyyy-MM-dd") : undefined;
  const qc = useQueryClient();
  const { toast } = useToast();

  const { data: appointments = [], isLoading } = useQuery({
    queryKey: ["appointments", dateStr],
    queryFn: () => apiFetch(`/appointments${dateStr ? `?date=${dateStr}` : ""}`).then(r => r.json()),
  });

  const { data: customers = [] } = useQuery({
    queryKey: ["customers"],
    queryFn: () => apiFetch("/customers").then(r => r.json()),
  });

  const [open, setOpen] = useState(false);
  const [editApt, setEditApt] = useState<any>(null);
  const [form, setForm] = useState({ ...EMPTY_FORM });

  const createMut = useMutation({
    mutationFn: async (data: any) => {
      const r = await apiFetch("/appointments", { method: "POST", body: JSON.stringify(data) });
      if (!r.ok) { const e = await r.json().catch(() => ({})); throw new Error(e.error || "Failed"); }
      return r.json();
    },
    onSuccess: () => { qc.invalidateQueries({ queryKey: ["appointments"] }); setOpen(false); toast({ title: "Appointment scheduled" }); },
    onError: (e: any) => toast({ title: "Failed to schedule", description: e.message, variant: "destructive" }),
  });

  const updateMut = useMutation({
    mutationFn: async ({ id, data }: { id: number; data: any }) => {
      const r = await apiFetch(`/appointments/${id}`, { method: "PATCH", body: JSON.stringify(data) });
      if (!r.ok) { const e = await r.json().catch(() => ({})); throw new Error(e.error || "Failed"); }
      return r.json();
    },
    onSuccess: () => { qc.invalidateQueries({ queryKey: ["appointments"] }); setOpen(false); toast({ title: "Appointment updated" }); },
    onError: (e: any) => toast({ title: "Failed to update", description: e.message, variant: "destructive" }),
  });

  const deleteMut = useMutation({
    mutationFn: async (id: number) => {
      const r = await apiFetch(`/appointments/${id}`, { method: "DELETE" });
      if (!r.ok) throw new Error("Failed");
    },
    onSuccess: () => { qc.invalidateQueries({ queryKey: ["appointments"] }); toast({ title: "Appointment removed" }); },
    onError: () => toast({ title: "Failed to delete", variant: "destructive" }),
  });

  const set = (k: keyof typeof EMPTY_FORM) => (e: React.ChangeEvent<HTMLInputElement>) => setForm(f => ({ ...f, [k]: e.target.value }));

  function openCreate() {
    setEditApt(null);
    setForm({ ...EMPTY_FORM, date: date ? format(date, "yyyy-MM-dd") : format(new Date(), "yyyy-MM-dd") });
    setOpen(true);
  }

  function openEdit(apt: any) {
    setEditApt(apt);
    setForm({
      title: apt.title,
      customerId: apt.customerId ? String(apt.customerId) : "",
      date: apt.date,
      time: apt.time?.substring(0, 5) || "10:00",
      duration: String(apt.duration || 30),
      notes: apt.notes || "",
      assignedTo: apt.assignedTo || "",
      status: apt.status,
    });
    setOpen(true);
  }

  function handleSave() {
    const payload: any = {
      title: form.title,
      customerId: form.customerId ? Number(form.customerId) : undefined,
      date: form.date,
      time: form.time,
      duration: parseInt(form.duration) || 30,
      notes: form.notes || undefined,
      assignedTo: form.assignedTo || undefined,
      status: form.status,
    };
    if (editApt) {
      updateMut.mutate({ id: editApt.id, data: payload });
    } else {
      createMut.mutate(payload);
    }
  }

  const isSaving = createMut.isPending || updateMut.isPending;

  const statusColor: Record<string, string> = {
    scheduled: "bg-blue-500/10 text-blue-600 border-blue-500/20",
    completed: "bg-emerald-500/10 text-emerald-600 border-emerald-500/20",
    cancelled: "bg-red-500/10 text-red-600 border-red-500/20",
    "no-show": "bg-amber-500/10 text-amber-600 border-amber-500/20",
  };

  return (
    <div className="space-y-6 h-full flex flex-col">
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-3xl font-bold tracking-tight">Appointments</h1>
          <p className="text-muted-foreground">Manage client meetings and your schedule.</p>
        </div>
        <Button onClick={openCreate}>
          <Plus className="w-4 h-4 mr-2" /> New Appointment
        </Button>
      </div>

      <div className="grid grid-cols-1 md:grid-cols-3 gap-6 flex-1 items-start">
        <Card className="md:col-span-1 border shadow-sm">
          <CardContent className="p-0">
            <CalendarComponent
              mode="single"
              selected={date}
              onSelect={setDate}
              className="rounded-md w-full flex justify-center p-4"
            />
          </CardContent>
          <div className="px-4 pb-4 pt-0">
            <Button className="w-full" onClick={openCreate}>
              <Plus className="w-4 h-4 mr-2" /> Schedule for {date ? format(date, "MMM d") : "Today"}
            </Button>
          </div>
        </Card>

        <Card className="md:col-span-2 min-h-[500px] flex flex-col shadow-sm">
          <CardHeader className="border-b pb-4">
            <CardTitle className="text-lg font-semibold flex items-center justify-between">
              <span>{date ? format(date, "EEEE, MMMM d, yyyy") : "Select a date"}</span>
              <Badge variant="secondary">{(appointments as any[]).length} appointments</Badge>
            </CardTitle>
          </CardHeader>
          <CardContent className="p-0 flex-1 overflow-y-auto">
            {isLoading ? (
              <div className="p-8 text-center text-muted-foreground animate-pulse">Loading schedule…</div>
            ) : (appointments as any[]).length === 0 ? (
              <div className="h-full flex flex-col items-center justify-center p-12 text-muted-foreground">
                <CalendarIcon className="w-12 h-12 mb-4 opacity-20" />
                <p className="font-medium">No appointments scheduled</p>
                <p className="text-sm mt-1">Click "New Appointment" to add one</p>
              </div>
            ) : (
              <div className="divide-y">
                {(appointments as any[]).sort((a: any, b: any) => (a.time || "").localeCompare(b.time || "")).map((apt: any) => (
                  <div key={apt.id} className="p-5 hover:bg-muted/30 transition-colors flex gap-5 group">
                    <div className="flex flex-col items-end shrink-0 w-16">
                      <span className="font-bold text-lg leading-tight">{apt.time?.substring(0, 5)}</span>
                      <span className="text-[10px] text-muted-foreground uppercase">{parseInt(apt.time || "0") >= 12 ? "PM" : "AM"}</span>
                    </div>
                    <div className="flex-1 space-y-2 min-w-0">
                      <div className="flex items-start justify-between gap-2">
                        <div className="min-w-0">
                          <h3 className="font-semibold truncate">{apt.title}</h3>
                          {apt.customerName && (
                            <div className="flex items-center text-sm text-muted-foreground mt-0.5">
                              <User className="w-3.5 h-3.5 mr-1.5 shrink-0" />
                              {apt.customerName}
                            </div>
                          )}
                        </div>
                        <div className="flex items-center gap-2 shrink-0">
                          <Badge className={statusColor[apt.status] || ""}>{apt.status}</Badge>
                          <DropdownMenu>
                            <DropdownMenuTrigger asChild>
                              <Button variant="ghost" size="icon" className="h-7 w-7 opacity-0 group-hover:opacity-100">
                                <MoreHorizontal className="h-4 w-4" />
                              </Button>
                            </DropdownMenuTrigger>
                            <DropdownMenuContent align="end">
                              <DropdownMenuItem onClick={() => openEdit(apt)}>
                                <Edit className="h-4 w-4 mr-2" /> Edit
                              </DropdownMenuItem>
                              {apt.status === "scheduled" && (
                                <DropdownMenuItem onClick={() => updateMut.mutate({ id: apt.id, data: { status: "completed" } })}>
                                  <Clock className="h-4 w-4 mr-2" /> Mark Complete
                                </DropdownMenuItem>
                              )}
                              <DropdownMenuSeparator />
                              <DropdownMenuItem className="text-destructive" onClick={() => deleteMut.mutate(apt.id)}>
                                <Trash2 className="h-4 w-4 mr-2" /> Delete
                              </DropdownMenuItem>
                            </DropdownMenuContent>
                          </DropdownMenu>
                        </div>
                      </div>
                      {apt.notes && (
                        <p className="text-sm bg-muted/50 p-2.5 rounded-md border text-muted-foreground line-clamp-2">{apt.notes}</p>
                      )}
                      <div className="flex items-center gap-4 text-xs text-muted-foreground">
                        {apt.duration && (
                          <div className="flex items-center">
                            <Clock className="w-3 h-3 mr-1" /> {apt.duration} min
                          </div>
                        )}
                        {apt.assignedTo && (
                          <div className="flex items-center">
                            <User className="w-3 h-3 mr-1" /> {apt.assignedTo}
                          </div>
                        )}
                      </div>
                    </div>
                  </div>
                ))}
              </div>
            )}
          </CardContent>
        </Card>
      </div>

      <Dialog open={open} onOpenChange={setOpen}>
        <DialogContent className="max-w-md">
          <DialogHeader>
            <DialogTitle>{editApt ? "Edit Appointment" : "New Appointment"}</DialogTitle>
            <DialogDescription>{editApt ? "Update the appointment details." : "Schedule a new client appointment."}</DialogDescription>
          </DialogHeader>
          <div className="grid gap-4 py-4">
            <div className="grid gap-2">
              <Label>Title *</Label>
              <Input placeholder="e.g. Product Demo Call" value={form.title} onChange={set("title")} />
            </div>
            <div className="grid gap-2">
              <Label>Customer</Label>
              <Select value={form.customerId ? String(form.customerId) : "__none__"} onValueChange={v => setForm(f => ({ ...f, customerId: v === "__none__" ? "" : v }))}>
                <SelectTrigger><SelectValue placeholder="Select customer" /></SelectTrigger>
                <SelectContent>
                  <SelectItem value="__none__">No customer</SelectItem>
                  {(customers as any[]).map((c: any) => <SelectItem key={c.id} value={String(c.id)}>{c.name}</SelectItem>)}
                </SelectContent>
              </Select>
            </div>
            <div className="grid grid-cols-2 gap-4">
              <div className="grid gap-2">
                <Label>Date</Label>
                <Input type="date" value={form.date} onChange={set("date")} />
              </div>
              <div className="grid gap-2">
                <Label>Time</Label>
                <Input type="time" value={form.time} onChange={set("time")} />
              </div>
            </div>
            <div className="grid grid-cols-2 gap-4">
              <div className="grid gap-2">
                <Label>Duration (mins)</Label>
                <Select value={form.duration} onValueChange={v => setForm(f => ({ ...f, duration: v }))}>
                  <SelectTrigger><SelectValue /></SelectTrigger>
                  <SelectContent>
                    {["15", "30", "45", "60", "90", "120"].map(d => <SelectItem key={d} value={d}>{d} min</SelectItem>)}
                  </SelectContent>
                </Select>
              </div>
              <div className="grid gap-2">
                <Label>Status</Label>
                <Select value={form.status} onValueChange={v => setForm(f => ({ ...f, status: v }))}>
                  <SelectTrigger><SelectValue /></SelectTrigger>
                  <SelectContent>
                    {STATUS_OPTIONS.map(s => <SelectItem key={s} value={s} className="capitalize">{s}</SelectItem>)}
                  </SelectContent>
                </Select>
              </div>
            </div>
            <div className="grid gap-2">
              <Label>Assigned To</Label>
              <Input placeholder="Staff member name" value={form.assignedTo} onChange={set("assignedTo")} />
            </div>
            <div className="grid gap-2">
              <Label>Notes</Label>
              <Input placeholder="Optional notes…" value={form.notes} onChange={set("notes")} />
            </div>
          </div>
          <DialogFooter>
            <Button variant="outline" onClick={() => setOpen(false)}>Cancel</Button>
            <Button onClick={handleSave} disabled={isSaving || !form.title}>
              {isSaving ? "Saving…" : editApt ? "Update" : "Schedule"}
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </div>
  );
}
