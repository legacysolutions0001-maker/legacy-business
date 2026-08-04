import { useState } from "react";
import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { apiFetch } from "../../lib/auth";
import { Card } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogFooter } from "@/components/ui/dialog";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Textarea } from "@/components/ui/textarea";
import { Badge } from "@/components/ui/badge";
import { Plus, Bell, Building2, Users, Megaphone } from "lucide-react";
import { useToast } from "@/hooks/use-toast";
import { format } from "date-fns";

export default function SuperNotifications() {
  const qc = useQueryClient();
  const { toast } = useToast();
  const [open,setOpen]=useState(false);
  const [form,setForm]=useState({title:"",message:"",type:"info",targetType:"all",companyId:""});

  const { data: notifications=[], isLoading } = useQuery({ queryKey:["super-notifications"], queryFn:()=>apiFetch("/super/notifications").then(r=>r.json()) });
  const { data: companies=[] } = useQuery({ queryKey:["super-companies"], queryFn:()=>apiFetch("/super/companies").then(r=>r.json()) });

  const send = useMutation({
    mutationFn:(d:any)=>apiFetch("/super/notifications",{method:"POST",body:JSON.stringify(d)}).then(r=>r.json()),
    onSuccess:()=>{qc.invalidateQueries({queryKey:["super-notifications"]});setOpen(false);toast({title:"Notification sent"});},
    onError:()=>toast({title:"Failed",variant:"destructive"}),
  });

  const TYPE_ICONS: Record<string,any> = { info:Bell, alert:Megaphone };

  return (
    <div className="space-y-5">
      <div className="flex items-center justify-between">
        <div><h1 className="text-2xl font-bold text-white">Broadcast Notifications</h1><p className="text-slate-400 text-sm">Send announcements to companies or all users</p></div>
        <Button className="bg-red-700 hover:bg-red-600" onClick={()=>{setForm({title:"",message:"",type:"info",targetType:"all",companyId:""});setOpen(true);}}><Plus className="w-4 h-4 mr-2"/>Send Notification</Button>
      </div>

      {isLoading?<div className="flex h-32 items-center justify-center"><div className="animate-spin w-6 h-6 border-4 border-red-500 border-t-transparent rounded-full"/></div>
      :(notifications as any[]).length===0?<Card className="flex flex-col items-center justify-center py-16 text-slate-500 bg-slate-900/50 border-slate-800">
          <Bell className="w-12 h-12 mb-3 opacity-30"/><p>No notifications sent yet</p>
        </Card>
      :<div className="space-y-2">
        {(notifications as any[]).map((n:any)=>(
          <div key={n.id} className="flex items-start gap-4 p-4 rounded-lg border border-slate-800 bg-slate-900/50">
            <div className="p-2 rounded-lg bg-slate-800 flex-shrink-0">
              <Bell className="w-4 h-4 text-red-400"/>
            </div>
            <div className="flex-1 min-w-0">
              <div className="flex items-start justify-between gap-3">
                <div>
                  <p className="font-medium text-white text-sm">{n.title}</p>
                  <p className="text-xs text-slate-400 mt-0.5">{n.message}</p>
                  <div className="flex items-center gap-2 mt-1.5">
                    {n.companyId?<Badge className="bg-blue-900/30 text-blue-400 border-blue-900 text-xs"><Building2 className="w-3 h-3 mr-1"/>{n.companyName||`Company ${n.companyId}`}</Badge>:<Badge className="bg-slate-800 text-slate-400 border-slate-700 text-xs"><Users className="w-3 h-3 mr-1"/>All Companies</Badge>}
                    <Badge className="bg-slate-800 text-slate-400 border-slate-700 text-xs capitalize">{n.type}</Badge>
                  </div>
                </div>
                <span className="text-xs text-slate-600 whitespace-nowrap">{n.createdAt?format(new Date(n.createdAt),"dd MMM, HH:mm"):"—"}</span>
              </div>
            </div>
          </div>
        ))}
      </div>}

      <Dialog open={open} onOpenChange={setOpen}>
        <DialogContent className="max-w-md bg-slate-900 border-slate-700 text-white">
          <DialogHeader><DialogTitle className="text-white">Send Notification</DialogTitle></DialogHeader>
          <div className="grid gap-4 py-2">
            <div className="grid gap-2"><Label className="text-slate-300">Title *</Label><Input value={form.title} onChange={e=>setForm(f=>({...f,title:e.target.value}))} placeholder="Notification title" className="bg-slate-800 border-slate-700 text-white"/></div>
            <div className="grid gap-2"><Label className="text-slate-300">Message *</Label><Textarea value={form.message} onChange={e=>setForm(f=>({...f,message:e.target.value}))} placeholder="Notification message..." className="bg-slate-800 border-slate-700 text-white" rows={3}/></div>
            <div className="grid grid-cols-2 gap-3">
              <div className="grid gap-2"><Label className="text-slate-300">Type</Label>
                <Select value={form.type} onValueChange={v=>setForm(f=>({...f,type:v}))}><SelectTrigger className="bg-slate-800 border-slate-700 text-white"><SelectValue/></SelectTrigger>
                  <SelectContent className="bg-slate-800 border-slate-700"><SelectItem value="info" className="text-white">Info</SelectItem><SelectItem value="alert" className="text-white">Alert</SelectItem><SelectItem value="warning" className="text-white">Warning</SelectItem></SelectContent></Select>
              </div>
              <div className="grid gap-2"><Label className="text-slate-300">Target</Label>
                <Select value={form.targetType} onValueChange={v=>setForm(f=>({...f,targetType:v,companyId:""}))}>
                  <SelectTrigger className="bg-slate-800 border-slate-700 text-white"><SelectValue/></SelectTrigger>
                  <SelectContent className="bg-slate-800 border-slate-700"><SelectItem value="all" className="text-white">All Companies</SelectItem><SelectItem value="company" className="text-white">Specific Company</SelectItem></SelectContent>
                </Select>
              </div>
            </div>
            {form.targetType==="company"&&<div className="grid gap-2"><Label className="text-slate-300">Company *</Label>
              <Select value={form.companyId} onValueChange={v=>setForm(f=>({...f,companyId:v}))}><SelectTrigger className="bg-slate-800 border-slate-700 text-white"><SelectValue placeholder="Select company"/></SelectTrigger>
                <SelectContent className="bg-slate-800 border-slate-700">{(companies as any[]).map((c:any)=><SelectItem key={c.id} value={String(c.id)} className="text-white">{c.name}</SelectItem>)}</SelectContent></Select>
            </div>}
          </div>
          <DialogFooter>
            <Button variant="outline" className="border-slate-700 text-slate-300" onClick={()=>setOpen(false)}>Cancel</Button>
            <Button className="bg-red-700 hover:bg-red-600" onClick={()=>{if(!form.title||!form.message){toast({title:"Title and message required",variant:"destructive"});return;}send.mutate({title:form.title,message:form.message,type:form.type,companyId:form.targetType==="company"&&form.companyId?Number(form.companyId):undefined});}} disabled={send.isPending}>Send Notification</Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </div>
  );
}
