import { useState } from "react";
import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { apiFetch } from "../lib/auth";
import { useAuth } from "../contexts/AuthContext";
import { printSalarySlip } from "../lib/pdf";
import { exportSalaries } from "../lib/excel";
import { Card, CardContent } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogFooter } from "@/components/ui/dialog";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Badge } from "@/components/ui/badge";
import { DropdownMenu, DropdownMenuContent, DropdownMenuItem, DropdownMenuSeparator, DropdownMenuTrigger } from "@/components/ui/dropdown-menu";
import { Plus, Wallet, CheckCircle, FileDown, Printer, MoreHorizontal, Trash2 } from "lucide-react";
import { useToast } from "@/hooks/use-toast";

const MONTHS = ["January","February","March","April","May","June","July","August","September","October","November","December"];
const fmt = (n:number)=>`₹${new Intl.NumberFormat("en-IN",{maximumFractionDigits:0}).format(n)}`;

export default function Salary() {
  const qc = useQueryClient();
  const { toast } = useToast();
  const { company } = useAuth();
  const [open,setOpen]=useState(false);
  const now = new Date();
  const [form,setForm]=useState({
    employeeId:"" as any,
    month:String(now.getMonth()+1),
    year:String(now.getFullYear()),
    basicSalary:"",
    hra:"",
    allowances:"",
    advance:"0",
    deductions:"",
    bonus:"",
    overtime:"0",
    paymentMode:"bank",
    notes:"",
  });

  const { data: employees=[] } = useQuery({ queryKey:["employees"], queryFn:()=>apiFetch("/employees").then(r=>r.json()) });
  const { data: salaries=[], isLoading } = useQuery({ queryKey:["salaries"], queryFn:()=>apiFetch("/salary").then(r=>r.json()) });
  const { data: summary } = useQuery({ queryKey:["salary-summary"], queryFn:()=>apiFetch("/salary/summary").then(r=>r.json()) });

  const save = useMutation({
    mutationFn:(d:any)=>apiFetch("/salary",{method:"POST",body:JSON.stringify(d)}).then(r=>r.json()),
    onSuccess:()=>{qc.invalidateQueries({queryKey:["salaries"]});qc.invalidateQueries({queryKey:["salary-summary"]});setOpen(false);toast({title:"Salary record processed"});},
    onError:()=>toast({title:"Failed",variant:"destructive"}),
  });

  const markPaid = useMutation({
    mutationFn:(id:number)=>apiFetch(`/salary/${id}`,{method:"PATCH",body:JSON.stringify({status:"paid",paidAt:new Date().toISOString().split("T")[0]})}).then(r=>r.json()),
    onSuccess:()=>{qc.invalidateQueries({queryKey:["salaries"]});qc.invalidateQueries({queryKey:["salary-summary"]});toast({title:"Salary marked as paid"});},
  });
  const del = useMutation({
    mutationFn:(id:number)=>apiFetch(`/salary/${id}`,{method:"DELETE"}),
    onSuccess:()=>{qc.invalidateQueries({queryKey:["salaries"]});qc.invalidateQueries({queryKey:["salary-summary"]});toast({title:"Salary record deleted"});},
    onError:()=>toast({title:"Failed",variant:"destructive"}),
  });

  const basic = parseFloat(form.basicSalary||"0");
  const hra = parseFloat(form.hra||"0");
  const allowances = parseFloat(form.allowances||"0");
  const bonus = parseFloat(form.bonus||"0");
  const overtime = parseFloat(form.overtime||"0");
  const advance = parseFloat(form.advance||"0");
  const deductions = parseFloat(form.deductions||"0");
  const gross = basic + hra + allowances + bonus + overtime;
  const net = gross - advance - deductions;

  const empMap = Object.fromEntries((employees as any[]).map((e:any)=>[e.id, e]));

  const handleEmployeeSelect = (v: string) => {
    const emp = (employees as any[]).find((e:any)=>String(e.id)===v);
    const empBasic = Number(emp?.basicSalary || emp?.salary || 0);
    setForm(f=>({
      ...f,
      employeeId: Number(v),
      basicSalary: String(empBasic),
      hra: String(Math.round(empBasic * 0.4)),
      allowances: String(Math.round(empBasic * 0.1)),
      deductions: "0",
      advance: "0",
      bonus: "0",
      overtime: "0",
    }));
  };

  return (
    <div className="space-y-5">
      <div className="flex items-center justify-between">
        <div><h1 className="text-2xl font-bold">Salary Management</h1><p className="text-muted-foreground text-sm">Process and track employee salaries with HRA and allowances</p></div>
        <div className="flex gap-2">
          <Button variant="outline" size="sm" onClick={()=>exportSalaries(salaries as any[], employees as any[])}><FileDown className="w-4 h-4 mr-1"/>Export</Button>
          <Button onClick={()=>setOpen(true)}><Plus className="w-4 h-4 mr-2"/>Process Salary</Button>
        </div>
      </div>

      <div className="grid grid-cols-3 gap-3">
        {[
          {label:"This Month Paid",value:summary?.paidSalary??0,cls:"text-emerald-400"},
          {label:"Pending Salary",value:summary?.pendingSalary??0,cls:"text-orange-400"},
          {label:"Total This Month",value:summary?.totalSalary??0,cls:"text-blue-400"},
        ].map(s=>(
          <Card key={s.label} className="bg-card/50"><CardContent className="pt-4 pb-4">
            <p className="text-xs text-muted-foreground">{s.label}</p>
            <p className={`text-xl font-bold ${s.cls}`}>{fmt(s.value)}</p>
          </CardContent></Card>
        ))}
      </div>

      <Card>
        <Table>
          <TableHeader>
            <TableRow>
              <TableHead>Employee</TableHead>
              <TableHead>Period</TableHead>
              <TableHead className="text-right">Basic</TableHead>
              <TableHead className="text-right">HRA</TableHead>
              <TableHead className="text-right">Allowances</TableHead>
              <TableHead className="text-right">Gross</TableHead>
              <TableHead className="text-right">Deductions</TableHead>
              <TableHead className="text-right font-bold">Net Pay</TableHead>
              <TableHead>Mode</TableHead>
              <TableHead>Status</TableHead>
              <TableHead className="w-16"/>
            </TableRow>
          </TableHeader>
          <TableBody>
            {isLoading?<TableRow><TableCell colSpan={11} className="text-center py-8 text-muted-foreground">Loading...</TableCell></TableRow>
            :(salaries as any[]).length===0?<TableRow><TableCell colSpan={11} className="text-center py-12">
              <div className="flex flex-col items-center text-muted-foreground">
                <Wallet className="w-10 h-10 mb-2 opacity-30"/><p>No salary records</p>
                <Button variant="outline" size="sm" className="mt-3" onClick={()=>setOpen(true)}><Plus className="w-4 h-4 mr-1"/>Process Salary</Button>
              </div>
            </TableCell></TableRow>
            :(salaries as any[]).map((sal:any)=>{
              const emp = empMap[sal.employeeId] || { name: sal.employeeName, department: sal.department, position: sal.position };
              return (
                <TableRow key={sal.id} className="hover:bg-muted/40">
                  <TableCell>
                    <div className="font-medium">{emp?.name||sal.employeeName||`Emp #${sal.employeeId}`}</div>
                    <div className="text-xs text-muted-foreground">{emp?.department||sal.department||""}</div>
                  </TableCell>
                  <TableCell className="text-sm">{MONTHS[Number(sal.month)-1]} {sal.year}</TableCell>
                  <TableCell className="text-right text-sm">{fmt(Number(sal.basicSalary||sal.basic||0))}</TableCell>
                  <TableCell className="text-right text-sm">{fmt(Number(sal.hra||0))}</TableCell>
                  <TableCell className="text-right text-sm">{fmt(Number(sal.allowances||0))}</TableCell>
                  <TableCell className="text-right text-sm">{fmt(Number(sal.grossSalary||sal.gross||0))}</TableCell>
                  <TableCell className="text-right text-sm text-red-400">{fmt(Number(sal.deductions||0))}</TableCell>
                  <TableCell className="text-right font-bold text-emerald-400">{fmt(Number(sal.netSalary||sal.netPay||0))}</TableCell>
                  <TableCell><Badge variant="outline" className="capitalize text-xs">{sal.paymentMode||"bank"}</Badge></TableCell>
                  <TableCell>
                    {sal.status==="paid"
                      ?<Badge className="bg-emerald-500/15 text-emerald-400">Paid</Badge>
                      :<Badge className="bg-orange-500/15 text-orange-400 cursor-pointer" onClick={()=>markPaid.mutate(sal.id)}>Pending</Badge>
                    }
                  </TableCell>
                  <TableCell>
                    <DropdownMenu>
                      <DropdownMenuTrigger asChild><Button variant="ghost" size="icon" className="h-8 w-8"><MoreHorizontal className="h-4 w-4"/></Button></DropdownMenuTrigger>
                      <DropdownMenuContent align="end">
                        {sal.status!=="paid"&&<DropdownMenuItem onClick={()=>markPaid.mutate(sal.id)}><CheckCircle className="h-4 w-4 mr-2 text-emerald-400"/>Mark as Paid</DropdownMenuItem>}
                        <DropdownMenuItem onClick={()=>printSalarySlip({...sal,basic:sal.basicSalary||sal.basic,gross:sal.grossSalary||sal.gross,netPay:sal.netSalary||sal.netPay}, emp, company)}><Printer className="h-4 w-4 mr-2"/>Print Slip</DropdownMenuItem>
                        <DropdownMenuSeparator/>
                        <DropdownMenuItem className="text-destructive" onClick={()=>del.mutate(sal.id)}><Trash2 className="h-4 w-4 mr-2"/>Delete</DropdownMenuItem>
                      </DropdownMenuContent>
                    </DropdownMenu>
                  </TableCell>
                </TableRow>
              );
            })}
          </TableBody>
        </Table>
      </Card>

      <Dialog open={open} onOpenChange={setOpen}>
        <DialogContent className="max-w-lg">
          <DialogHeader><DialogTitle>Process Salary</DialogTitle></DialogHeader>
          <div className="grid gap-4 py-2">
            <div className="grid gap-2">
              <Label>Employee *</Label>
              <Select value={String(form.employeeId)} onValueChange={handleEmployeeSelect}>
                <SelectTrigger><SelectValue placeholder="Select employee"/></SelectTrigger>
                <SelectContent>{(employees as any[]).map((e:any)=><SelectItem key={e.id} value={String(e.id)}>{e.name} — {e.department}</SelectItem>)}</SelectContent>
              </Select>
            </div>
            <div className="grid grid-cols-2 gap-3">
              <div className="grid gap-2">
                <Label>Month</Label>
                <Select value={form.month} onValueChange={v=>setForm(f=>({...f,month:v}))}>
                  <SelectTrigger><SelectValue/></SelectTrigger>
                  <SelectContent>{MONTHS.map((m,i)=><SelectItem key={i+1} value={String(i+1)}>{m}</SelectItem>)}</SelectContent>
                </Select>
              </div>
              <div className="grid gap-2"><Label>Year</Label><Input type="number" value={form.year} onChange={e=>setForm(f=>({...f,year:e.target.value}))}/></div>
            </div>
            <div className="grid grid-cols-2 gap-3">
              <div className="grid gap-2"><Label>Basic Salary (₹)</Label><Input type="number" min="0" value={form.basicSalary} onChange={e=>setForm(f=>({...f,basicSalary:e.target.value}))}/></div>
              <div className="grid gap-2"><Label>HRA (₹)</Label><Input type="number" min="0" value={form.hra} onChange={e=>setForm(f=>({...f,hra:e.target.value}))}/></div>
              <div className="grid gap-2"><Label>Allowances (₹)</Label><Input type="number" min="0" value={form.allowances} onChange={e=>setForm(f=>({...f,allowances:e.target.value}))}/></div>
              <div className="grid gap-2"><Label>Bonus (₹)</Label><Input type="number" min="0" value={form.bonus} onChange={e=>setForm(f=>({...f,bonus:e.target.value}))}/></div>
              <div className="grid gap-2"><Label>Overtime (₹)</Label><Input type="number" min="0" value={form.overtime} onChange={e=>setForm(f=>({...f,overtime:e.target.value}))}/></div>
              <div className="grid gap-2"><Label>Advance (₹)</Label><Input type="number" min="0" value={form.advance} onChange={e=>setForm(f=>({...f,advance:e.target.value}))}/></div>
              <div className="grid gap-2"><Label>Deductions (₹)</Label><Input type="number" min="0" value={form.deductions} onChange={e=>setForm(f=>({...f,deductions:e.target.value}))}/></div>
              <div className="grid gap-2">
                <Label>Payment Mode</Label>
                <Select value={form.paymentMode} onValueChange={v=>setForm(f=>({...f,paymentMode:v}))}>
                  <SelectTrigger><SelectValue/></SelectTrigger>
                  <SelectContent>
                    <SelectItem value="bank">Bank Transfer</SelectItem>
                    <SelectItem value="cash">Cash</SelectItem>
                    <SelectItem value="upi">UPI</SelectItem>
                    <SelectItem value="cheque">Cheque</SelectItem>
                  </SelectContent>
                </Select>
              </div>
            </div>
            <div className="rounded-xl border bg-muted/20 p-3 grid grid-cols-3 gap-2">
              <div className="text-center"><p className="text-xs text-muted-foreground">Gross Pay</p><p className="font-semibold text-sm">{fmt(gross)}</p></div>
              <div className="text-center"><p className="text-xs text-muted-foreground">Deductions</p><p className="font-semibold text-sm text-red-400">−{fmt(advance+deductions)}</p></div>
              <div className="text-center"><p className="text-xs text-muted-foreground">Net Pay</p><p className="font-bold text-lg text-emerald-400">{fmt(Math.max(0,net))}</p></div>
            </div>
            <div className="grid gap-2"><Label>Notes</Label><Input placeholder="Notes..." value={form.notes} onChange={e=>setForm(f=>({...f,notes:e.target.value}))}/></div>
          </div>
          <DialogFooter>
            <Button variant="outline" onClick={()=>setOpen(false)}>Cancel</Button>
            <Button onClick={()=>save.mutate({...form,status:"paid",paidAt:new Date().toISOString().split("T")[0]})} disabled={save.isPending||!form.employeeId}>
              Process & Mark Paid
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </div>
  );
}
