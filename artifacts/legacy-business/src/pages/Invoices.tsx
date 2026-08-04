import { useState, useRef, useEffect, useCallback } from "react";
import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { apiFetch } from "../lib/auth";
import { useAuth } from "../contexts/AuthContext";
import { printInvoice } from "../lib/pdf";
import { exportInvoices } from "../lib/excel";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogFooter } from "@/components/ui/dialog";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { DropdownMenu, DropdownMenuContent, DropdownMenuItem, DropdownMenuSeparator, DropdownMenuTrigger } from "@/components/ui/dropdown-menu";
import { Badge } from "@/components/ui/badge";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { Plus, Search, FileText, MoreHorizontal, Edit, Trash2, CheckCircle, Clock, AlertCircle, Download, FileDown, Printer, Eye, MessageCircle, X, Package, Scan } from "lucide-react";
import { useToast } from "@/hooks/use-toast";
import { format } from "date-fns";

const STATUS_OPTS = ["draft","pending","paid","overdue","cancelled"];
const INVOICE_TYPES = [
  { value: "gst_invoice", label: "GST Tax Invoice" },
  { value: "quotation", label: "Quotation" },
  { value: "proforma", label: "Proforma Invoice" },
  { value: "credit_note", label: "Credit Note" },
  { value: "debit_note", label: "Debit Note" },
  { value: "purchase", label: "Purchase Invoice" },
];
const fmt = (n: number) => new Intl.NumberFormat("en-IN",{maximumFractionDigits:0}).format(n);
const EMPTY_ITEM = { description:"", quantity:1, unitPrice:0, amount:0, hsnCode:"", gstRate:"18", productId:undefined as number|undefined, variantId:undefined as number|undefined, currentStock:undefined as number|undefined };

function statusBadge(s: string) {
  const m: Record<string,[string,string]> = {
    paid:["bg-emerald-500/15 text-emerald-400 border-emerald-500/30","Paid"],
    pending:["bg-blue-500/15 text-blue-400 border-blue-500/30","Pending"],
    overdue:["bg-red-500/15 text-red-400 border-red-500/30","Overdue"],
    draft:["bg-muted text-muted-foreground","Draft"],
    cancelled:["bg-muted text-muted-foreground","Cancelled"],
  };
  const [cls,label]=m[s]||["bg-muted text-muted-foreground",s];
  return <Badge className={cls}>{label}</Badge>;
}

const EMPTY_FORM = ()=>({
  invoiceType:"gst_invoice", customerName:"", customerId:undefined as number|undefined,
  customerGst:"", customerAddress:"", status:"draft",
  invoiceDate: new Date().toISOString().split("T")[0],
  dueDate:format(new Date(Date.now()+30*86400000),"yyyy-MM-dd"),
  notes:"Thank you for your business!", termsConditions:"",
  gstRate:"18", discount:"0", isInterstate:false, paymentMethod:"",
});

function ProductSearchPopup({ onSelect, onClose }: { onSelect:(p:any)=>void; onClose:()=>void }) {
  const [q,setQ]=useState("");
  const inputRef=useRef<HTMLInputElement>(null);
  const { data:results=[], isLoading } = useQuery({
    queryKey:["product-search",q],
    queryFn:()=>q.length>=1?apiFetch(`/products/search?q=${encodeURIComponent(q)}`).then(r=>r.json()):[],
    enabled:q.length>=1,
  });
  useEffect(()=>{ inputRef.current?.focus(); },[]);
  return (
    <div className="absolute z-50 top-full left-0 w-full min-w-72 bg-card border rounded-lg shadow-2xl mt-1 overflow-hidden">
      <div className="p-2 border-b flex items-center gap-2">
        <Search className="w-4 h-4 text-muted-foreground flex-shrink-0"/>
        <input ref={inputRef} value={q} onChange={e=>setQ(e.target.value)} placeholder="Search products or scan barcode..." className="flex-1 bg-transparent outline-none text-sm"/>
        <button onClick={onClose} className="text-muted-foreground hover:text-foreground"><X className="w-4 h-4"/></button>
      </div>
      <div className="max-h-64 overflow-y-auto">
        {isLoading&&<div className="p-3 text-sm text-muted-foreground text-center">Searching...</div>}
        {!isLoading&&q.length>=1&&(results as any[]).length===0&&<div className="p-3 text-sm text-muted-foreground text-center">No products found</div>}
        {(results as any[]).map((p:any,i:number)=>(
          <button key={i} className="w-full text-left px-3 py-2 hover:bg-muted/60 transition-colors flex items-center gap-3 border-b border-muted/30" onClick={()=>{onSelect(p);onClose();}}>
            <Package className="w-4 h-4 text-muted-foreground flex-shrink-0"/>
            <div className="flex-1 min-w-0">
              <div className="text-sm font-medium truncate">{p.name}</div>
              <div className="text-xs text-muted-foreground">₹{fmt(p.sellingPrice||0)} · Stock: {p.currentStock} · GST: {p.gstRate}%</div>
            </div>
            {p.type==="variant"&&<Badge className="text-xs bg-purple-500/15 text-purple-400">Variant</Badge>}
          </button>
        ))}
      </div>
    </div>
  );
}

function WhatsAppDialog({ inv, company, open, onClose, defaultPhone }: { inv:any; company:any; open:boolean; onClose:()=>void; defaultPhone?:string }) {
  const [phone, setPhone] = useState(defaultPhone || "");
  const { toast } = useToast();

  // Pre-fill phone from customer's WhatsApp/mobile when dialog opens
  useEffect(() => { if (open) setPhone(defaultPhone || ""); }, [open, defaultPhone]);

  const handleSend = () => {
    const clean = phone.replace(/[^0-9]/g, "");
    if (!clean) return;
    const biz = company?.name || "Legacy Business ERP";
    const amt = new Intl.NumberFormat("en-IN", { maximumFractionDigits: 0 }).format(Number(inv.total || 0));
    const status = (inv.paymentStatus || inv.status || "pending").toUpperCase();
    const lines: string[] = [
      `Hello! 👋`,
      ``,
      `Please find your invoice from *${biz}*:`,
      ``,
      `📄 *Invoice No:* ${inv.invoiceNumber}`,
      `📅 *Date:* ${inv.invoiceDate || "—"}`,
      `💰 *Amount:* ₹${amt}`,
      `📊 *Status:* ${status}`,
      ...(inv.dueDate ? [`⏰ *Due Date:* ${inv.dueDate}`] : []),
      ...(inv.customerName ? [`👤 *Customer:* ${inv.customerName}`] : []),
      ``,
      `Thank you for your business! 🙏`,
      `_${biz}_`,
    ];
    window.open(`https://wa.me/${clean}?text=${encodeURIComponent(lines.join("\n"))}`, "_blank", "noopener,noreferrer");
    toast({ title: "WhatsApp opened!", description: "Complete sending from your WhatsApp." });
    onClose();
    setPhone("");
  };

  if (!inv) return null;
  return (
    <Dialog open={open} onOpenChange={() => { onClose(); setPhone(""); }}>
      <DialogContent className="max-w-md">
        <DialogHeader>
          <DialogTitle className="flex items-center gap-2">
            <MessageCircle className="w-5 h-5 text-green-500" />
            Share Invoice via WhatsApp
          </DialogTitle>
        </DialogHeader>
        <div className="space-y-4">
          <div className="bg-green-500/10 border border-green-500/20 rounded-lg p-3 text-sm">
            <p className="font-semibold">{inv.invoiceNumber}</p>
            <p className="text-muted-foreground mt-0.5">₹{fmt(Number(inv.total || 0))} · {statusBadge(inv.paymentStatus || inv.status)}</p>
          </div>
          <div className="grid gap-2">
            <Label>Customer WhatsApp Number</Label>
            <Input
              placeholder="919876543210 (country code + number)"
              value={phone}
              onChange={e => setPhone(e.target.value)}
              onKeyDown={e => { if (e.key === "Enter") handleSend(); }}
              autoFocus
            />
            <p className="text-xs text-muted-foreground">For India: 91 followed by 10-digit number (e.g. 919876543210)</p>
          </div>
          <div className="bg-muted/40 rounded-lg p-3 text-xs space-y-1">
            <p className="font-semibold text-foreground text-sm">How it works</p>
            <p className="text-muted-foreground">Clicking "Open WhatsApp" will launch WhatsApp Web or your app with a ready-to-send invoice message. Simply tap Send — no API key or setup needed.</p>
          </div>
        </div>
        <DialogFooter>
          <Button variant="outline" onClick={() => { onClose(); setPhone(""); }}>Cancel</Button>
          <Button onClick={handleSend} disabled={!phone.trim()} className="bg-green-600 hover:bg-green-700 text-white">
            <MessageCircle className="w-4 h-4 mr-2" />
            Open WhatsApp
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}

function InvoiceViewDialog({ inv, company, open, onClose, onWhatsApp }: { inv:any; company:any; open:boolean; onClose:()=>void; onWhatsApp:()=>void }) {
  if (!inv) return null;
  const items = Array.isArray(inv.items) ? inv.items : [];
  return (
    <Dialog open={open} onOpenChange={onClose}>
      <DialogContent className="max-w-2xl max-h-[92vh] overflow-y-auto">
        <DialogHeader>
          <div className="flex items-center justify-between">
            <DialogTitle>{inv.invoiceNumber}</DialogTitle>
            <div className="flex gap-2 mr-6">
              <Button size="sm" variant="outline" onClick={()=>printInvoice(inv, company)}>
                <Printer className="w-4 h-4 mr-1"/>Print/PDF
              </Button>
              <Button size="sm" variant="outline" className="text-green-500 border-green-500/30 hover:bg-green-500/10" onClick={onWhatsApp}>
                <MessageCircle className="w-4 h-4 mr-1"/>WhatsApp
              </Button>
            </div>
          </div>
        </DialogHeader>
        <div className="space-y-4 text-sm">
          <div className="grid grid-cols-2 gap-4">
            <div className="bg-muted/40 rounded-lg p-3">
              <p className="text-xs text-muted-foreground uppercase tracking-wide font-semibold mb-2">Bill To</p>
              <p className="font-semibold">{inv.customerName || "—"}</p>
              {inv.customerGst && <p className="text-muted-foreground">GST: {inv.customerGst}</p>}
              {inv.customerAddress && <p className="text-muted-foreground">{inv.customerAddress}</p>}
            </div>
            <div className="bg-muted/40 rounded-lg p-3">
              <p className="text-xs text-muted-foreground uppercase tracking-wide font-semibold mb-2">Invoice Details</p>
              <p><span className="text-muted-foreground">Date: </span>{inv.invoiceDate || "—"}</p>
              <p><span className="text-muted-foreground">Due: </span>{inv.dueDate || "—"}</p>
              <p><span className="text-muted-foreground">Status: </span>{statusBadge(inv.paymentStatus || inv.status)}</p>
            </div>
          </div>
          <Table>
            <TableHeader><TableRow className="bg-muted/40"><TableHead>Description</TableHead><TableHead className="text-center">Qty</TableHead><TableHead className="text-right">Rate</TableHead><TableHead className="text-right">Amount</TableHead></TableRow></TableHeader>
            <TableBody>
              {items.map((it:any,i:number)=>(
                <TableRow key={i}><TableCell>{it.description}</TableCell><TableCell className="text-center">{it.quantity}</TableCell><TableCell className="text-right">₹{fmt(Number(it.unitPrice||0))}</TableCell><TableCell className="text-right font-semibold">₹{fmt(Number(it.amount||0))}</TableCell></TableRow>
              ))}
            </TableBody>
          </Table>
          <div className="ml-auto w-64 space-y-1.5 bg-muted/20 rounded-lg p-3">
            <div className="flex justify-between text-muted-foreground"><span>Subtotal</span><span>₹{fmt(Number(inv.subtotal||0))}</span></div>
            {Number(inv.discountAmount)>0 && <div className="flex justify-between text-emerald-500"><span>Discount</span><span>−₹{fmt(Number(inv.discountAmount))}</span></div>}
            {Number(inv.cgst)>0 && <div className="flex justify-between text-blue-500"><span>CGST</span><span>₹{fmt(Number(inv.cgst))}</span></div>}
            {Number(inv.sgst)>0 && <div className="flex justify-between text-blue-500"><span>SGST</span><span>₹{fmt(Number(inv.sgst))}</span></div>}
            {Number(inv.igst)>0 && <div className="flex justify-between text-blue-500"><span>IGST</span><span>₹{fmt(Number(inv.igst))}</span></div>}
            <div className="flex justify-between font-bold text-base border-t pt-2 mt-2"><span>Total</span><span>₹{fmt(Number(inv.total||0))}</span></div>
          </div>
          {inv.notes && <div className="text-sm text-muted-foreground bg-muted/20 rounded p-3"><strong>Notes: </strong>{inv.notes}</div>}
        </div>
      </DialogContent>
    </Dialog>
  );
}

export default function Invoices() {
  const qc = useQueryClient();
  const { toast } = useToast();
  const { company } = useAuth();
  const [activeTab, setActiveTab] = useState("gst_invoice");
  const [search,setSearch]=useState("");
  const [open,setOpen]=useState(false);
  const [viewInv,setViewInv]=useState<any>(null);
  const [waInv,setWaInv]=useState<any>(null);
  const [editing,setEditing]=useState<any>(null);
  const [form,setForm]=useState(EMPTY_FORM());
  const [items,setItems]=useState([{...EMPTY_ITEM}]);
  const [searchPopupIdx,setSearchPopupIdx]=useState<number|null>(null);
  const [barcodeVal,setBarcodeVal]=useState("");
  const barcodeRef=useRef<HTMLInputElement>(null);

  const { data: summary } = useQuery({ queryKey:["invoice-summary"], queryFn:()=>apiFetch("/invoices/summary").then(r=>r.json()) });
  const { data: customers=[] } = useQuery({ queryKey:["customers"], queryFn:()=>apiFetch("/customers").then(r=>r.json()) });
  const { data: invoices=[], isLoading } = useQuery({
    queryKey:["invoices",activeTab],
    queryFn:()=>apiFetch(`/invoices?type=${activeTab}`).then(r=>r.json()),
  });

  const save = useMutation({
    mutationFn:(d:any)=>editing
      ?apiFetch(`/invoices/${editing.id}`,{method:"PATCH",body:JSON.stringify(d)}).then(r=>r.json())
      :apiFetch("/invoices",{method:"POST",body:JSON.stringify(d)}).then(r=>r.json()),
    onSuccess:(data)=>{
      qc.invalidateQueries({queryKey:["invoices"]});
      qc.invalidateQueries({queryKey:["invoice-summary"]});
      qc.invalidateQueries({queryKey:["products"]});
      setOpen(false);
      toast({title:editing?"Invoice updated":"Invoice created"});
      if(!editing && data?.id) setViewInv({...data,items});
    },
    onError:()=>toast({title:"Failed",variant:"destructive"}),
  });
  const del = useMutation({
    mutationFn:(id:number)=>apiFetch(`/invoices/${id}`,{method:"DELETE"}),
    onSuccess:()=>{qc.invalidateQueries({queryKey:["invoices"]});qc.invalidateQueries({queryKey:["invoice-summary"]});toast({title:"Invoice deleted"});},
  });
  const markPaid = useMutation({
    mutationFn:(id:number)=>apiFetch(`/invoices/${id}`,{method:"PATCH",body:JSON.stringify({paymentStatus:"paid",status:"paid"})}).then(r=>r.json()),
    onSuccess:()=>{qc.invalidateQueries({queryKey:["invoices"]});toast({title:"Marked as paid"});},
  });

  const sub = items.reduce((s,i)=>s+i.amount,0);
  const discPct = parseFloat(form.discount||"0");
  const discAmt = (sub*discPct)/100;
  const afterDisc = sub-discAmt;
  const gstPct = parseFloat(form.gstRate||"0");
  const gstAmount = (afterDisc*gstPct)/100;
  const cgst = form.isInterstate ? 0 : gstAmount/2;
  const sgst = form.isInterstate ? 0 : gstAmount/2;
  const igst = form.isInterstate ? gstAmount : 0;
  const total = afterDisc+gstAmount;

  useEffect(()=>{if(open){setTimeout(()=>barcodeRef.current?.focus(),150);}else{setBarcodeVal("");}},[open]);

  const scanBarcode=useCallback(async(code:string)=>{
    const c=code.trim();
    if(!c) return;
    try{
      const resp=await apiFetch(`/products/barcode/${encodeURIComponent(c)}`);
      if(!resp.ok){toast({title:"Product not found",description:`No product for barcode: ${c}`,variant:"destructive"});setBarcodeVal("");return;}
      const p=await resp.json();
      const existingIdx=items.findIndex(it=>it.productId===p.productId&&(it.variantId??null)===(p.variantId??null)&&p.productId);
      if(existingIdx>=0){
        setItems(prev=>prev.map((it,i)=>i===existingIdx?{...it,quantity:Number(it.quantity)+1,amount:(Number(it.quantity)+1)*Number(it.unitPrice)}:it));
        toast({title:`Qty +1: ${p.name}`,description:`Qty now ${items[existingIdx].quantity+1}`});
      } else {
        const sp=Number(p.sellingPrice||0);
        const newLine={description:p.name,quantity:1,unitPrice:sp,amount:sp,hsnCode:p.hsnCode||"",gstRate:String(p.gstRate||"18"),productId:p.productId,variantId:p.variantId||undefined,currentStock:p.currentStock??undefined};
        setItems(prev=>{
          const last=prev[prev.length-1];
          if(!last.description&&last.quantity===1&&last.unitPrice===0) return prev.map((it,i)=>i===prev.length-1?newLine:it);
          return [...prev,newLine];
        });
        if(p.gstRate) setForm(f=>({...f,gstRate:String(p.gstRate)}));
        toast({title:`Added: ${p.name}`,description:`₹${sp.toLocaleString("en-IN")} · Stock: ${p.currentStock}${p.hasBatchPrice?" · Batch price":""}`,});
      }
    }catch{toast({title:"Scan failed",variant:"destructive"});}
    setBarcodeVal("");
  },[items,toast]);

  const openCreate=()=>{setEditing(null);setForm({...EMPTY_FORM(),invoiceType:activeTab});setItems([{...EMPTY_ITEM}]);setBarcodeVal("");setOpen(true);};
  const openEdit=(inv:any)=>{
    setEditing(inv);
    setForm({
      invoiceType:inv.invoiceType||"gst_invoice",
      customerName:inv.customerName||"",customerId:inv.customerId,
      customerGst:inv.customerGst||"",customerAddress:inv.customerAddress||"",
      status:inv.paymentStatus||inv.status||"draft",
      invoiceDate:inv.invoiceDate||new Date().toISOString().split("T")[0],
      dueDate:inv.dueDate||format(new Date(Date.now()+30*86400000),"yyyy-MM-dd"),
      notes:inv.notes||"",termsConditions:inv.termsConditions||"",
      gstRate:"18",discount:"0",isInterstate:false,paymentMethod:inv.paymentMethod||"",
    });
    setItems(inv.items?.length?inv.items:[{...EMPTY_ITEM}]);
    setOpen(true);
  };

  const updateItem=(idx:number,field:string,val:string|number)=>setItems(prev=>prev.map((it,i)=>{
    if(i!==idx)return it;
    const u={...it,[field]:field==="description"||field==="hsnCode"||field==="gstRate"?val:Number(val)};
    if(field==="quantity"||field==="unitPrice") u.amount=Number(u.quantity)*Number(u.unitPrice);
    return u;
  }));

  const selectProduct=(idx:number, p:any)=>{
    setItems(prev=>prev.map((it,i)=>{
      if(i!==idx) return it;
      const qty = Number(it.quantity)||1;
      return {
        ...it,
        description:p.name,
        unitPrice:Number(p.sellingPrice||0),
        amount:qty*Number(p.sellingPrice||0),
        hsnCode:p.hsnCode||"",
        gstRate:String(p.gstRate||"18"),
        productId:p.productId,
        variantId:p.variantId||undefined,
        currentStock:p.currentStock??undefined,
      };
    }));
    if(p.gstRate) setForm(f=>({...f,gstRate:String(p.gstRate)}));
  };

  const handleSave=()=>{
    const payload:any={
      invoiceType:form.invoiceType,
      status:form.status,paymentStatus:form.status,
      invoiceDate:form.invoiceDate,
      dueDate:form.dueDate||undefined,
      notes:form.notes||undefined,
      termsConditions:form.termsConditions||undefined,
      items,
      gstRate:parseFloat(form.gstRate||"0"),
      discountAmount:discAmt,
      isInterstate:form.isInterstate,
      paymentMethod:form.paymentMethod||undefined,
    };
    if(form.customerId) payload.customerId=form.customerId;
    if(form.customerName) payload.customerName=form.customerName;
    if(form.customerGst) payload.customerGst=form.customerGst;
    if(form.customerAddress) payload.customerAddress=form.customerAddress;
    save.mutate(payload);
  };

  const filtered=(invoices as any[]).filter((inv:any)=>
    inv.invoiceNumber?.toLowerCase().includes(search.toLowerCase())||
    (inv.customerName??"").toLowerCase().includes(search.toLowerCase())
  );

  const typeLabel = INVOICE_TYPES.find(t=>t.value===activeTab)?.label || "Invoice";

  return (
    <div className="space-y-5">
      <div className="flex items-center justify-between flex-wrap gap-3">
        <div><h1 className="text-2xl font-bold">Billing & Invoices</h1><p className="text-muted-foreground text-sm">GST invoices, quotations, credit/debit notes</p></div>
        <div className="flex gap-2">
          <Button variant="outline" size="sm" onClick={()=>exportInvoices(invoices as any[])}>
            <FileDown className="w-4 h-4 mr-1"/>Export Excel
          </Button>
          <Button onClick={openCreate}><Plus className="w-4 h-4 mr-2"/>New {typeLabel}</Button>
        </div>
      </div>

      <div className="grid grid-cols-2 md:grid-cols-4 gap-3">
        {[
          {label:"Paid",value:summary?.totalPaid??0,count:summary?.countPaid??0,icon:CheckCircle,color:"text-emerald-400"},
          {label:"Pending",value:summary?.totalPending??0,count:summary?.countPending??0,icon:Clock,color:"text-blue-400"},
          {label:"Overdue",value:summary?.totalOverdue??0,count:summary?.countOverdue??0,icon:AlertCircle,color:"text-red-400"},
          {label:"Total Invoices",value:(summary?.countPaid??0)+(summary?.countPending??0),count:0,icon:FileText,color:"text-purple-400"},
        ].map(s=>(
          <Card key={s.label} className="bg-card/50"><CardHeader className="flex flex-row items-center justify-between pb-1 pt-3 px-4"><CardTitle className="text-xs text-muted-foreground">{s.label}</CardTitle><s.icon className={`w-4 h-4 ${s.color}`}/></CardHeader>
            <CardContent className="pb-3 px-4"><div className={`text-xl font-bold ${s.color}`}>₹{fmt(s.value)}</div>{s.count>0&&<div className="text-xs text-muted-foreground">{s.count} records</div>}</CardContent>
          </Card>
        ))}
      </div>

      <Tabs value={activeTab} onValueChange={setActiveTab}>
        <TabsList className="flex-wrap h-auto gap-1">
          {INVOICE_TYPES.map(t=><TabsTrigger key={t.value} value={t.value} className="text-xs">{t.label}</TabsTrigger>)}
        </TabsList>

        {INVOICE_TYPES.map(t=>(
          <TabsContent key={t.value} value={t.value}>
            <div className="flex gap-3 mb-3">
              <div className="relative flex-1 max-w-sm"><Search className="absolute left-2.5 top-2.5 h-4 w-4 text-muted-foreground"/><Input placeholder={`Search ${t.label}...`} className="pl-9" value={search} onChange={e=>setSearch(e.target.value)}/></div>
            </div>
            <Card>
              <Table>
                <TableHeader><TableRow><TableHead>Number</TableHead><TableHead>Customer</TableHead><TableHead className="text-right">Amount</TableHead><TableHead>Status</TableHead><TableHead>Date</TableHead><TableHead className="w-10"/></TableRow></TableHeader>
                <TableBody>
                  {isLoading?<TableRow><TableCell colSpan={6} className="text-center py-8 text-muted-foreground">Loading...</TableCell></TableRow>
                  :filtered.length===0?<TableRow><TableCell colSpan={6} className="text-center py-12">
                    <div className="flex flex-col items-center text-muted-foreground">
                      <FileText className="w-10 h-10 mb-2 opacity-30"/><p>No {t.label} found</p>
                      <Button variant="outline" size="sm" className="mt-3" onClick={openCreate}><Plus className="w-4 h-4 mr-1"/>Create {t.label}</Button>
                    </div>
                  </TableCell></TableRow>
                  :filtered.map((inv:any)=>(
                    <TableRow key={inv.id} className="hover:bg-muted/40 cursor-pointer" onClick={()=>setViewInv(inv)}>
                      <TableCell className="font-mono text-sm font-semibold">{inv.invoiceNumber}</TableCell>
                      <TableCell>{inv.customerName||<span className="text-muted-foreground italic text-sm">—</span>}</TableCell>
                      <TableCell className="text-right font-semibold">₹{fmt(Number(inv.total||0))}</TableCell>
                      <TableCell onClick={e=>e.stopPropagation()}>{statusBadge(inv.paymentStatus||inv.status)}</TableCell>
                      <TableCell className="text-muted-foreground text-sm">{inv.invoiceDate||"—"}</TableCell>
                      <TableCell onClick={e=>e.stopPropagation()}>
                        <DropdownMenu>
                          <DropdownMenuTrigger asChild><Button variant="ghost" size="icon" className="h-8 w-8"><MoreHorizontal className="h-4 w-4"/></Button></DropdownMenuTrigger>
                          <DropdownMenuContent align="end">
                            <DropdownMenuItem onClick={()=>setViewInv(inv)}><Eye className="h-4 w-4 mr-2"/>View</DropdownMenuItem>
                            <DropdownMenuItem onClick={()=>printInvoice(inv, company)}><Printer className="h-4 w-4 mr-2"/>Print / PDF</DropdownMenuItem>
                            <DropdownMenuItem onClick={()=>setWaInv(inv)}><MessageCircle className="h-4 w-4 mr-2"/>WhatsApp</DropdownMenuItem>
                            <DropdownMenuItem onClick={()=>openEdit(inv)}><Edit className="h-4 w-4 mr-2"/>Edit</DropdownMenuItem>
                            {(inv.paymentStatus!=="paid"&&inv.status!=="paid")&&<DropdownMenuItem onClick={()=>markPaid.mutate(inv.id)}><CheckCircle className="h-4 w-4 mr-2"/>Mark Paid</DropdownMenuItem>}
                            <DropdownMenuSeparator/>
                            <DropdownMenuItem className="text-destructive" onClick={()=>del.mutate(inv.id)}><Trash2 className="h-4 w-4 mr-2"/>Delete</DropdownMenuItem>
                          </DropdownMenuContent>
                        </DropdownMenu>
                      </TableCell>
                    </TableRow>
                  ))}
                </TableBody>
              </Table>
            </Card>
          </TabsContent>
        ))}
      </Tabs>

      <InvoiceViewDialog inv={viewInv} company={company} open={!!viewInv} onClose={()=>setViewInv(null)} onWhatsApp={()=>{setWaInv(viewInv);setViewInv(null);}} />
      <WhatsAppDialog inv={waInv} company={company} open={!!waInv} onClose={()=>setWaInv(null)} defaultPhone={(customers as any[]).find((c:any)=>c.id===waInv?.customerId)?.whatsappNumber || (customers as any[]).find((c:any)=>c.id===waInv?.customerId)?.mobile || ""} />

      <Dialog open={open} onOpenChange={setOpen}>
        <DialogContent className="max-w-4xl max-h-[95vh] overflow-y-auto">
          <DialogHeader><DialogTitle>{editing?`Edit ${editing.invoiceNumber}`:`New ${INVOICE_TYPES.find(t=>t.value===form.invoiceType)?.label||"Invoice"}`}</DialogTitle></DialogHeader>
          <div className="grid gap-4 py-2">
            <div className="grid grid-cols-2 gap-3">
              <div className="grid gap-2">
                <Label>Invoice Type</Label>
                <Select value={form.invoiceType} onValueChange={v=>setForm(f=>({...f,invoiceType:v}))}>
                  <SelectTrigger><SelectValue/></SelectTrigger>
                  <SelectContent>{INVOICE_TYPES.map(t=><SelectItem key={t.value} value={t.value}>{t.label}</SelectItem>)}</SelectContent>
                </Select>
              </div>
              <div className="grid gap-2">
                <Label>Customer</Label>
                <Select value={form.customerId?String(form.customerId):"__manual__"} onValueChange={v=>{
                  if(v==="__manual__") setForm(f=>({...f,customerId:undefined}));
                  else{const c=(customers as any[]).find((c:any)=>c.id===Number(v));setForm(f=>({...f,customerId:Number(v),customerName:c?.name||"",customerGst:c?.gstNumber||"",customerAddress:c?.address||""}));}
                }}>
                  <SelectTrigger><SelectValue placeholder="Select customer"/></SelectTrigger>
                  <SelectContent><SelectItem value="__manual__">Enter manually</SelectItem>{(customers as any[]).map((c:any)=><SelectItem key={c.id} value={String(c.id)}>{c.name}</SelectItem>)}</SelectContent>
                </Select>
                {!form.customerId&&<Input placeholder="Customer name" value={form.customerName} onChange={e=>setForm(f=>({...f,customerName:e.target.value}))}/>}
              </div>
              <div className="grid gap-2"><Label>Customer GSTIN</Label><Input placeholder="29AABCS1234B1ZB" value={form.customerGst} onChange={e=>setForm(f=>({...f,customerGst:e.target.value}))}/></div>
              <div className="grid gap-2"><Label>Customer Address</Label><Input placeholder="Address" value={form.customerAddress} onChange={e=>setForm(f=>({...f,customerAddress:e.target.value}))}/></div>
              <div className="grid gap-2">
                <Label>Status</Label>
                <Select value={form.status} onValueChange={v=>setForm(f=>({...f,status:v}))}>
                  <SelectTrigger><SelectValue/></SelectTrigger>
                  <SelectContent>{STATUS_OPTS.map(s=><SelectItem key={s} value={s} className="capitalize">{s}</SelectItem>)}</SelectContent>
                </Select>
              </div>
              <div className="grid gap-2"><Label>Payment Method</Label>
                <Select value={form.paymentMethod||"none"} onValueChange={v=>setForm(f=>({...f,paymentMethod:v==="none"?"":v}))}>
                  <SelectTrigger><SelectValue placeholder="Select method"/></SelectTrigger>
                  <SelectContent><SelectItem value="none">—</SelectItem><SelectItem value="cash">Cash</SelectItem><SelectItem value="upi">UPI</SelectItem><SelectItem value="card">Card</SelectItem><SelectItem value="bank">Bank Transfer</SelectItem><SelectItem value="cheque">Cheque</SelectItem></SelectContent>
                </Select>
              </div>
              <div className="grid gap-2"><Label>Invoice Date</Label><Input type="date" value={form.invoiceDate} onChange={e=>setForm(f=>({...f,invoiceDate:e.target.value}))}/></div>
              <div className="grid gap-2"><Label>Due Date</Label><Input type="date" value={form.dueDate} onChange={e=>setForm(f=>({...f,dueDate:e.target.value}))}/></div>
            </div>

            <div className="grid gap-2">
              <div className="flex items-center gap-2 bg-muted/30 border border-dashed border-green-500/40 rounded-lg px-3 py-2">
                <Scan className="w-4 h-4 text-green-500 flex-shrink-0"/>
                <input
                  ref={barcodeRef}
                  type="text"
                  value={barcodeVal}
                  onChange={e=>setBarcodeVal(e.target.value)}
                  onKeyDown={e=>{if(e.key==="Enter"){e.preventDefault();scanBarcode(barcodeVal);}}}
                  placeholder="Scan barcode here (USB/wireless scanner) or type barcode + Enter..."
                  className="flex-1 bg-transparent outline-none text-sm placeholder:text-muted-foreground/60"
                />
                {barcodeVal&&<button type="button" onClick={()=>setBarcodeVal("")} className="text-muted-foreground hover:text-foreground"><X className="w-3.5 h-3.5"/></button>}
                <span className="text-xs text-muted-foreground/60 flex-shrink-0 hidden sm:block">Price from latest batch</span>
              </div>
              <div className="flex items-center justify-between">
                <Label>Line Items <span className="text-xs text-muted-foreground font-normal ml-2">— Click on Description to search/type manually</span></Label>
                <Button type="button" variant="outline" size="sm" onClick={()=>setItems(prev=>[...prev,{...EMPTY_ITEM}])}><Plus className="w-3 h-3 mr-1"/>Add Line</Button>
              </div>
              <div className="rounded-lg border overflow-hidden">
                <Table>
                  <TableHeader><TableRow className="bg-muted/40"><TableHead>Description (click to search)</TableHead><TableHead className="w-14 text-right">Qty</TableHead><TableHead className="w-28 text-right">Unit Price</TableHead><TableHead className="w-12 text-center">GST%</TableHead><TableHead className="w-28 text-right">Amount</TableHead><TableHead className="w-8"/></TableRow></TableHeader>
                  <TableBody>
                    {items.map((item,idx)=>(
                      <TableRow key={idx}>
                        <TableCell className="p-1">
                          <div className="relative">
                            <Input
                              className="h-8 border-0 shadow-none focus-visible:ring-0 bg-transparent cursor-text"
                              value={item.description}
                              onChange={e=>updateItem(idx,"description",e.target.value)}
                              onFocus={()=>setSearchPopupIdx(idx)}
                              placeholder="Click to search or type manually..."
                            />
                            {searchPopupIdx===idx&&(
                              <ProductSearchPopup
                                onSelect={(p)=>selectProduct(idx,p)}
                                onClose={()=>setSearchPopupIdx(null)}
                              />
                            )}
                          </div>
                        </TableCell>
                        <TableCell className="p-1">
                          <Input className="h-8 border-0 shadow-none focus-visible:ring-0 text-right bg-transparent" type="number" min="1" value={item.quantity} onChange={e=>updateItem(idx,"quantity",e.target.value)}/>
                          {item.currentStock !== undefined && Number(item.quantity) > item.currentStock && (
                            <p className="text-xs text-red-500 text-right pr-1 mt-0.5 whitespace-nowrap">Only {item.currentStock} in stock</p>
                          )}
                        </TableCell>
                        <TableCell className="p-1"><Input className="h-8 border-0 shadow-none focus-visible:ring-0 text-right bg-transparent" type="number" min="0" step="0.01" value={item.unitPrice} onChange={e=>updateItem(idx,"unitPrice",e.target.value)}/></TableCell>
                        <TableCell className="p-1">
                          <Select value={item.gstRate} onValueChange={v=>updateItem(idx,"gstRate",v)}>
                            <SelectTrigger className="h-8 border-0 shadow-none focus-visible:ring-0 bg-transparent text-xs"><SelectValue/></SelectTrigger>
                            <SelectContent>{["0","5","12","18","28"].map(v=><SelectItem key={v} value={v}>{v}%</SelectItem>)}</SelectContent>
                          </Select>
                        </TableCell>
                        <TableCell className="p-1 text-right text-sm font-semibold pr-3">₹{fmt(item.amount)}</TableCell>
                        <TableCell className="p-1">{items.length>1&&<button type="button" className="h-7 w-7 flex items-center justify-center text-muted-foreground hover:text-destructive rounded" onClick={()=>setItems(prev=>prev.filter((_,i)=>i!==idx))}>×</button>}</TableCell>
                      </TableRow>
                    ))}
                  </TableBody>
                </Table>
              </div>
            </div>

            <div className="rounded-xl border bg-muted/20 p-4 space-y-2">
              <div className="flex gap-6 mb-3 flex-wrap">
                <div className="flex items-center gap-2">
                  <Label className="text-sm text-muted-foreground">Discount</Label>
                  <Input type="number" min="0" max="100" value={form.discount} onChange={e=>setForm(f=>({...f,discount:e.target.value}))} className="w-20 h-8 text-sm"/>
                  <span className="text-muted-foreground text-sm">%</span>
                </div>
                <div className="flex items-center gap-2">
                  <Label className="text-sm text-muted-foreground">Invoice GST</Label>
                  <div className="flex gap-1">{["0","5","12","18","28"].map(v=><button key={v} type="button" onClick={()=>setForm(f=>({...f,gstRate:v}))} className={`px-2 py-1 rounded text-xs font-medium transition-colors ${form.gstRate===v?"bg-primary text-primary-foreground":"bg-background border hover:bg-muted"}`}>{v}%</button>)}</div>
                </div>
                <div className="flex items-center gap-2">
                  <Label className="text-sm text-muted-foreground">Interstate</Label>
                  <input type="checkbox" checked={form.isInterstate} onChange={e=>setForm(f=>({...f,isInterstate:e.target.checked}))} className="w-4 h-4 rounded"/>
                </div>
              </div>
              {discPct>0&&<div className="flex justify-between text-sm text-emerald-500"><span>Discount ({discPct}%)</span><span>−₹{fmt(discAmt)}</span></div>}
              {!form.isInterstate&&gstPct>0&&<>
                <div className="flex justify-between text-sm text-blue-500"><span>CGST ({gstPct/2}%)</span><span>+₹{fmt(cgst)}</span></div>
                <div className="flex justify-between text-sm text-blue-500"><span>SGST ({gstPct/2}%)</span><span>+₹{fmt(sgst)}</span></div>
              </>}
              {form.isInterstate&&gstPct>0&&<div className="flex justify-between text-sm text-blue-500"><span>IGST ({gstPct}%)</span><span>+₹{fmt(igst)}</span></div>}
              <div className="flex justify-between font-bold border-t pt-2 mt-1 text-base"><span>Total</span><span>₹{fmt(total)}</span></div>
            </div>

            <div className="grid grid-cols-2 gap-3">
              <div className="grid gap-2"><Label>Notes</Label><Textarea placeholder="Payment terms, notes..." value={form.notes} onChange={e=>setForm(f=>({...f,notes:e.target.value}))} rows={2}/></div>
              <div className="grid gap-2"><Label>Terms & Conditions</Label><Textarea placeholder="Terms and conditions..." value={form.termsConditions} onChange={e=>setForm(f=>({...f,termsConditions:e.target.value}))} rows={2}/></div>
            </div>
          </div>
          <DialogFooter>
            <Button variant="outline" onClick={()=>setOpen(false)}>Cancel</Button>
            <Button onClick={handleSave} disabled={save.isPending}>{editing?"Update":"Create"}</Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </div>
  );
}
