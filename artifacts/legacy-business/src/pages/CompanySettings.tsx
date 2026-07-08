import { useState, useEffect } from "react";
import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { apiFetch } from "../lib/auth";
import { useAuth } from "../contexts/AuthContext";
import { useTheme } from "@/components/ThemeProvider";
import { useToast } from "@/hooks/use-toast";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Button } from "@/components/ui/button";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Separator } from "@/components/ui/separator";
import { Avatar, AvatarFallback } from "@/components/ui/avatar";
import { Building2, User, Palette, Shield, LogOut, Moon, Sun, CheckCircle, FileText } from "lucide-react";
import { useLocation } from "wouter";

const GST_RATES = ["0","5","12","18","28"];

export default function CompanySettings() {
  const [,setLocation]=useLocation();
  const { user, company, logout } = useAuth();
  const { theme, setTheme } = useTheme();
  const { toast } = useToast();
  const qc = useQueryClient();

  const { data: settings } = useQuery({ queryKey:["settings"], queryFn:()=>apiFetch("/settings").then(r=>r.json()) });

  const [companyForm,setCompanyForm]=useState({ name:"",address:"",city:"",state:"",pincode:"",country:"India",gstNumber:"",panNumber:"",mobile:"",email:"",website:"" });
  const [invoiceForm,setInvoiceForm]=useState({ defaultGst:"18",paymentTerms:"30",invoicePrefix:"INV",nextNumber:"1",notes:"Thank you for your business!" });
  const [passForm,setPassForm]=useState({ currentPassword:"",newPassword:"",confirmPassword:"" });

  useEffect(()=>{
    if(settings){
      if(settings.company) setCompanyForm(f=>({...f,...settings.company}));
      if(settings.invoice) setInvoiceForm(f=>({...f,...settings.invoice}));
    }
  },[settings]);

  const saveCompany = useMutation({
    mutationFn:(d:any)=>apiFetch("/settings/company",{method:"PATCH",body:JSON.stringify(d)}).then(r=>r.json()),
    onSuccess:()=>{qc.invalidateQueries({queryKey:["settings"]});toast({title:"Company settings saved"});},
    onError:()=>toast({title:"Failed",variant:"destructive"}),
  });
  const saveInvoice = useMutation({
    mutationFn:(d:any)=>apiFetch("/settings/invoice",{method:"PATCH",body:JSON.stringify(d)}).then(r=>r.json()),
    onSuccess:()=>toast({title:"Invoice defaults saved"}),
    onError:()=>toast({title:"Failed",variant:"destructive"}),
  });
  const changePass = useMutation({
    mutationFn:(d:any)=>apiFetch("/auth/change-password",{method:"PATCH",body:JSON.stringify(d)}).then(r=>{if(!r.ok)throw new Error("Failed");return r.json();}),
    onSuccess:()=>{toast({title:"Password changed successfully"});setPassForm({currentPassword:"",newPassword:"",confirmPassword:""}); },
    onError:()=>toast({title:"Failed to change password",variant:"destructive"}),
  });

  const setCF=(k:string)=>(e:React.ChangeEvent<HTMLInputElement>)=>setCompanyForm(f=>({...f,[k]:e.target.value}));
  const setIF=(k:string)=>(e:React.ChangeEvent<HTMLInputElement>)=>setInvoiceForm(f=>({...f,[k]:e.target.value}));
  const setPF=(k:string)=>(e:React.ChangeEvent<HTMLInputElement>)=>setPassForm(f=>({...f,[k]:e.target.value}));

  const handleLogout=async()=>{ await logout(); setLocation("/login"); };

  return (
    <div className="space-y-5 max-w-4xl">
      <div><h1 className="text-2xl font-bold">Settings</h1><p className="text-muted-foreground text-sm">Manage company, invoice, and account settings</p></div>

      <Tabs defaultValue="company">
        <TabsList className="flex-wrap h-auto gap-1 p-1">
          <TabsTrigger value="company" className="gap-1.5"><Building2 className="w-3.5 h-3.5"/>Company</TabsTrigger>
          <TabsTrigger value="invoicing" className="gap-1.5"><FileText className="w-3.5 h-3.5"/>Invoicing</TabsTrigger>
          <TabsTrigger value="profile" className="gap-1.5"><User className="w-3.5 h-3.5"/>Profile</TabsTrigger>
          <TabsTrigger value="appearance" className="gap-1.5"><Palette className="w-3.5 h-3.5"/>Appearance</TabsTrigger>
          <TabsTrigger value="security" className="gap-1.5"><Shield className="w-3.5 h-3.5"/>Security</TabsTrigger>
        </TabsList>

        <TabsContent value="company" className="mt-4">
          <Card>
            <CardHeader><CardTitle>Company Information</CardTitle><CardDescription>Details that appear on invoices and documents</CardDescription></CardHeader>
            <CardContent className="space-y-4">
              <div className="grid gap-2"><Label>Company Name</Label><Input value={companyForm.name} onChange={setCF("name")} placeholder="Your company name"/></div>
              <div className="grid grid-cols-2 gap-3">
                <div className="grid gap-2"><Label>GST Number</Label><Input value={companyForm.gstNumber} onChange={setCF("gstNumber")} placeholder="29AABCT1332L1ZN" className="font-mono uppercase"/></div>
                <div className="grid gap-2"><Label>PAN Number</Label><Input value={companyForm.panNumber} onChange={setCF("panNumber")} placeholder="AABCT1332L" className="font-mono uppercase"/></div>
              </div>
              <div className="grid gap-2"><Label>Address</Label><Input value={companyForm.address} onChange={setCF("address")} placeholder="Street address"/></div>
              <div className="grid grid-cols-3 gap-3">
                <div className="grid gap-2"><Label>City</Label><Input value={companyForm.city} onChange={setCF("city")} placeholder="Mumbai"/></div>
                <div className="grid gap-2"><Label>State</Label><Input value={companyForm.state} onChange={setCF("state")} placeholder="Maharashtra"/></div>
                <div className="grid gap-2"><Label>Pincode</Label><Input value={companyForm.pincode} onChange={setCF("pincode")} placeholder="400001"/></div>
              </div>
              <div className="grid grid-cols-2 gap-3">
                <div className="grid gap-2"><Label>Mobile</Label><Input value={companyForm.mobile} onChange={setCF("mobile")} placeholder="+91 9876543210"/></div>
                <div className="grid gap-2"><Label>Email</Label><Input value={companyForm.email} onChange={setCF("email")} placeholder="company@email.com"/></div>
              </div>
              <div className="flex justify-end"><Button onClick={()=>saveCompany.mutate(companyForm)} disabled={saveCompany.isPending}><CheckCircle className="w-4 h-4 mr-2"/>Save Company Details</Button></div>
            </CardContent>
          </Card>
        </TabsContent>

        <TabsContent value="invoicing" className="mt-4">
          <Card>
            <CardHeader><CardTitle>Invoice Defaults</CardTitle><CardDescription>Pre-filled values for new invoices</CardDescription></CardHeader>
            <CardContent className="space-y-4">
              <div className="grid grid-cols-2 gap-3">
                <div className="grid gap-2"><Label>Invoice Prefix</Label><Input value={invoiceForm.invoicePrefix} onChange={setIF("invoicePrefix")} placeholder="INV"/></div>
                <div className="grid gap-2"><Label>Next Number</Label><Input type="number" value={invoiceForm.nextNumber} onChange={setIF("nextNumber")} placeholder="1"/></div>
              </div>
              <div className="grid grid-cols-2 gap-3">
                <div className="grid gap-2"><Label>Default GST Rate (%)</Label>
                  <div className="flex gap-2 flex-wrap">{GST_RATES.map(r=><button key={r} type="button" onClick={()=>setInvoiceForm(f=>({...f,defaultGst:r}))} className={`px-3 py-1.5 rounded-lg border text-sm font-medium transition-all ${invoiceForm.defaultGst===r?"border-primary bg-primary/10 text-primary":"border-border hover:border-primary/40"}`}>{r}%</button>)}</div>
                </div>
                <div className="grid gap-2"><Label>Payment Terms (days)</Label>
                  <div className="flex gap-2">{["7","15","30","60"].map(d=><button key={d} type="button" onClick={()=>setInvoiceForm(f=>({...f,paymentTerms:d}))} className={`px-3 py-1.5 rounded-lg border text-sm font-medium transition-all flex-1 ${invoiceForm.paymentTerms===d?"border-primary bg-primary/10 text-primary":"border-border hover:border-primary/40"}`}>{d}</button>)}</div>
                </div>
              </div>
              <div className="grid gap-2"><Label>Default Invoice Notes</Label><Input value={invoiceForm.notes} onChange={setIF("notes")} placeholder="Thank you for your business!"/></div>
              <div className="flex justify-end"><Button onClick={()=>saveInvoice.mutate(invoiceForm)} disabled={saveInvoice.isPending}><CheckCircle className="w-4 h-4 mr-2"/>Save Invoice Defaults</Button></div>
            </CardContent>
          </Card>
        </TabsContent>

        <TabsContent value="profile" className="mt-4">
          <Card>
            <CardHeader><CardTitle>Profile</CardTitle><CardDescription>Your account information</CardDescription></CardHeader>
            <CardContent className="space-y-4">
              <div className="flex items-center gap-4">
                <Avatar className="h-16 w-16"><AvatarFallback className="text-xl font-bold">{user?.name?.charAt(0)||"U"}</AvatarFallback></Avatar>
                <div><p className="font-semibold text-lg">{user?.name}</p><p className="text-muted-foreground text-sm">@{user?.username}</p><p className="text-muted-foreground text-xs capitalize mt-1">{user?.role} · {company?.name}</p></div>
              </div>
              <Separator/>
              <div className="grid grid-cols-2 gap-3">
                <div className="grid gap-2"><Label>Name</Label><Input defaultValue={user?.name||""} disabled className="bg-muted/40"/></div>
                <div className="grid gap-2"><Label>Username</Label><Input defaultValue={user?.username||""} disabled className="bg-muted/40"/></div>
                <div className="grid gap-2"><Label>Email</Label><Input defaultValue={user?.email||""} disabled className="bg-muted/40"/></div>
                <div className="grid gap-2"><Label>Role</Label><Input defaultValue={user?.role||""} disabled className="bg-muted/40 capitalize"/></div>
              </div>
              <Separator/>
              <div className="flex items-center justify-between p-4 rounded-xl border border-destructive/30 bg-destructive/5">
                <div><p className="font-medium text-sm">Sign Out</p><p className="text-xs text-muted-foreground">Sign out from all sessions</p></div>
                <Button variant="destructive" size="sm" onClick={handleLogout}><LogOut className="w-4 h-4 mr-2"/>Sign Out</Button>
              </div>
            </CardContent>
          </Card>
        </TabsContent>

        <TabsContent value="appearance" className="mt-4">
          <Card>
            <CardHeader><CardTitle>Appearance</CardTitle><CardDescription>Customize the look of your ERP</CardDescription></CardHeader>
            <CardContent className="space-y-4">
              <div className="grid grid-cols-2 gap-3">
                {[{id:"light",label:"Light Mode",bg:"bg-white",text:"text-zinc-800"},{id:"dark",label:"Dark Mode",bg:"bg-zinc-900",text:"text-zinc-100"}].map(opt=>(
                  <div key={opt.id} onClick={()=>setTheme(opt.id as "light"|"dark")} className={`cursor-pointer rounded-xl overflow-hidden border-2 transition-all ${theme===opt.id?"border-primary ring-2 ring-primary/20":"border-border hover:border-primary/50"}`}>
                    <div className={`${opt.bg} h-20 flex items-center justify-center`}>
                      <div className={`${opt.text} font-semibold text-sm flex items-center gap-2`}>
                        {opt.id==="dark"?<Moon className="w-4 h-4"/>:<Sun className="w-4 h-4"/>}{opt.label}
                      </div>
                    </div>
                  </div>
                ))}
              </div>
            </CardContent>
          </Card>
        </TabsContent>

        <TabsContent value="security" className="mt-4">
          <Card>
            <CardHeader><CardTitle>Change Password</CardTitle><CardDescription>Update your account password</CardDescription></CardHeader>
            <CardContent className="space-y-4">
              <div className="grid gap-2"><Label>Current Password</Label><Input type="password" value={passForm.currentPassword} onChange={setPF("currentPassword")} placeholder="Enter current password"/></div>
              <div className="grid gap-2"><Label>New Password</Label><Input type="password" value={passForm.newPassword} onChange={setPF("newPassword")} placeholder="Enter new password (min 8 chars)"/></div>
              <div className="grid gap-2"><Label>Confirm New Password</Label><Input type="password" value={passForm.confirmPassword} onChange={setPF("confirmPassword")} placeholder="Confirm new password"/></div>
              <Button onClick={()=>{if(!passForm.currentPassword||!passForm.newPassword){toast({title:"All fields required",variant:"destructive"});return;}if(passForm.newPassword!==passForm.confirmPassword){toast({title:"Passwords do not match",variant:"destructive"});return;}if(passForm.newPassword.length<8){toast({title:"Password must be at least 8 characters",variant:"destructive"});return;}changePass.mutate({currentPassword:passForm.currentPassword,newPassword:passForm.newPassword});}} disabled={changePass.isPending}><Shield className="w-4 h-4 mr-2"/>Change Password</Button>
            </CardContent>
          </Card>
        </TabsContent>
      </Tabs>
    </div>
  );
}
