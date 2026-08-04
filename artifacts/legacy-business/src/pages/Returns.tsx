import { useState } from "react";
import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { apiFetch } from "../lib/auth";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogFooter } from "@/components/ui/dialog";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { Badge } from "@/components/ui/badge";
import { Plus, Search, Trash2, RotateCcw, Package, X } from "lucide-react";
import { useToast } from "@/hooks/use-toast";

const fmt = (n: number) => new Intl.NumberFormat("en-IN",{maximumFractionDigits:0}).format(n);
const EMPTY_ITEM = { description:"", quantity:1, unitPrice:0, amount:0, productId:undefined as number|undefined, variantId:undefined as number|undefined };

function ProductSearchPopup({ onSelect, onClose }: { onSelect:(p:any)=>void; onClose:()=>void }) {
  const [q,setQ]=useState("");
  const { data:results=[], isLoading } = useQuery({
    queryKey:["product-search",q],
    queryFn:()=>q.length>=1?apiFetch(`/products/search?q=${encodeURIComponent(q)}`).then(r=>r.json()):[],
    enabled:q.length>=1,
  });
  return (
    <div className="absolute z-50 top-full left-0 w-full min-w-72 bg-card border rounded-lg shadow-2xl mt-1 overflow-hidden">
      <div className="p-2 border-b flex items-center gap-2">
        <Search className="w-4 h-4 text-muted-foreground flex-shrink-0"/>
        <input autoFocus value={q} onChange={e=>setQ(e.target.value)} placeholder="Search products..." className="flex-1 bg-transparent outline-none text-sm"/>
        <button onClick={onClose}><X className="w-4 h-4 text-muted-foreground"/></button>
      </div>
      <div className="max-h-48 overflow-y-auto">
        {isLoading&&<div className="p-3 text-sm text-muted-foreground text-center">Searching...</div>}
        {!isLoading&&q.length>=1&&(results as any[]).length===0&&<div className="p-3 text-sm text-muted-foreground text-center">No products found</div>}
        {(results as any[]).map((p:any,i:number)=>(
          <button key={i} className="w-full text-left px-3 py-2 hover:bg-muted/60 flex items-center gap-2 border-b border-muted/30" onClick={()=>{onSelect(p);onClose();}}>
            <Package className="w-4 h-4 text-muted-foreground flex-shrink-0"/>
            <div><div className="text-sm font-medium">{p.name}</div><div className="text-xs text-muted-foreground">₹{fmt(p.sellingPrice||0)} · Stock: {p.currentStock}</div></div>
          </button>
        ))}
      </div>
    </div>
  );
}

function ReturnForm({ type, onClose }: { type:"sales"|"purchase"; onClose:()=>void }) {
  const qc = useQueryClient();
  const { toast } = useToast();
  const [items,setItems]=useState([{...EMPTY_ITEM}]);
  const [form,setForm]=useState({
    originalRef:"", customerOrSupplierName:"", returnDate:new Date().toISOString().split("T")[0],
    reason:"", notes:"", gstRate:"0",
  });
  const [searchPopupIdx,setSearchPopupIdx]=useState<number|null>(null);

  const { data:invoices=[] } = useQuery({ queryKey:["invoices","gst_invoice"], queryFn:()=>apiFetch("/invoices?type=gst_invoice").then(r=>r.json()), enabled:type==="sales" });
  const { data:purchases=[] } = useQuery({ queryKey:["purchase-orders"], queryFn:()=>apiFetch("/purchase-orders").then(r=>r.json()), enabled:type==="purchase" });

  const endpoint = type==="sales" ? "/sales-returns" : "/purchase-returns";
  const save = useMutation({
    mutationFn:(d:any)=>apiFetch(endpoint,{method:"POST",body:JSON.stringify(d)}).then(r=>r.json()),
    onSuccess:()=>{
      qc.invalidateQueries({queryKey:[type==="sales"?"sales-returns":"purchase-returns"]});
      qc.invalidateQueries({queryKey:["products"]});
      toast({title:`${type==="sales"?"Sales":"Purchase"} return created. Stock updated.`});
      onClose();
    },
    onError:()=>toast({title:"Failed",variant:"destructive"}),
  });

  const updateItem=(idx:number,field:string,val:any)=>setItems(prev=>prev.map((it,i)=>{
    if(i!==idx) return it;
    const u={...it,[field]:field==="description"?val:Number(val)};
    if(field==="quantity"||field==="unitPrice") u.amount=Number(u.quantity)*Number(u.unitPrice);
    return u;
  }));

  const selectProduct=(idx:number,p:any)=>setItems(prev=>prev.map((it,i)=>{
    if(i!==idx) return it;
    const qty=Number(it.quantity)||1;
    return {...it,description:p.name,unitPrice:Number(p.sellingPrice||0),amount:qty*Number(p.sellingPrice||0),productId:p.productId,variantId:p.variantId||undefined};
  }));

  const subtotal=items.reduce((s,i)=>s+i.amount,0);
  const gst=(subtotal*Number(form.gstRate||0))/100;
  const total=subtotal+gst;

  const handleSave=()=>{
    const payload:any={
      returnDate:form.returnDate,
      reason:form.reason,
      notes:form.notes,
      gstRate:Number(form.gstRate||0),
      items: items.map(i=>({...i})),
    };
    if(type==="sales") {
      const inv=(invoices as any[]).find((i:any)=>i.invoiceNumber===form.originalRef);
      payload.originalInvoiceId=inv?.id||null;
      payload.originalInvoiceNumber=form.originalRef||null;
      payload.customerName=form.customerOrSupplierName||inv?.customerName||null;
      payload.customerId=inv?.customerId||null;
    } else {
      const po=(purchases as any[]).find((p:any)=>p.billNumber===form.originalRef);
      payload.originalPurchaseId=po?.id||null;
      payload.originalBillNumber=form.originalRef||null;
      payload.supplierName=form.customerOrSupplierName||po?.supplierName||null;
      payload.supplierId=po?.supplierId||null;
    }
    save.mutate(payload);
  };

  return (
    <div className="space-y-4">
      <div className="grid grid-cols-2 gap-3">
        <div className="grid gap-2">
          <Label>Original {type==="sales"?"Invoice":"Bill"} Number</Label>
          <Select value={form.originalRef||"__manual__"} onValueChange={v=>{
            if(v==="__manual__") setForm(f=>({...f,originalRef:""}));
            else {
              setForm(f=>({...f,originalRef:v}));
              if(type==="sales"){const inv=(invoices as any[]).find((i:any)=>i.invoiceNumber===v);if(inv)setForm(f=>({...f,customerOrSupplierName:inv.customerName||""}));}
              else{const po=(purchases as any[]).find((p:any)=>p.billNumber===v);if(po)setForm(f=>({...f,customerOrSupplierName:po.supplierName||""}));}
            }
          }}>
            <SelectTrigger><SelectValue placeholder="Select or type manually"/></SelectTrigger>
            <SelectContent>
              <SelectItem value="__manual__">Enter manually</SelectItem>
              {type==="sales"?(invoices as any[]).map((i:any)=><SelectItem key={i.id} value={i.invoiceNumber}>{i.invoiceNumber} — {i.customerName}</SelectItem>)
              :(purchases as any[]).map((p:any)=><SelectItem key={p.id} value={p.billNumber}>{p.billNumber} — {p.supplierName}</SelectItem>)}
            </SelectContent>
          </Select>
          {!form.originalRef&&<Input placeholder="Enter manually" value={form.originalRef} onChange={e=>setForm(f=>({...f,originalRef:e.target.value}))}/>}
        </div>
        <div className="grid gap-2">
          <Label>{type==="sales"?"Customer":"Supplier"} Name</Label>
          <Input value={form.customerOrSupplierName} onChange={e=>setForm(f=>({...f,customerOrSupplierName:e.target.value}))} placeholder={`${type==="sales"?"Customer":"Supplier"} name`}/>
        </div>
        <div className="grid gap-2"><Label>Return Date</Label><Input type="date" value={form.returnDate} onChange={e=>setForm(f=>({...f,returnDate:e.target.value}))}/></div>
        <div className="grid gap-2"><Label>Reason</Label><Input value={form.reason} onChange={e=>setForm(f=>({...f,reason:e.target.value}))} placeholder="Reason for return"/></div>
      </div>

      <div className="grid gap-2">
        <div className="flex items-center justify-between">
          <Label>Return Items <span className="text-xs text-muted-foreground font-normal ml-1">(stock will be {type==="sales"?"added back":"deducted"})</span></Label>
          <Button type="button" variant="outline" size="sm" onClick={()=>setItems(prev=>[...prev,{...EMPTY_ITEM}])}><Plus className="w-3 h-3 mr-1"/>Add Line</Button>
        </div>
        <div className="rounded-lg border">
          <Table>
            <TableHeader><TableRow className="bg-muted/40"><TableHead>Product (click to search)</TableHead><TableHead className="w-16 text-right">Qty</TableHead><TableHead className="w-28 text-right">Unit Price</TableHead><TableHead className="w-28 text-right">Amount</TableHead><TableHead className="w-8"/></TableRow></TableHeader>
            <TableBody>
              {items.map((item,idx)=>(
                <TableRow key={idx}>
                  <TableCell className="p-1">
                    <div className="relative">
                      <Input className="h-8 border-0 shadow-none focus-visible:ring-0 bg-transparent" value={item.description} onChange={e=>updateItem(idx,"description",e.target.value)} onFocus={()=>setSearchPopupIdx(idx)} placeholder="Click to search..."/>
                      {searchPopupIdx===idx&&<ProductSearchPopup onSelect={(p)=>selectProduct(idx,p)} onClose={()=>setSearchPopupIdx(null)}/>}
                    </div>
                  </TableCell>
                  <TableCell className="p-1"><Input className="h-8 border-0 shadow-none focus-visible:ring-0 text-right bg-transparent" type="number" min="1" value={item.quantity} onChange={e=>updateItem(idx,"quantity",e.target.value)}/></TableCell>
                  <TableCell className="p-1"><Input className="h-8 border-0 shadow-none focus-visible:ring-0 text-right bg-transparent" type="number" min="0" step="0.01" value={item.unitPrice} onChange={e=>updateItem(idx,"unitPrice",e.target.value)}/></TableCell>
                  <TableCell className="p-1 text-right text-sm font-semibold pr-3">₹{fmt(item.amount)}</TableCell>
                  <TableCell className="p-1">{items.length>1&&<button type="button" className="h-7 w-7 flex items-center justify-center text-muted-foreground hover:text-destructive" onClick={()=>setItems(prev=>prev.filter((_,i)=>i!==idx))}>×</button>}</TableCell>
                </TableRow>
              ))}
            </TableBody>
          </Table>
        </div>
      </div>

      <div className="bg-muted/20 rounded-lg p-3 space-y-1 text-sm">
        <div className="flex justify-between text-muted-foreground"><span>Subtotal</span><span>₹{fmt(subtotal)}</span></div>
        {gst>0&&<div className="flex justify-between text-blue-500"><span>GST</span><span>₹{fmt(gst)}</span></div>}
        <div className="flex justify-between font-bold border-t pt-2"><span>Total Return Amount</span><span>₹{fmt(total)}</span></div>
      </div>

      <div className="grid gap-2"><Label>Notes</Label><Textarea value={form.notes} onChange={e=>setForm(f=>({...f,notes:e.target.value}))} placeholder="Additional notes..." rows={2}/></div>

      <div className="flex gap-2 justify-end">
        <Button variant="outline" onClick={onClose}>Cancel</Button>
        <Button onClick={handleSave} disabled={save.isPending} className={type==="sales"?"bg-orange-600 hover:bg-orange-700":"bg-red-600 hover:bg-red-700"}>
          <RotateCcw className="w-4 h-4 mr-2"/>Create {type==="sales"?"Sales":"Purchase"} Return
        </Button>
      </div>
    </div>
  );
}

export default function Returns() {
  const [activeTab,setActiveTab]=useState("sales");
  const [showForm,setShowForm]=useState<"sales"|"purchase"|null>(null);
  const [search,setSearch]=useState("");

  const { data:salesReturns=[], isLoading:slLoading } = useQuery({ queryKey:["sales-returns"], queryFn:()=>apiFetch("/sales-returns").then(r=>r.json()) });
  const { data:purchaseReturns=[], isLoading:prLoading } = useQuery({ queryKey:["purchase-returns"], queryFn:()=>apiFetch("/purchase-returns").then(r=>r.json()) });
  const qc = useQueryClient();
  const { toast } = useToast();

  const delSR = useMutation({
    mutationFn:(id:number)=>apiFetch(`/sales-returns/${id}`,{method:"DELETE"}),
    onSuccess:()=>{qc.invalidateQueries({queryKey:["sales-returns"]});toast({title:"Deleted"});},
  });
  const delPR = useMutation({
    mutationFn:(id:number)=>apiFetch(`/purchase-returns/${id}`,{method:"DELETE"}),
    onSuccess:()=>{qc.invalidateQueries({queryKey:["purchase-returns"]});toast({title:"Deleted"});},
  });

  const filteredSR=(salesReturns as any[]).filter((r:any)=>r.returnNumber?.toLowerCase().includes(search.toLowerCase())||(r.customerName??"").toLowerCase().includes(search.toLowerCase()));
  const filteredPR=(purchaseReturns as any[]).filter((r:any)=>r.returnNumber?.toLowerCase().includes(search.toLowerCase())||(r.supplierName??"").toLowerCase().includes(search.toLowerCase()));

  return (
    <div className="space-y-5">
      <div className="flex items-center justify-between flex-wrap gap-3">
        <div><h1 className="text-2xl font-bold">Returns</h1><p className="text-muted-foreground text-sm">Sales returns add stock back — Purchase returns deduct stock</p></div>
        <div className="flex gap-2">
          <Button variant="outline" onClick={()=>setShowForm("purchase")} className="border-red-500/30 text-red-400 hover:bg-red-500/10"><Plus className="w-4 h-4 mr-1"/>Purchase Return</Button>
          <Button onClick={()=>setShowForm("sales")} className="bg-orange-600 hover:bg-orange-700"><Plus className="w-4 h-4 mr-2"/>Sales Return</Button>
        </div>
      </div>

      <div className="grid grid-cols-2 md:grid-cols-4 gap-3">
        <Card className="bg-card/50"><CardHeader className="pb-1 pt-3 px-4"><CardTitle className="text-xs text-muted-foreground">Sales Returns</CardTitle></CardHeader><CardContent className="pb-3 px-4"><div className="text-xl font-bold text-orange-400">{(salesReturns as any[]).length}</div></CardContent></Card>
        <Card className="bg-card/50"><CardHeader className="pb-1 pt-3 px-4"><CardTitle className="text-xs text-muted-foreground">Total Sales Return Value</CardTitle></CardHeader><CardContent className="pb-3 px-4"><div className="text-xl font-bold text-orange-400">₹{fmt((salesReturns as any[]).reduce((s:number,r:any)=>s+Number(r.total||0),0))}</div></CardContent></Card>
        <Card className="bg-card/50"><CardHeader className="pb-1 pt-3 px-4"><CardTitle className="text-xs text-muted-foreground">Purchase Returns</CardTitle></CardHeader><CardContent className="pb-3 px-4"><div className="text-xl font-bold text-red-400">{(purchaseReturns as any[]).length}</div></CardContent></Card>
        <Card className="bg-card/50"><CardHeader className="pb-1 pt-3 px-4"><CardTitle className="text-xs text-muted-foreground">Total Purchase Return Value</CardTitle></CardHeader><CardContent className="pb-3 px-4"><div className="text-xl font-bold text-red-400">₹{fmt((purchaseReturns as any[]).reduce((s:number,r:any)=>s+Number(r.total||0),0))}</div></CardContent></Card>
      </div>

      <Tabs value={activeTab} onValueChange={setActiveTab}>
        <TabsList>
          <TabsTrigger value="sales">Sales Returns</TabsTrigger>
          <TabsTrigger value="purchase">Purchase Returns</TabsTrigger>
        </TabsList>

        <div className="my-3">
          <div className="relative max-w-sm"><Search className="absolute left-2.5 top-2.5 h-4 w-4 text-muted-foreground"/><Input placeholder="Search returns..." className="pl-9" value={search} onChange={e=>setSearch(e.target.value)}/></div>
        </div>

        <TabsContent value="sales">
          <Card>
            <Table>
              <TableHeader><TableRow><TableHead>Return #</TableHead><TableHead>Original Invoice</TableHead><TableHead>Customer</TableHead><TableHead className="text-right">Amount</TableHead><TableHead>Date</TableHead><TableHead>Status</TableHead><TableHead className="w-10"/></TableRow></TableHeader>
              <TableBody>
                {slLoading?<TableRow><TableCell colSpan={7} className="text-center py-8">Loading...</TableCell></TableRow>
                :filteredSR.length===0?<TableRow><TableCell colSpan={7} className="text-center py-12 text-muted-foreground"><RotateCcw className="w-10 h-10 mx-auto mb-2 opacity-30"/><p>No sales returns yet</p></TableCell></TableRow>
                :filteredSR.map((r:any)=>(
                  <TableRow key={r.id}>
                    <TableCell className="font-mono text-sm font-semibold">{r.returnNumber}</TableCell>
                    <TableCell className="text-muted-foreground text-sm">{r.originalInvoiceNumber||"—"}</TableCell>
                    <TableCell>{r.customerName||"—"}</TableCell>
                    <TableCell className="text-right font-semibold">₹{fmt(Number(r.total||0))}</TableCell>
                    <TableCell className="text-muted-foreground text-sm">{r.returnDate||"—"}</TableCell>
                    <TableCell><Badge className="bg-emerald-500/15 text-emerald-400 text-xs">{r.status}</Badge></TableCell>
                    <TableCell><Button variant="ghost" size="icon" className="h-8 w-8 text-muted-foreground hover:text-destructive" onClick={()=>delSR.mutate(r.id)}><Trash2 className="h-4 w-4"/></Button></TableCell>
                  </TableRow>
                ))}
              </TableBody>
            </Table>
          </Card>
        </TabsContent>

        <TabsContent value="purchase">
          <Card>
            <Table>
              <TableHeader><TableRow><TableHead>Return #</TableHead><TableHead>Original Bill</TableHead><TableHead>Supplier</TableHead><TableHead className="text-right">Amount</TableHead><TableHead>Date</TableHead><TableHead>Status</TableHead><TableHead className="w-10"/></TableRow></TableHeader>
              <TableBody>
                {prLoading?<TableRow><TableCell colSpan={7} className="text-center py-8">Loading...</TableCell></TableRow>
                :filteredPR.length===0?<TableRow><TableCell colSpan={7} className="text-center py-12 text-muted-foreground"><RotateCcw className="w-10 h-10 mx-auto mb-2 opacity-30"/><p>No purchase returns yet</p></TableCell></TableRow>
                :filteredPR.map((r:any)=>(
                  <TableRow key={r.id}>
                    <TableCell className="font-mono text-sm font-semibold">{r.returnNumber}</TableCell>
                    <TableCell className="text-muted-foreground text-sm">{r.originalBillNumber||"—"}</TableCell>
                    <TableCell>{r.supplierName||"—"}</TableCell>
                    <TableCell className="text-right font-semibold">₹{fmt(Number(r.total||0))}</TableCell>
                    <TableCell className="text-muted-foreground text-sm">{r.returnDate||"—"}</TableCell>
                    <TableCell><Badge className="bg-red-500/15 text-red-400 text-xs">{r.status}</Badge></TableCell>
                    <TableCell><Button variant="ghost" size="icon" className="h-8 w-8 text-muted-foreground hover:text-destructive" onClick={()=>delPR.mutate(r.id)}><Trash2 className="h-4 w-4"/></Button></TableCell>
                  </TableRow>
                ))}
              </TableBody>
            </Table>
          </Card>
        </TabsContent>
      </Tabs>

      <Dialog open={!!showForm} onOpenChange={()=>setShowForm(null)}>
        <DialogContent className="max-w-3xl max-h-[95vh] overflow-y-auto">
          <DialogHeader><DialogTitle>New {showForm==="sales"?"Sales":"Purchase"} Return</DialogTitle></DialogHeader>
          {showForm&&<ReturnForm type={showForm} onClose={()=>setShowForm(null)}/>}
        </DialogContent>
      </Dialog>
    </div>
  );
}
