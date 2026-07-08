import { useState } from "react";
import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { apiFetch } from "../lib/auth";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogFooter } from "@/components/ui/dialog";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";
import { Badge } from "@/components/ui/badge";
import { Avatar, AvatarFallback } from "@/components/ui/avatar";
import { DropdownMenu, DropdownMenuContent, DropdownMenuItem, DropdownMenuSeparator, DropdownMenuTrigger } from "@/components/ui/dropdown-menu";
import { Plus, Search, Users, UserCheck, UserMinus, MoreHorizontal, Edit, Trash2, Calendar } from "lucide-react";
import { useToast } from "@/hooks/use-toast";
import { format } from "date-fns";

const EMPTY_EMP = { name:"", email:"", phone:"", position:"", department:"", status:"active", hireDate:format(new Date(),"yyyy-MM-dd"), salary:"" };
const EMPTY_ATT = { employeeId:"" as any, date:format(new Date(),"yyyy-MM-dd"), status:"present", checkIn:"", checkOut:"" };

export default function HR() {
  const qc = useQueryClient();
  const { toast } = useToast();
  const [search,setSearch]=useState("");
  const [empOpen,setEmpOpen]=useState(false);
  const [editEmp,setEditEmp]=useState<any>(null);
  const [empForm,setEmpForm]=useState({...EMPTY_EMP});
  const [attOpen,setAttOpen]=useState(false);
  const [attForm,setAttForm]=useState({...EMPTY_ATT});

  const { data: employees=[], isLoading } = useQuery({ queryKey:["employees",search], queryFn:()=>apiFetch(`/employees${search?`?search=${encodeURIComponent(search)}`:""}`).then(r=>r.json()) });
  const { data: summary } = useQuery({ queryKey:["hr-summary"], queryFn:()=>apiFetch("/hr/summary").then(r=>r.json()) });
  const { data: attendance=[] } = useQuery({ queryKey:["attendance"], queryFn:()=>apiFetch(`/attendance?date=${format(new Date(),"yyyy-MM-dd")}`).then(r=>r.json()) });

  const saveEmp = useMutation({
    mutationFn:(d:any)=>editEmp?apiFetch(`/employees/${editEmp.id}`,{method:"PATCH",body:JSON.stringify(d)}).then(r=>r.json()):apiFetch("/employees",{method:"POST",body:JSON.stringify(d)}).then(r=>r.json()),
    onSuccess:()=>{qc.invalidateQueries({queryKey:["employees"]});qc.invalidateQueries({queryKey:["hr-summary"]});setEmpOpen(false);toast({title:editEmp?"Employee updated":"Employee added"});},
    onError:(e:any)=>toast({title:"Failed to save employee",description:e?.message,variant:"destructive"}),
  });
  const delEmp = useMutation({
    mutationFn:(id:number)=>apiFetch(`/employees/${id}`,{method:"DELETE"}),
    onSuccess:()=>{qc.invalidateQueries({queryKey:["employees"]});qc.invalidateQueries({queryKey:["hr-summary"]});toast({title:"Employee removed"});},
  });
  const markAtt = useMutation({
    mutationFn:(d:any)=>apiFetch("/attendance",{method:"POST",body:JSON.stringify(d)}).then(r=>r.json()),
    onSuccess:()=>{qc.invalidateQueries({queryKey:["attendance"]});setAttOpen(false);toast({title:"Attendance marked"});},
    onError:()=>toast({title:"Failed",variant:"destructive"}),
  });

  const setE=(k:keyof typeof EMPTY_EMP)=>(e:React.ChangeEvent<HTMLInputElement>)=>setEmpForm(f=>({...f,[k]:e.target.value}));
  const openCreate=()=>{setEditEmp(null);setEmpForm({...EMPTY_EMP});setEmpOpen(true);};
  const openEdit=(emp:any)=>{setEditEmp(emp);setEmpForm({name:emp.name,email:emp.email||"",phone:emp.phone||"",position:emp.position,department:emp.department||"",status:emp.status,hireDate:emp.hireDate?format(new Date(emp.hireDate),"yyyy-MM-dd"):format(new Date(),"yyyy-MM-dd"),salary:String(emp.salary||"")});setEmpOpen(true);};

  return (
    <div className="space-y-5">
      <div className="flex items-center justify-between">
        <div><h1 className="text-2xl font-bold">Human Resources</h1><p className="text-muted-foreground text-sm">Manage employees and attendance</p></div>
      </div>

      <div className="grid grid-cols-3 gap-3">
        {[
          {label:"Total Employees",value:summary?.totalEmployees??0,icon:Users,color:"text-blue-400"},
          {label:"Active",value:(summary?.totalEmployees??0)-(summary?.onLeave??0),icon:UserCheck,color:"text-emerald-400"},
          {label:"On Leave",value:summary?.onLeave??0,icon:UserMinus,color:"text-yellow-400"},
        ].map(s=>(
          <Card key={s.label} className="bg-card/50"><CardContent className="pt-4 pb-4 flex items-center gap-3">
            <s.icon className={`w-8 h-8 ${s.color}`}/>
            <div><p className="text-xs text-muted-foreground">{s.label}</p><p className={`text-xl font-bold ${s.color}`}>{s.value}</p></div>
          </CardContent></Card>
        ))}
      </div>

      <Tabs defaultValue="employees">
        <div className="flex items-center justify-between flex-wrap gap-2">
          <TabsList><TabsTrigger value="employees">Employees</TabsTrigger><TabsTrigger value="attendance">Attendance</TabsTrigger></TabsList>
          <div className="flex gap-2">
            <div className="relative w-52"><Search className="absolute left-2.5 top-2.5 h-4 w-4 text-muted-foreground"/><Input placeholder="Search..." className="pl-9 h-9" value={search} onChange={e=>setSearch(e.target.value)}/></div>
            <Button size="sm" onClick={openCreate}><Plus className="w-4 h-4 mr-1"/>Add Employee</Button>
            <Button size="sm" variant="outline" onClick={()=>{setAttForm({...EMPTY_ATT});setAttOpen(true);}}><Calendar className="w-4 h-4 mr-1"/>Mark Attendance</Button>
          </div>
        </div>

        <TabsContent value="employees" className="mt-4">
          <Card>
            <Table>
              <TableHeader><TableRow><TableHead>Employee</TableHead><TableHead>Role</TableHead><TableHead>Salary</TableHead><TableHead>Status</TableHead><TableHead>Hire Date</TableHead><TableHead className="w-10"/></TableRow></TableHeader>
              <TableBody>
                {isLoading?<TableRow><TableCell colSpan={6} className="text-center py-8 text-muted-foreground">Loading...</TableCell></TableRow>
                :(employees as any[]).length===0?<TableRow><TableCell colSpan={6} className="text-center py-12">
                  <div className="flex flex-col items-center text-muted-foreground">
                    <Users className="w-10 h-10 mb-2 opacity-30"/><p>No employees yet</p>
                    <Button variant="outline" size="sm" className="mt-3" onClick={openCreate}><Plus className="w-4 h-4 mr-1"/>Add employee</Button>
                  </div>
                </TableCell></TableRow>
                :(employees as any[]).map((emp:any)=>(
                  <TableRow key={emp.id} className="hover:bg-muted/40">
                    <TableCell>
                      <div className="flex items-center gap-3">
                        <Avatar className="h-9 w-9"><AvatarFallback>{emp.name.charAt(0)}</AvatarFallback></Avatar>
                        <div><div className="font-medium">{emp.name}</div><div className="text-xs text-muted-foreground">{emp.email}</div></div>
                      </div>
                    </TableCell>
                    <TableCell><div className="font-medium">{emp.position}</div><div className="text-xs text-muted-foreground">{emp.department}</div></TableCell>
                    <TableCell className="text-sm">{emp.salary?`₹${new Intl.NumberFormat("en-IN").format(emp.salary)}`:"—"}</TableCell>
                    <TableCell><Badge className={emp.status==="active"?"bg-emerald-500/15 text-emerald-400 border-emerald-500/30":"bg-muted text-muted-foreground"}>{emp.status}</Badge></TableCell>
                    <TableCell className="text-muted-foreground text-sm">{emp.hireDate?format(new Date(emp.hireDate),"dd MMM yyyy"):"—"}</TableCell>
                    <TableCell>
                      <DropdownMenu>
                        <DropdownMenuTrigger asChild><Button variant="ghost" size="icon" className="h-8 w-8"><MoreHorizontal className="h-4 w-4"/></Button></DropdownMenuTrigger>
                        <DropdownMenuContent align="end">
                          <DropdownMenuItem onClick={()=>openEdit(emp)}><Edit className="h-4 w-4 mr-2"/>Edit</DropdownMenuItem>
                          <DropdownMenuSeparator/>
                          <DropdownMenuItem className="text-destructive" onClick={()=>delEmp.mutate(emp.id)}><Trash2 className="h-4 w-4 mr-2"/>Remove</DropdownMenuItem>
                        </DropdownMenuContent>
                      </DropdownMenu>
                    </TableCell>
                  </TableRow>
                ))}
              </TableBody>
            </Table>
          </Card>
        </TabsContent>

        <TabsContent value="attendance" className="mt-4">
          <Card>
            <CardHeader><CardTitle className="text-sm">Today's Attendance — {format(new Date(),"dd MMM yyyy")}</CardTitle></CardHeader>
            <Table>
              <TableHeader><TableRow><TableHead>Employee</TableHead><TableHead>Status</TableHead><TableHead>Check In</TableHead><TableHead>Check Out</TableHead></TableRow></TableHeader>
              <TableBody>
                {(attendance as any[]).length===0?<TableRow><TableCell colSpan={4} className="text-center py-8 text-muted-foreground">No attendance records for today</TableCell></TableRow>
                :(attendance as any[]).map((a:any)=>(
                  <TableRow key={a.id}>
                    <TableCell className="font-medium">{a.employeeName}</TableCell>
                    <TableCell><Badge className={a.status==="present"?"bg-emerald-500/15 text-emerald-400":a.status==="absent"?"bg-red-500/15 text-red-400":"bg-yellow-500/15 text-yellow-400"}>{a.status}</Badge></TableCell>
                    <TableCell className="text-sm text-muted-foreground">{a.checkIn||"—"}</TableCell>
                    <TableCell className="text-sm text-muted-foreground">{a.checkOut||"—"}</TableCell>
                  </TableRow>
                ))}
              </TableBody>
            </Table>
          </Card>
        </TabsContent>
      </Tabs>

      <Dialog open={empOpen} onOpenChange={setEmpOpen}>
        <DialogContent className="max-w-lg">
          <DialogHeader><DialogTitle>{editEmp?"Edit Employee":"Add Employee"}</DialogTitle></DialogHeader>
          <div className="grid gap-4 py-2">
            <div className="grid grid-cols-2 gap-3">
              <div className="grid gap-2 col-span-2"><Label>Full Name *</Label><Input value={empForm.name} onChange={setE("name")} placeholder="Employee name"/></div>
              <div className="grid gap-2"><Label>Email</Label><Input type="email" value={empForm.email} onChange={setE("email")} placeholder="employee@company.com"/></div>
              <div className="grid gap-2"><Label>Phone</Label><Input value={empForm.phone} onChange={setE("phone")} placeholder="9876543210"/></div>
              <div className="grid gap-2"><Label>Position *</Label><Input value={empForm.position} onChange={setE("position")} placeholder="Software Engineer"/></div>
              <div className="grid gap-2"><Label>Department</Label><Input value={empForm.department} onChange={setE("department")} placeholder="Engineering"/></div>
              <div className="grid gap-2"><Label>Status</Label>
                <Select value={empForm.status} onValueChange={v=>setEmpForm(f=>({...f,status:v}))}><SelectTrigger><SelectValue/></SelectTrigger>
                  <SelectContent><SelectItem value="active">Active</SelectItem><SelectItem value="inactive">Inactive</SelectItem><SelectItem value="on-leave">On Leave</SelectItem></SelectContent></Select>
              </div>
              <div className="grid gap-2"><Label>Hire Date</Label><Input type="date" value={empForm.hireDate} onChange={setE("hireDate")}/></div>
              <div className="grid gap-2 col-span-2"><Label>Monthly Salary (₹)</Label><Input type="number" min="0" value={empForm.salary} onChange={setE("salary")} placeholder="50000"/></div>
            </div>
          </div>
          <DialogFooter>
            <Button variant="outline" onClick={()=>setEmpOpen(false)}>Cancel</Button>
            <Button onClick={()=>{if(!empForm.name||!empForm.position){toast({title:"Name and position required",variant:"destructive"});return;}saveEmp.mutate({name:empForm.name,email:empForm.email||undefined,phone:empForm.phone||undefined,position:empForm.position,department:empForm.department||undefined,status:empForm.status,hireDate:new Date(empForm.hireDate).toISOString(),salary:empForm.salary?parseFloat(empForm.salary):undefined});}} disabled={saveEmp.isPending}>{editEmp?"Update":"Add"} Employee</Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      <Dialog open={attOpen} onOpenChange={setAttOpen}>
        <DialogContent className="max-w-md">
          <DialogHeader><DialogTitle>Mark Attendance</DialogTitle></DialogHeader>
          <div className="grid gap-4 py-2">
            <div className="grid gap-2"><Label>Employee *</Label>
              <Select value={String(attForm.employeeId)} onValueChange={v=>setAttForm(f=>({...f,employeeId:v}))}><SelectTrigger><SelectValue placeholder="Select employee"/></SelectTrigger>
                <SelectContent>{(employees as any[]).map((e:any)=><SelectItem key={e.id} value={String(e.id)}>{e.name}</SelectItem>)}</SelectContent></Select>
            </div>
            <div className="grid gap-2"><Label>Date</Label><Input type="date" value={attForm.date} onChange={e=>setAttForm(f=>({...f,date:e.target.value}))}/></div>
            <div className="grid gap-2"><Label>Status</Label>
              <Select value={attForm.status} onValueChange={v=>setAttForm(f=>({...f,status:v}))}><SelectTrigger><SelectValue/></SelectTrigger>
                <SelectContent><SelectItem value="present">Present</SelectItem><SelectItem value="absent">Absent</SelectItem><SelectItem value="half-day">Half Day</SelectItem><SelectItem value="late">Late</SelectItem></SelectContent></Select>
            </div>
            <div className="grid grid-cols-2 gap-3">
              <div className="grid gap-2"><Label>Check In</Label><Input type="time" value={attForm.checkIn} onChange={e=>setAttForm(f=>({...f,checkIn:e.target.value}))}/></div>
              <div className="grid gap-2"><Label>Check Out</Label><Input type="time" value={attForm.checkOut} onChange={e=>setAttForm(f=>({...f,checkOut:e.target.value}))}/></div>
            </div>
          </div>
          <DialogFooter>
            <Button variant="outline" onClick={()=>setAttOpen(false)}>Cancel</Button>
            <Button onClick={()=>{if(!attForm.employeeId){toast({title:"Select employee",variant:"destructive"});return;}markAtt.mutate({employeeId:Number(attForm.employeeId),date:attForm.date,status:attForm.status,checkIn:attForm.checkIn||undefined,checkOut:attForm.checkOut||undefined});}} disabled={markAtt.isPending}>Mark Attendance</Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </div>
  );
}
