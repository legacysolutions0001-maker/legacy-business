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
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { Badge } from "@/components/ui/badge";
import { Plus, Search, Trash2, Edit, Banknote, Landmark, TrendingUp, TrendingDown, Printer } from "lucide-react";
import { useToast } from "@/hooks/use-toast";

const fmt = (n: number) => new Intl.NumberFormat("en-IN",{maximumFractionDigits:0}).format(n);
const EMPTY_FORM = { ledgerType:"cash", entryType:"credit", amount:"", description:"", reference:"", entryDate:new Date().toISOString().split("T")[0], paymentMethod:"", bankName:"", accountNumber:"", chequeNumber:"", transactionId:"" };

export default function CashBank() {
  const qc = useQueryClient();
  const { toast } = useToast();
  const [activeTab,setActiveTab]=useState("cash");
  const [open,setOpen]=useState(false);
  const [editing,setEditing]=useState<any>(null);
  const [form,setForm]=useState({...EMPTY_FORM});
  const [search,setSearch]=useState("");
  const [dateFrom,setDateFrom]=useState("");
  const [dateTo,setDateTo]=useState("");

  const { data:summary } = useQuery({ queryKey:["cash-bank-summary"], queryFn:()=>apiFetch("/cash-bank/summary").then(r=>r.json()) });
  const { data:entries=[], isLoading } = useQuery({
    queryKey:["cash-bank",activeTab,dateFrom,dateTo],
    queryFn:()=>{
      let url=`/cash-bank?type=${activeTab}`;
      if(dateFrom) url+=`&from=${dateFrom}`;
      if(dateTo) url+=`&to=${dateTo}`;
      return apiFetch(url).then(r=>r.json());
    },
  });

  const save = useMutation({
    mutationFn:(d:any)=>editing
      ?apiFetch(`/cash-bank/${editing.id}`,{method:"PATCH",body:JSON.stringify(d)}).then(r=>r.json())
      :apiFetch("/cash-bank",{method:"POST",body:JSON.stringify(d)}).then(r=>r.json()),
    onSuccess:()=>{
      qc.invalidateQueries({queryKey:["cash-bank"]});
      qc.invalidateQueries({queryKey:["cash-bank-summary"]});
      setOpen(false);
      setEditing(null);
      setForm({...EMPTY_FORM});
      toast({title:editing?"Entry updated":"Entry added"});
    },
    onError:()=>toast({title:"Failed",variant:"destructive"}),
  });

  const del = useMutation({
    mutationFn:(id:number)=>apiFetch(`/cash-bank/${id}`,{method:"DELETE"}),
    onSuccess:()=>{qc.invalidateQueries({queryKey:["cash-bank"]});qc.invalidateQueries({queryKey:["cash-bank-summary"]});toast({title:"Entry deleted"});},
  });

  const openCreate=()=>{
    setEditing(null);
    setForm({...EMPTY_FORM,ledgerType:activeTab});
    setOpen(true);
  };
  const openEdit=(e:any)=>{
    setEditing(e);
    setForm({ledgerType:e.ledgerType,entryType:e.entryType,amount:String(e.amount||""),description:e.description||"",reference:e.reference||"",entryDate:e.entryDate||"",paymentMethod:e.paymentMethod||"",bankName:e.bankName||"",accountNumber:e.accountNumber||"",chequeNumber:e.chequeNumber||"",transactionId:e.transactionId||""});
    setOpen(true);
  };

  const handleSave=()=>{
    if(!form.description||!form.amount){toast({title:"Description and amount required",variant:"destructive"});return;}
    save.mutate(form);
  };

  const handlePrint=()=>{
    const rows=(entries as any[]);
    const balance = activeTab==="cash" ? (summary?.cashBalance??0) : (summary?.bankBalance??0);
    const html=`<!DOCTYPE html><html><head><meta charset="UTF-8"/><title>${activeTab==="cash"?"Cash":"Bank"} Ledger</title>
<style>*{margin:0;padding:0;box-sizing:border-box}body{font-family:Arial,sans-serif;font-size:12px;color:#111}
.page{max-width:210mm;margin:0 auto;padding:15mm}.header{border-bottom:2px solid #1a1a2e;padding-bottom:12px;margin-bottom:16px;text-align:center}
h1{font-size:20px;color:#1a1a2e}table{width:100%;border-collapse:collapse;margin-top:12px}
th{background:#1a1a2e;color:#fff;padding:8px;text-align:left;font-size:11px}td{padding:7px 8px;border-bottom:1px solid #eee;font-size:11px}
.credit{color:#059669}.debit{color:#dc2626}.total{font-weight:bold;font-size:14px;margin-top:12px;text-align:right}
@media print{body{print-color-adjust:exact;-webkit-print-color-adjust:exact}}</style></head><body><div class="page">
<div class="header"><h1>${activeTab==="cash"?"Cash":"Bank"} Ledger</h1><p>Generated: ${new Date().toLocaleDateString("en-IN")}</p></div>
<table><thead><tr><th>Date</th><th>Description</th><th>Reference</th><th>Type</th><th style="text-align:right">Amount</th><th style="text-align:right">Balance</th></tr></thead><tbody>
${rows.map(r=>`<tr><td>${r.entryDate||""}</td><td>${r.description}</td><td>${r.reference||"—"}</td><td class="${r.entryType}">${r.entryType.toUpperCase()}</td><td style="text-align:right" class="${r.entryType}">₹${fmt(Number(r.amount||0))}</td><td style="text-align:right">₹${fmt(Number(r.balance||0))}</td></tr>`).join("")}
</tbody></table><div class="total">Current Balance: ₹${fmt(balance)}</div></div>
<script>window.onload=function(){window.print();}</script></body></html>`;
    const w=window.open("","_blank");
    if(w){w.document.write(html);w.document.close();}
  };

  const filtered=(entries as any[]).filter((e:any)=>e.description?.toLowerCase().includes(search.toLowerCase())||(e.reference??"").toLowerCase().includes(search.toLowerCase()));

  const runBalance = (() => {
    let bal=0;
    return filtered.map((e:any) => {
      if(e.entryType==="credit") bal+=Number(e.amount||0);
      else bal-=Number(e.amount||0);
      return { ...e, runBal: bal };
    });
  })();

  return (
    <div className="space-y-5">
      <div className="flex items-center justify-between flex-wrap gap-3">
        <div><h1 className="text-2xl font-bold">Cash & Bank Ledger</h1><p className="text-muted-foreground text-sm">Track all cash and bank transactions</p></div>
        <div className="flex gap-2">
          <Button variant="outline" size="sm" onClick={handlePrint}><Printer className="w-4 h-4 mr-1"/>Print Ledger</Button>
          <Button onClick={openCreate}><Plus className="w-4 h-4 mr-2"/>Add Entry</Button>
        </div>
      </div>

      <div className="grid grid-cols-2 md:grid-cols-4 gap-3">
        <Card className="bg-card/50"><CardHeader className="flex flex-row items-center justify-between pb-1 pt-3 px-4"><CardTitle className="text-xs text-muted-foreground">Cash Balance</CardTitle><Banknote className="w-4 h-4 text-emerald-400"/></CardHeader><CardContent className="pb-3 px-4"><div className={`text-xl font-bold ${(summary?.cashBalance??0)>=0?"text-emerald-400":"text-red-400"}`}>₹{fmt(summary?.cashBalance??0)}</div></CardContent></Card>
        <Card className="bg-card/50"><CardHeader className="flex flex-row items-center justify-between pb-1 pt-3 px-4"><CardTitle className="text-xs text-muted-foreground">Bank Balance</CardTitle><Landmark className="w-4 h-4 text-blue-400"/></CardHeader><CardContent className="pb-3 px-4"><div className={`text-xl font-bold ${(summary?.bankBalance??0)>=0?"text-blue-400":"text-red-400"}`}>₹{fmt(summary?.bankBalance??0)}</div></CardContent></Card>
        <Card className="bg-card/50"><CardHeader className="flex flex-row items-center justify-between pb-1 pt-3 px-4"><CardTitle className="text-xs text-muted-foreground">Total In</CardTitle><TrendingUp className="w-4 h-4 text-emerald-400"/></CardHeader><CardContent className="pb-3 px-4"><div className="text-xl font-bold text-emerald-400">₹{fmt((summary?.cashIn??0)+(summary?.bankIn??0))}</div></CardContent></Card>
        <Card className="bg-card/50"><CardHeader className="flex flex-row items-center justify-between pb-1 pt-3 px-4"><CardTitle className="text-xs text-muted-foreground">Total Out</CardTitle><TrendingDown className="w-4 h-4 text-red-400"/></CardHeader><CardContent className="pb-3 px-4"><div className="text-xl font-bold text-red-400">₹{fmt((summary?.cashOut??0)+(summary?.bankOut??0))}</div></CardContent></Card>
      </div>

      <Tabs value={activeTab} onValueChange={setActiveTab}>
        <TabsList>
          <TabsTrigger value="cash"><Banknote className="w-4 h-4 mr-1"/>Cash Ledger</TabsTrigger>
          <TabsTrigger value="bank"><Landmark className="w-4 h-4 mr-1"/>Bank Ledger</TabsTrigger>
          <TabsTrigger value="all">All Entries</TabsTrigger>
        </TabsList>

        {["cash","bank","all"].map(tab=>(
          <TabsContent key={tab} value={tab}>
            <div className="flex gap-3 mb-3 flex-wrap">
              <div className="relative flex-1 max-w-sm"><Search className="absolute left-2.5 top-2.5 h-4 w-4 text-muted-foreground"/><Input placeholder="Search entries..." className="pl-9" value={search} onChange={e=>setSearch(e.target.value)}/></div>
              <Input type="date" className="w-36" value={dateFrom} onChange={e=>setDateFrom(e.target.value)} placeholder="From"/>
              <Input type="date" className="w-36" value={dateTo} onChange={e=>setDateTo(e.target.value)} placeholder="To"/>
              {(dateFrom||dateTo)&&<Button variant="ghost" size="sm" onClick={()=>{setDateFrom("");setDateTo("");}}>Clear</Button>}
            </div>
            <Card>
              <Table>
                <TableHeader><TableRow><TableHead>Date</TableHead><TableHead>Description</TableHead><TableHead>Reference</TableHead><TableHead>Type</TableHead>{tab==="all"&&<TableHead>Ledger</TableHead>}<TableHead className="text-right">Amount</TableHead><TableHead className="w-8"/></TableRow></TableHeader>
                <TableBody>
                  {isLoading?<TableRow><TableCell colSpan={6} className="text-center py-8">Loading...</TableCell></TableRow>
                  :runBalance.length===0?<TableRow><TableCell colSpan={6} className="text-center py-12 text-muted-foreground"><Banknote className="w-10 h-10 mx-auto mb-2 opacity-30"/><p>No entries found</p><Button variant="outline" size="sm" className="mt-3" onClick={openCreate}><Plus className="w-4 h-4 mr-1"/>Add Entry</Button></TableCell></TableRow>
                  :runBalance.map((e:any)=>(
                    <TableRow key={e.id}>
                      <TableCell className="text-sm text-muted-foreground">{e.entryDate}</TableCell>
                      <TableCell className="font-medium">{e.description}</TableCell>
                      <TableCell className="text-muted-foreground text-sm">{e.reference||"—"}</TableCell>
                      <TableCell>{e.entryType==="credit"?<Badge className="bg-emerald-500/15 text-emerald-400 text-xs">Credit</Badge>:<Badge className="bg-red-500/15 text-red-400 text-xs">Debit</Badge>}</TableCell>
                      {tab==="all"&&<TableCell><Badge variant="outline" className="text-xs capitalize">{e.ledgerType}</Badge></TableCell>}
                      <TableCell className={`text-right font-semibold ${e.entryType==="credit"?"text-emerald-400":"text-red-400"}`}>
                        {e.entryType==="credit"?"+":"-"}₹{fmt(Number(e.amount||0))}
                      </TableCell>
                      <TableCell>
                        <div className="flex gap-1">
                          <Button variant="ghost" size="icon" className="h-8 w-8" onClick={()=>openEdit(e)}><Edit className="h-3 w-3"/></Button>
                          <Button variant="ghost" size="icon" className="h-8 w-8 text-muted-foreground hover:text-destructive" onClick={()=>del.mutate(e.id)}><Trash2 className="h-3 w-3"/></Button>
                        </div>
                      </TableCell>
                    </TableRow>
                  ))}
                </TableBody>
              </Table>
            </Card>
          </TabsContent>
        ))}
      </Tabs>

      <Dialog open={open} onOpenChange={v=>{setOpen(v);if(!v){setEditing(null);setForm({...EMPTY_FORM});}}}>
        <DialogContent className="max-w-lg">
          <DialogHeader><DialogTitle>{editing?"Edit Entry":"Add Cash/Bank Entry"}</DialogTitle></DialogHeader>
          <div className="grid gap-3">
            <div className="grid grid-cols-2 gap-3">
              <div className="grid gap-2">
                <Label>Ledger Type</Label>
                <Select value={form.ledgerType} onValueChange={v=>setForm(f=>({...f,ledgerType:v}))}>
                  <SelectTrigger><SelectValue/></SelectTrigger>
                  <SelectContent><SelectItem value="cash">Cash</SelectItem><SelectItem value="bank">Bank</SelectItem></SelectContent>
                </Select>
              </div>
              <div className="grid gap-2">
                <Label>Entry Type</Label>
                <Select value={form.entryType} onValueChange={v=>setForm(f=>({...f,entryType:v}))}>
                  <SelectTrigger><SelectValue/></SelectTrigger>
                  <SelectContent><SelectItem value="credit">Credit (Money In)</SelectItem><SelectItem value="debit">Debit (Money Out)</SelectItem></SelectContent>
                </Select>
              </div>
            </div>
            <div className="grid grid-cols-2 gap-3">
              <div className="grid gap-2"><Label>Amount (₹)</Label><Input type="number" min="0" step="0.01" value={form.amount} onChange={e=>setForm(f=>({...f,amount:e.target.value}))} placeholder="0.00"/></div>
              <div className="grid gap-2"><Label>Entry Date</Label><Input type="date" value={form.entryDate} onChange={e=>setForm(f=>({...f,entryDate:e.target.value}))}/></div>
            </div>
            <div className="grid gap-2"><Label>Description *</Label><Input value={form.description} onChange={e=>setForm(f=>({...f,description:e.target.value}))} placeholder="e.g. Cash Sales, Rent Payment, Bank Deposit"/></div>
            <div className="grid grid-cols-2 gap-3">
              <div className="grid gap-2"><Label>Reference</Label><Input value={form.reference} onChange={e=>setForm(f=>({...f,reference:e.target.value}))} placeholder="Invoice no, bill no..."/></div>
              <div className="grid gap-2">
                <Label>Payment Method</Label>
                <Select value={form.paymentMethod||"none"} onValueChange={v=>setForm(f=>({...f,paymentMethod:v==="none"?"":v}))}>
                  <SelectTrigger><SelectValue placeholder="Select"/></SelectTrigger>
                  <SelectContent><SelectItem value="none">—</SelectItem><SelectItem value="cash">Cash</SelectItem><SelectItem value="upi">UPI</SelectItem><SelectItem value="cheque">Cheque</SelectItem><SelectItem value="neft">NEFT/RTGS</SelectItem><SelectItem value="imps">IMPS</SelectItem></SelectContent>
                </Select>
              </div>
            </div>
            {form.ledgerType==="bank"&&(
              <div className="grid grid-cols-2 gap-3">
                <div className="grid gap-2"><Label>Bank Name</Label><Input value={form.bankName} onChange={e=>setForm(f=>({...f,bankName:e.target.value}))} placeholder="HDFC, SBI..."/></div>
                <div className="grid gap-2"><Label>Cheque / Txn No.</Label><Input value={form.chequeNumber||form.transactionId} onChange={e=>setForm(f=>({...f,chequeNumber:e.target.value,transactionId:e.target.value}))} placeholder="Cheque or UTR number"/></div>
              </div>
            )}
          </div>
          <DialogFooter>
            <Button variant="outline" onClick={()=>{setOpen(false);setEditing(null);setForm({...EMPTY_FORM});}}>Cancel</Button>
            <Button onClick={handleSave} disabled={save.isPending}>{editing?"Update":"Add Entry"}</Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </div>
  );
}
