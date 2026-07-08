import { useState } from "react";
import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { apiFetch } from "../lib/auth";
import { Card, CardContent } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogFooter } from "@/components/ui/dialog";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Badge } from "@/components/ui/badge";
import { DropdownMenu, DropdownMenuContent, DropdownMenuItem, DropdownMenuTrigger } from "@/components/ui/dropdown-menu";
import { Plus, ShoppingCart, MoreHorizontal, Edit, Trash2, CheckCircle, Package } from "lucide-react";
import { DropdownMenuSeparator } from "@/components/ui/dropdown-menu";
import { useToast } from "@/hooks/use-toast";
import { format } from "date-fns";
import { cn } from "@/lib/utils";

const fmt = (n:number)=>`₹${new Intl.NumberFormat("en-IN",{maximumFractionDigits:0}).format(n)}`;
const EMPTY_ITEM = { productId:"",productName:"",quantity:"1",unitPrice:"",gstRate:"18",amount:"0" };

export default function Purchase() {
  const qc = useQueryClient();
  const { toast } = useToast();
  const [open,setOpen]=useState(false);
  const [editing,setEditing]=useState<any>(null);
  const [form,setForm]=useState({supplierId:"" as any,supplierName:"",billDate:format(new Date(),"yyyy-MM-dd"),notes:"",paymentTerms:"30"});
  const [items,setItems]=useState([{...EMPTY_ITEM}]);

  const { data: suppliers=[] } = useQuery({ queryKey:["suppliers"], queryFn:()=>apiFetch("/suppliers").then(r=>r.json()) });
  const { data: products=[] } = useQuery({ queryKey:["products"], queryFn:()=>apiFetch("/products").then(r=>r.json()) });
  const { data: orders=[], isLoading } = useQuery({ queryKey:["purchase-orders"], queryFn:()=>apiFetch("/purchase-orders").then(r=>r.json()) });
  const { data: summary } = useQuery({ queryKey:["purchase-summary"], queryFn:()=>apiFetch("/purchase-orders/summary").then(r=>r.json()) });

  const save = useMutation({
    mutationFn:(d:any)=>apiFetch("/purchase-orders",{method:"POST",body:JSON.stringify(d)}).then(r=>r.json()),
    onSuccess:()=>{qc.invalidateQueries({queryKey:["purchase-orders"]});qc.invalidateQueries({queryKey:["purchase-summary"]});setOpen(false);toast({title:"Purchase order created"});},
    onError:()=>toast({title:"Failed",variant:"destructive"}),
  });
  const del = useMutation({
    mutationFn:(id:number)=>apiFetch(`/purchase-orders/${id}`,{method:"DELETE"}),
    onSuccess:()=>{qc.invalidateQueries({queryKey:["purchase-orders"]});qc.invalidateQueries({queryKey:["purchase-summary"]});toast({title:"Order deleted"});},
  });
  const updateStatus = useMutation({
    mutationFn:({id,status}:{id:number;status:string})=>apiFetch(`/purchase-orders/${id}`,{method:"PATCH",body:JSON.stringify({paymentStatus:status})}).then(r=>r.json()),
    onSuccess:(_,v)=>{qc.invalidateQueries({queryKey:["purchase-orders"]});qc.invalidateQueries({queryKey:["purchase-summary"]});toast({title:`Marked as ${v.status}`});},
    onError:()=>toast({title:"Failed",variant:"destructive"}),
  });

  const total = items.reduce((s,i)=>s+parseFloat(i.amount||"0"),0);

  const updateItem=(idx:number,field:string,val:string)=>setItems(prev=>prev.map((it,i)=>{
    if(i!==idx)return it;
    const u={...it,[field]:val};
    if(field==="quantity"||field==="unitPrice") u.amount=String(parseFloat(u.quantity||"0")*parseFloat(u.unitPrice||"0"));
    if(field==="productId"){const p=(products as any[]).find((p:any)=>p.id===Number(val));if(p){u.productName=p.name;u.unitPrice=String(p.purchasePrice||p.sellingPrice||"");u.gstRate=String(p.gstRate||18);u.amount=String(parseFloat(u.quantity||"0")*parseFloat(u.unitPrice||"0"));}}
    return u;
  }));

  const statusBadge=(s:string)=>{
    const m:Record<string,string>={pending:"bg-yellow-500/15 text-yellow-400",paid:"bg-emerald-500/15 text-emerald-400",cancelled:"bg-red-500/15 text-red-400",received:"bg-blue-500/15 text-blue-400"};
    return <Badge className={m[s]||"bg-muted text-muted-foreground"}>{s}</Badge>;
  };

  return (
    <div className="space-y-5">
      <div className="flex items-center justify-between">
        <div><h1 className="text-2xl font-bold">Purchase Orders</h1><p className="text-muted-foreground text-sm">Manage procurement and supplier orders</p></div>
        <Button onClick={()=>{setEditing(null);setForm({supplierId:"",supplierName:"",billDate:format(new Date(),"yyyy-MM-dd"),notes:"",paymentTerms:"30"});setItems([{...EMPTY_ITEM}]);setOpen(true);}}><Plus className="w-4 h-4 mr-2"/>New Order</Button>
      </div>

      <div className="grid grid-cols-3 gap-3">
        {[
          {label:"Pending Orders",value:summary?.pending??0,cls:"text-yellow-400"},
          {label:"Total Purchased",value:summary?.totalValue?fmt(summary.totalValue):"₹0",cls:"text-blue-400"},
          {label:"This Month",value:summary?.thisMonth?fmt(summary.thisMonth):"₹0",cls:"text-emerald-400"},
        ].map(s=>(
          <Card key={s.label} className="bg-card/50"><CardContent className="pt-4 pb-4">
            <p className="text-xs text-muted-foreground">{s.label}</p>
            <p className={cn("text-xl font-bold mt-1",s.cls)}>{s.value}</p>
          </CardContent></Card>
        ))}
      </div>

      <Card>
        <Table>
          <TableHeader><TableRow><TableHead>Bill #</TableHead><TableHead>Supplier</TableHead><TableHead className="text-right">Amount</TableHead><TableHead>Payment</TableHead><TableHead>Bill Date</TableHead><TableHead className="w-10"/></TableRow></TableHeader>
          <TableBody>
            {isLoading?<TableRow><TableCell colSpan={6} className="text-center py-8 text-muted-foreground">Loading...</TableCell></TableRow>
            :(orders as any[]).length===0?<TableRow><TableCell colSpan={6} className="text-center py-12">
              <div className="flex flex-col items-center text-muted-foreground">
                <ShoppingCart className="w-10 h-10 mb-2 opacity-30"/><p>No purchase orders yet</p>
              </div>
            </TableCell></TableRow>
            :(orders as any[]).map((o:any)=>(
              <TableRow key={o.id} className="hover:bg-muted/40">
                <TableCell className="font-mono text-sm font-semibold">{o.billNumber||"—"}</TableCell>
                <TableCell><div className="font-medium">{o.supplierName||"—"}</div></TableCell>
                <TableCell className="text-right font-semibold">₹{new Intl.NumberFormat("en-IN").format(o.total)}</TableCell>
                <TableCell>{statusBadge(o.paymentStatus)}</TableCell>
                <TableCell className="text-sm text-muted-foreground">{o.billDate?format(new Date(o.billDate),"dd MMM yyyy"):"—"}</TableCell>
                <TableCell>
                  <DropdownMenu>
                    <DropdownMenuTrigger asChild><Button variant="ghost" size="icon" className="h-8 w-8"><MoreHorizontal className="h-4 w-4"/></Button></DropdownMenuTrigger>
                    <DropdownMenuContent align="end">
                      {o.paymentStatus==="pending"&&<DropdownMenuItem onClick={()=>updateStatus.mutate({id:o.id,status:"received"})}><Package className="h-4 w-4 mr-2 text-blue-400"/>Mark as Received</DropdownMenuItem>}
                      {o.paymentStatus!=="paid"&&<DropdownMenuItem onClick={()=>updateStatus.mutate({id:o.id,status:"paid"})}><CheckCircle className="h-4 w-4 mr-2 text-emerald-400"/>Mark as Paid</DropdownMenuItem>}
                      {(o.paymentStatus==="pending"||o.paymentStatus==="received")&&<DropdownMenuSeparator/>}
                      <DropdownMenuItem className="text-destructive" onClick={()=>del.mutate(o.id)}><Trash2 className="h-4 w-4 mr-2"/>Delete</DropdownMenuItem>
                    </DropdownMenuContent>
                  </DropdownMenu>
                </TableCell>
              </TableRow>
            ))}
          </TableBody>
        </Table>
      </Card>

      <Dialog open={open} onOpenChange={setOpen}>
        <DialogContent className="max-w-2xl max-h-[90vh] overflow-y-auto">
          <DialogHeader><DialogTitle>New Purchase Order</DialogTitle></DialogHeader>
          <div className="grid gap-4 py-2">
            <div className="grid grid-cols-2 gap-3">
              <div className="grid gap-2">
                <Label>Supplier</Label>
                <Select value={String(form.supplierId)} onValueChange={v=>{const s=(suppliers as any[]).find((s:any)=>s.id===Number(v));setForm(f=>({...f,supplierId:v,supplierName:s?.name||""}));}}>
                  <SelectTrigger><SelectValue placeholder="Select supplier"/></SelectTrigger>
                  <SelectContent><SelectItem value="0">Enter manually</SelectItem>{(suppliers as any[]).map((s:any)=><SelectItem key={s.id} value={String(s.id)}>{s.name}</SelectItem>)}</SelectContent>
                </Select>
                {(!form.supplierId||form.supplierId==="0")&&<Input placeholder="Supplier name" value={form.supplierName} onChange={e=>setForm(f=>({...f,supplierName:e.target.value}))}/>}
              </div>
              <div className="grid gap-2"><Label>Bill Date</Label><Input type="date" value={form.billDate} onChange={e=>setForm(f=>({...f,billDate:e.target.value}))}/></div>
            </div>
            <div className="grid gap-2">
              <div className="flex items-center justify-between"><Label>Items</Label><Button type="button" variant="outline" size="sm" onClick={()=>setItems(p=>[...p,{...EMPTY_ITEM}])}><Plus className="w-3 h-3 mr-1"/>Add</Button></div>
              <div className="rounded-lg border overflow-hidden">
                <Table>
                  <TableHeader><TableRow className="bg-muted/40"><TableHead>Product</TableHead><TableHead className="w-20 text-right">Qty</TableHead><TableHead className="w-28 text-right">Price (₹)</TableHead><TableHead className="w-24 text-right">Amount (₹)</TableHead><TableHead className="w-8"/></TableRow></TableHeader>
                  <TableBody>
                    {items.map((item,idx)=>(
                      <TableRow key={idx}>
                        <TableCell className="p-1">
                          <Select value={item.productId} onValueChange={v=>updateItem(idx,"productId",v)}>
                            <SelectTrigger className="h-8 border-0 shadow-none"><SelectValue placeholder="Select product"/></SelectTrigger>
                            <SelectContent>{(products as any[]).map((p:any)=><SelectItem key={p.id} value={String(p.id)}>{p.name}</SelectItem>)}</SelectContent>
                          </Select>
                        </TableCell>
                        <TableCell className="p-1"><Input className="h-8 border-0 text-right bg-transparent" type="number" min="1" value={item.quantity} onChange={e=>updateItem(idx,"quantity",e.target.value)}/></TableCell>
                        <TableCell className="p-1"><Input className="h-8 border-0 text-right bg-transparent" type="number" value={item.unitPrice} onChange={e=>updateItem(idx,"unitPrice",e.target.value)}/></TableCell>
                        <TableCell className="text-right text-sm font-semibold pr-3">₹{new Intl.NumberFormat("en-IN").format(parseFloat(item.amount||"0"))}</TableCell>
                        <TableCell className="p-1">{items.length>1&&<Button type="button" variant="ghost" size="icon" className="h-7 w-7 text-muted-foreground" onClick={()=>setItems(p=>p.filter((_,i)=>i!==idx))}>×</Button>}</TableCell>
                      </TableRow>
                    ))}
                  </TableBody>
                </Table>
              </div>
              <div className="flex justify-end font-bold text-lg">Total: {fmt(total)}</div>
            </div>
            <div className="grid gap-2"><Label>Notes</Label><Input placeholder="Optional notes..." value={form.notes} onChange={e=>setForm(f=>({...f,notes:e.target.value}))}/></div>
          </div>
          <DialogFooter>
            <Button variant="outline" onClick={()=>setOpen(false)}>Cancel</Button>
            <Button onClick={()=>save.mutate({supplierId:Number(form.supplierId)||undefined,supplierName:form.supplierName||undefined,billDate:form.billDate,items:items.map(i=>({productId:Number(i.productId)||undefined,productName:i.productName,quantity:parseFloat(i.quantity),unitPrice:parseFloat(i.unitPrice),gstRate:parseFloat(i.gstRate),amount:parseFloat(i.amount)})),notes:form.notes||undefined,total})} disabled={save.isPending}>Create Order</Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </div>
  );
}
