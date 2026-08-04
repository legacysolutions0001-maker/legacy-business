import { useState } from "react";
import { useMutation, useQueryClient } from "@tanstack/react-query";
import { apiFetch } from "../../lib/auth";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Button } from "@/components/ui/button";
import { Separator } from "@/components/ui/separator";
import { useToast } from "@/hooks/use-toast";
import { Shield, Database, RefreshCw, CheckCircle } from "lucide-react";

export default function SuperSettings() {
  const { toast } = useToast();
  const [passForm,setPassForm]=useState({currentPassword:"",newPassword:"",confirmPassword:""});
  const [seeding,setSeeding]=useState(false);

  const changePass = useMutation({
    mutationFn:async(d:any)=>{const r=await apiFetch("/auth/change-password",{method:"PATCH",body:JSON.stringify(d)});if(!r.ok){const e=await r.json().catch(()=>({}));throw new Error(e.error||"Failed to change password");}return r.json();},
    onSuccess:()=>{toast({title:"Password changed"});setPassForm({currentPassword:"",newPassword:"",confirmPassword:""});},
    onError:(err:any)=>toast({title:"Failed to change password",description:err.message,variant:"destructive"}),
  });

  const seed = async()=>{
    setSeeding(true);
    try{
      const r=await apiFetch("/seed/init",{method:"POST"});
      const d=await r.json();
      if(r.ok) toast({title:"Seed complete",description:d.message});
      else toast({title:"Seed failed",description:d.error,variant:"destructive"});
    }catch{toast({title:"Seed failed",variant:"destructive"});}
    setSeeding(false);
  };

  const setPF=(k:string)=>(e:React.ChangeEvent<HTMLInputElement>)=>setPassForm(f=>({...f,[k]:e.target.value}));

  return (
    <div className="space-y-5 max-w-2xl">
      <div><h1 className="text-2xl font-bold text-white">Super Admin Settings</h1><p className="text-slate-400 text-sm">Platform configuration and administration</p></div>

      <Card className="bg-slate-900/50 border-slate-800">
        <CardHeader><CardTitle className="text-white flex items-center gap-2"><Shield className="w-5 h-5 text-red-400"/>Change Admin Password</CardTitle><CardDescription className="text-slate-400">Update the super administrator password</CardDescription></CardHeader>
        <CardContent className="space-y-4">
          <div className="grid gap-2"><Label className="text-slate-300">Current Password</Label><Input type="password" value={passForm.currentPassword} onChange={setPF("currentPassword")} placeholder="Current password" className="bg-slate-800 border-slate-700 text-white"/></div>
          <div className="grid gap-2"><Label className="text-slate-300">New Password</Label><Input type="password" value={passForm.newPassword} onChange={setPF("newPassword")} placeholder="New password (min 8 chars)" className="bg-slate-800 border-slate-700 text-white"/></div>
          <div className="grid gap-2"><Label className="text-slate-300">Confirm Password</Label><Input type="password" value={passForm.confirmPassword} onChange={setPF("confirmPassword")} placeholder="Confirm new password" className="bg-slate-800 border-slate-700 text-white"/></div>
          <Button className="bg-red-700 hover:bg-red-600" onClick={()=>{if(!passForm.currentPassword||!passForm.newPassword){toast({title:"All fields required",variant:"destructive"});return;}if(passForm.newPassword!==passForm.confirmPassword){toast({title:"Passwords do not match",variant:"destructive"});return;}if(passForm.newPassword.length<8){toast({title:"Min 8 characters",variant:"destructive"});return;}changePass.mutate({currentPassword:passForm.currentPassword,newPassword:passForm.newPassword});}} disabled={changePass.isPending}><CheckCircle className="w-4 h-4 mr-2"/>Change Password</Button>
        </CardContent>
      </Card>

      <Card className="bg-slate-900/50 border-slate-800">
        <CardHeader><CardTitle className="text-white flex items-center gap-2"><Database className="w-5 h-5 text-blue-400"/>Database Management</CardTitle><CardDescription className="text-slate-400">Initialize database with seed data</CardDescription></CardHeader>
        <CardContent className="space-y-4">
          <div className="p-4 rounded-lg bg-yellow-900/20 border border-yellow-900/50">
            <p className="text-yellow-400 text-sm font-medium">⚠ Warning</p>
            <p className="text-yellow-400/70 text-xs mt-1">Running seed will create demo data. Use only in development/testing environments.</p>
          </div>
          <Button variant="outline" className="border-slate-700 text-slate-300 hover:bg-slate-800" onClick={seed} disabled={seeding}>
            <RefreshCw className={`w-4 h-4 mr-2 ${seeding?"animate-spin":""}`}/>
            {seeding?"Running Seed...":"Run Database Seed"}
          </Button>
        </CardContent>
      </Card>

      <Card className="bg-slate-900/50 border-slate-800">
        <CardHeader><CardTitle className="text-white">Platform Information</CardTitle></CardHeader>
        <CardContent className="space-y-2 text-sm">
          <div className="flex justify-between"><span className="text-slate-400">System Version</span><span className="text-white font-mono">Legacy Business ERP v1.0</span></div>
          <Separator className="bg-slate-800"/>
          <div className="flex justify-between"><span className="text-slate-400">Stack</span><span className="text-white">Node 24 · Express 5 · PostgreSQL · Drizzle ORM</span></div>
          <Separator className="bg-slate-800"/>
          <div className="flex justify-between"><span className="text-slate-400">Super Admin</span><span className="text-white font-mono">bhullar01</span></div>
        </CardContent>
      </Card>
    </div>
  );
}
