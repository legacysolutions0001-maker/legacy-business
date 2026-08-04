import React, { useState, useRef, useEffect } from "react";
import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { apiFetch, apiJson } from "../lib/auth";
import { Card, CardContent } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogFooter } from "@/components/ui/dialog";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { DropdownMenu, DropdownMenuContent, DropdownMenuItem, DropdownMenuTrigger } from "@/components/ui/dropdown-menu";
import { Badge } from "@/components/ui/badge";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { Plus, Search, Package, MoreHorizontal, Edit, Trash2, FileDown, ChevronDown, ChevronRight, Layers, Printer, ArrowDownToLine, Boxes } from "lucide-react";
import { exportProducts } from "../lib/excel";
import { useToast } from "@/hooks/use-toast";
import { cn } from "@/lib/utils";

const CATEGORIES = ["Electronics","Furniture","Stationery","Clothing","Food","Medicine","Cosmetics","Tools","Auto Parts","Beverages","Personal Care","Agrochemicals","FMCG","Other"];
const GST_RATES = ["0","5","12","18","28"];
const UNITS = ["pcs","box","kg","g","L","mL","dozen","pair","set","roll","sheet","bottle","pack","bag"];
const SIZE_UNITS = ["mL","L","g","kg","mg","pcs","box"];
const EMPTY = { name:"", sku:"", barcode:"", category:"Other", hsnCode:"", gstRate:"18", openingStock:"0", minStock:"5", unit:"pcs", description:"", brand:"", technicalName:"", ingredients:"", reorderLevel:"5" };
const EMPTY_VARIANT = { variantName:"", size:"", sizeUnit:"mL", packaging:"", barcode:"", sku:"", purchasePrice:"", sellingPrice:"", currentStock:"0", minStock:"5", batchNumber:"", expiryDate:"" };
const EMPTY_BATCH = { productId:0, variantId:"", quantityReceived:"", purchasePrice:"", sellingPrice:"", batchNumber:"", manufacturingDate:"", expiryDate:"", warehouse:"", notes:"" };
const fmt = (n: number) => `₹${new Intl.NumberFormat("en-IN",{maximumFractionDigits:0}).format(n)}`;

function printBarcode(product: any, variant?: any) {
  const name = variant ? `${product.name} ${variant.variantName}` : product.name;
  const barcode = variant?.barcode || product.barcode || "—";
  const price = variant ? Number(variant.sellingPrice||0) : Number(product.sellingPrice||0);
  const html = `<!DOCTYPE html><html><head><meta charset="UTF-8"/><title>Barcode Label</title>
<style>*{margin:0;padding:0;box-sizing:border-box}body{font-family:Arial,sans-serif}
.labels{display:flex;flex-wrap:wrap;gap:4px;padding:8px}
.label{width:50mm;height:25mm;border:1px solid #999;display:flex;flex-direction:column;align-items:center;justify-content:center;padding:4px;text-align:center}
.name{font-size:8px;font-weight:700;overflow:hidden;text-overflow:ellipsis;white-space:nowrap;max-width:44mm}
.barcode{font-family:monospace;font-size:14px;letter-spacing:2px;margin:2px 0}
.price{font-size:9px;font-weight:700;color:#1a1a2e}
.sub{font-size:7px;color:#666}
@media print{body{print-color-adjust:exact;-webkit-print-color-adjust:exact}}
</style></head><body>
<div class="labels">${Array(6).fill(0).map(()=>`
<div class="label">
<div class="name">${name}</div>
<div class="barcode">||||| ${barcode} |||||</div>
${price>0?`<div class="price">SP: ₹${new Intl.NumberFormat("en-IN",{maximumFractionDigits:0}).format(price)}</div>`:""}
${product.hsnCode?`<div class="sub">HSN: ${product.hsnCode}</div>`:""}
</div>`).join("")}</div>
<script>window.onload=function(){window.print();}</script>
</body></html>`;
  const w=window.open("","_blank");
  if(w){w.document.write(html);w.document.close();}
}

function VariantRow({ variant, product, onDelete, onReceive }: { variant:any; product:any; onDelete:(id:number)=>void; onReceive:(productId:number,variantId:number)=>void }) {
  return (
    <TableRow className="bg-muted/20">
      <TableCell className="pl-8">
        <div className="flex items-center gap-2">
          <Layers className="w-3 h-3 text-muted-foreground"/>
          <span className="text-sm">{variant.variantName}</span>
          {variant.size&&<Badge variant="outline" className="text-xs">{variant.size}{variant.sizeUnit}</Badge>}
        </div>
      </TableCell>
      <TableCell className="text-sm text-muted-foreground font-mono">{variant.barcode||"—"}</TableCell>
      <TableCell className="text-sm font-semibold">{variant.sellingPrice>0?fmt(Number(variant.sellingPrice||0)):<span className="text-muted-foreground text-xs italic">Set on stock entry</span>}</TableCell>
      <TableCell>
        <span className={cn("text-sm font-bold",variant.currentStock===0?"text-red-400":variant.currentStock<=(variant.minStock||5)?"text-yellow-400":"text-emerald-400")}>{variant.currentStock}</span>
      </TableCell>
      <TableCell className="text-xs text-muted-foreground">{variant.batchNumber||"—"}</TableCell>
      <TableCell className="text-xs text-muted-foreground">{variant.expiryDate||"—"}</TableCell>
      <TableCell>
        <div className="flex gap-1">
          <Button variant="ghost" size="icon" className="h-7 w-7 text-green-500" title="Receive Stock" onClick={()=>onReceive(product.id,variant.id)}><ArrowDownToLine className="w-3 h-3"/></Button>
          <Button variant="ghost" size="icon" className="h-7 w-7" title="Print barcode" onClick={()=>printBarcode(product,variant)}><Printer className="w-3 h-3"/></Button>
          <Button variant="ghost" size="icon" className="h-7 w-7 text-muted-foreground hover:text-destructive" onClick={()=>onDelete(variant.id)}><Trash2 className="w-3 h-3"/></Button>
        </div>
      </TableCell>
    </TableRow>
  );
}

export default function Inventory() {
  const qc = useQueryClient();
  const { toast } = useToast();
  const [search, setSearch] = useState("");
  const [filter, setFilter] = useState("all");
  const [open, setOpen] = useState(false);
  const [editing, setEditing] = useState<any>(null);
  const [form, setForm] = useState(EMPTY);
  const [variants, setVariants] = useState<typeof EMPTY_VARIANT[]>([]);
  const [expandedRows, setExpandedRows] = useState<Set<number>>(new Set());
  const [variantDialogProductId, setVariantDialogProductId] = useState<number|null>(null);
  const [variantForm, setVariantForm] = useState(EMPTY_VARIANT);
  const [receiveOpen, setReceiveOpen] = useState(false);
  const [batchForm, setBatchForm] = useState(EMPTY_BATCH);
  const [batchSearch, setBatchSearch] = useState("");

  const { data: summary } = useQuery({ queryKey:["inventory-summary"], queryFn:()=>apiFetch("/inventory/summary").then(r=>r.json()) });
  const { data: products=[], isLoading } = useQuery({
    queryKey:["products",search,filter],
    queryFn:()=>apiFetch(`/products${search?`?search=${encodeURIComponent(search)}`:filter==="low"?"?lowStock=true":""}`).then(r=>r.json()),
  });
  const { data: batches=[] } = useQuery({
    queryKey:["stock-batches"],
    queryFn:()=>apiFetch("/stock-batches").then(r=>r.json()),
  });

  const save = useMutation({
    mutationFn:async(d:any)=>{
      const r=editing
        ?await apiFetch(`/products/${editing.id}`,{method:"PATCH",body:JSON.stringify(d)})
        :await apiFetch("/products",{method:"POST",body:JSON.stringify({...d,variants})});
      const json=await r.json();
      if(!r.ok) throw new Error(json?.error||"Server error");
      return json;
    },
    onSuccess:()=>{qc.invalidateQueries({queryKey:["products"]});qc.invalidateQueries({queryKey:["inventory-summary"]});setOpen(false);toast({title:editing?"Product updated":"Product added"});},
    onError:(e:any)=>toast({title:"Failed",description:e?.message,variant:"destructive"}),
  });

  const del = useMutation({
    mutationFn:(id:number)=>apiFetch(`/products/${id}`,{method:"DELETE"}),
    onSuccess:()=>{qc.invalidateQueries({queryKey:["products"]});qc.invalidateQueries({queryKey:["inventory-summary"]});toast({title:"Product deleted"});},
  });

  const addVariant = useMutation({
    mutationFn:(d:any)=>apiJson("/product-variants",{method:"POST",body:JSON.stringify(d)}),
    onSuccess:()=>{qc.invalidateQueries({queryKey:["products"]});setVariantDialogProductId(null);setVariantForm(EMPTY_VARIANT);toast({title:"Variant added"});},
    onError:()=>toast({title:"Failed",variant:"destructive"}),
  });

  const delVariant = useMutation({
    mutationFn:(id:number)=>apiFetch(`/product-variants/${id}`,{method:"DELETE"}),
    onSuccess:()=>{qc.invalidateQueries({queryKey:["products"]});toast({title:"Variant deleted"});},
  });

  const receiveStock = useMutation({
    mutationFn:(d:any)=>apiJson("/stock-batches",{method:"POST",body:JSON.stringify(d)}),
    onSuccess:()=>{
      qc.invalidateQueries({queryKey:["products"]});
      qc.invalidateQueries({queryKey:["inventory-summary"]});
      qc.invalidateQueries({queryKey:["stock-batches"]});
      setReceiveOpen(false);
      setBatchForm(EMPTY_BATCH);
      toast({title:"Stock received!",description:"Inventory updated with new batch."});
    },
    onError:()=>toast({title:"Failed to receive stock",variant:"destructive"}),
  });

  const openCreate=()=>{setEditing(null);setForm(EMPTY);setVariants([]);setOpen(true);};
  const openEdit=(p:any)=>{
    setEditing(p);
    setForm({name:p.name,sku:p.sku||"",barcode:p.barcode||"",category:p.category,hsnCode:p.hsnCode||"",gstRate:String(p.gstRate||18),openingStock:String(p.currentStock||0),minStock:String(p.minStock||5),unit:p.unit||"pcs",description:p.description||"",brand:p.brand||"",technicalName:p.technicalName||"",ingredients:p.ingredients||"",reorderLevel:String(p.reorderLevel||5)});
    setVariants([]);setOpen(true);
  };
  const openReceive=(productId=0,variantId=0)=>{
    setBatchForm({...EMPTY_BATCH,productId,variantId:variantId?String(variantId):""});
    setReceiveOpen(true);
  };
  const setF=(k:keyof typeof EMPTY)=>(e:React.ChangeEvent<HTMLInputElement>)=>setForm(f=>({...f,[k]:e.target.value}));

  const badge=(p:any)=>{
    if(p.currentStock===0) return <Badge className="bg-red-500/20 text-red-400 border-red-500/30">Out of Stock</Badge>;
    if(p.currentStock<=p.minStock) return <Badge className="bg-yellow-500/20 text-yellow-400 border-yellow-500/30">Low Stock</Badge>;
    return <Badge className="bg-green-500/20 text-green-400 border-green-500/30">In Stock</Badge>;
  };

  const toggleRow=(id:number)=>setExpandedRows(prev=>{const n=new Set(prev);n.has(id)?n.delete(id):n.add(id);return n;});

  const selectedProduct = (products as any[]).find((p:any)=>p.id===Number(batchForm.productId));
  const filteredBatches = (batches as any[]).filter((b:any)=>
    !batchSearch || b.productName?.toLowerCase().includes(batchSearch.toLowerCase()) || b.batchNumber?.toLowerCase().includes(batchSearch.toLowerCase()) || b.variantName?.toLowerCase().includes(batchSearch.toLowerCase())
  );

  return (
    <div className="space-y-5">
      <div className="flex items-center justify-between flex-wrap gap-2">
        <div><h1 className="text-2xl font-bold">Inventory</h1><p className="text-muted-foreground text-sm">Manage products, stock batches, and pricing</p></div>
        <div className="flex gap-2 flex-wrap">
          <Button variant="outline" size="sm" onClick={()=>exportProducts(products as any[])}><FileDown className="w-4 h-4 mr-1"/>Export</Button>
          <Button variant="default" className="bg-green-600 hover:bg-green-700" onClick={()=>openReceive()}><ArrowDownToLine className="w-4 h-4 mr-2"/>Receive Stock</Button>
          <Button onClick={openCreate}><Plus className="w-4 h-4 mr-2"/>Add Product</Button>
        </div>
      </div>

      <div className="grid grid-cols-2 md:grid-cols-4 gap-3">
        {[
          {label:"Total Products",value:summary?.totalProducts??0,cls:"text-blue-500"},
          {label:"Low Stock Items",value:summary?.lowStockCount??0,cls:"text-yellow-500"},
          {label:"Out of Stock",value:summary?.outOfStock??0,cls:"text-red-500"},
          {label:"Stock Value",value:summary?.totalValue?fmt(summary.totalValue):"₹0",cls:"text-green-500"},
        ].map(s=>(
          <Card key={s.label} className="bg-card/50"><CardContent className="pt-4 pb-4">
            <p className="text-xs text-muted-foreground">{s.label}</p>
            <p className={cn("text-xl font-bold mt-1",s.cls)}>{s.value}</p>
          </CardContent></Card>
        ))}
      </div>

      <Tabs defaultValue="products">
        <TabsList>
          <TabsTrigger value="products"><Package className="w-3.5 h-3.5 mr-1.5"/>Products</TabsTrigger>
          <TabsTrigger value="batches"><Boxes className="w-3.5 h-3.5 mr-1.5"/>Stock Batches</TabsTrigger>
        </TabsList>

        <TabsContent value="products">
          <Card>
            <CardContent className="pt-4">
              <div className="flex flex-wrap gap-3 mb-4">
                <div className="relative flex-1 min-w-48 max-w-sm">
                  <Search className="absolute left-2.5 top-2.5 h-4 w-4 text-muted-foreground"/>
                  <Input placeholder="Search by name, brand, barcode..." className="pl-9" value={search} onChange={e=>{setSearch(e.target.value);setFilter("all");}}/>
                </div>
                <div className="flex gap-2">
                  {[{k:"all",l:"All"},{k:"low",l:"Low Stock"}].map(f=>(
                    <Button key={f.k} size="sm" variant={filter===f.k?"default":"outline"} onClick={()=>{setFilter(f.k);setSearch("");}}>{f.l}</Button>
                  ))}
                </div>
              </div>
              <Table>
                <TableHeader>
                  <TableRow>
                    <TableHead className="w-6"/>
                    <TableHead>Product / Variant</TableHead>
                    <TableHead>Barcode</TableHead>
                    <TableHead>Category</TableHead>
                    <TableHead className="text-right">Selling Price</TableHead>
                    <TableHead className="text-center">Stock</TableHead>
                    <TableHead>Batch / Expiry</TableHead>
                    <TableHead>Status</TableHead>
                    <TableHead className="w-10"/>
                  </TableRow>
                </TableHeader>
                <TableBody>
                  {isLoading?<TableRow><TableCell colSpan={9} className="text-center py-8 text-muted-foreground">Loading...</TableCell></TableRow>
                  :(products as any[]).length===0?<TableRow><TableCell colSpan={9} className="text-center py-12">
                    <div className="flex flex-col items-center text-muted-foreground">
                      <Package className="w-10 h-10 mb-2 opacity-30"/><p>No products found</p>
                      <Button variant="outline" size="sm" className="mt-3" onClick={openCreate}><Plus className="w-4 h-4 mr-1"/>Add Product</Button>
                    </div>
                  </TableCell></TableRow>
                  :(products as any[]).map((p:any)=>(
                    <React.Fragment key={p.id}>
                      <TableRow className="hover:bg-muted/40">
                        <TableCell className="p-1">
                          {(p.variants?.length??0)>0&&(
                            <Button variant="ghost" size="icon" className="h-6 w-6" onClick={()=>toggleRow(p.id)}>
                              {expandedRows.has(p.id)?<ChevronDown className="w-3.5 h-3.5"/>:<ChevronRight className="w-3.5 h-3.5"/>}
                            </Button>
                          )}
                        </TableCell>
                        <TableCell>
                          <div>
                            <p className="font-medium text-sm">{p.name}</p>
                            <p className="text-xs text-muted-foreground">{p.brand||""}{p.brand&&p.sku?" · ":""}{p.sku||""}{p.variants?.length>0&&<span className="ml-2 text-purple-400">{p.variants.length} variant{p.variants.length!==1?"s":""}</span>}</p>
                          </div>
                        </TableCell>
                        <TableCell className="text-sm font-mono text-muted-foreground">{p.barcode||"—"}</TableCell>
                        <TableCell><Badge variant="outline" className="text-xs">{p.category}</Badge></TableCell>
                        <TableCell className="text-right text-sm font-semibold">{p.sellingPrice>0?fmt(Number(p.sellingPrice||0)):<span className="text-xs text-muted-foreground italic">Batch-priced</span>}</TableCell>
                        <TableCell className="text-center">
                          <span className={cn("text-sm font-bold",p.currentStock===0?"text-red-400":p.currentStock<=p.minStock?"text-yellow-400":"text-emerald-400")}>{p.currentStock}</span>
                        </TableCell>
                        <TableCell className="text-xs text-muted-foreground">
                          {p.batchNumber&&<span className="font-mono">{p.batchNumber}</span>}
                          {p.expiryDate&&<span className="ml-1 text-orange-400">exp:{p.expiryDate}</span>}
                          {!p.batchNumber&&!p.expiryDate&&"—"}
                        </TableCell>
                        <TableCell>{badge(p)}</TableCell>
                        <TableCell>
                          <DropdownMenu>
                            <DropdownMenuTrigger asChild><Button variant="ghost" size="icon" className="h-8 w-8"><MoreHorizontal className="h-4 w-4"/></Button></DropdownMenuTrigger>
                            <DropdownMenuContent align="end">
                              <DropdownMenuItem onClick={()=>openReceive(p.id,0)} className="text-green-500"><ArrowDownToLine className="h-4 w-4 mr-2"/>Receive Stock</DropdownMenuItem>
                              <DropdownMenuItem onClick={()=>openEdit(p)}><Edit className="h-4 w-4 mr-2"/>Edit Product</DropdownMenuItem>
                              <DropdownMenuItem onClick={()=>{setVariantDialogProductId(p.id);setVariantForm(EMPTY_VARIANT);}}><Layers className="h-4 w-4 mr-2"/>Add Variant</DropdownMenuItem>
                              <DropdownMenuItem onClick={()=>printBarcode(p)}><Printer className="h-4 w-4 mr-2"/>Print Barcode</DropdownMenuItem>
                              <DropdownMenuItem className="text-destructive" onClick={()=>del.mutate(p.id)}><Trash2 className="h-4 w-4 mr-2"/>Delete</DropdownMenuItem>
                            </DropdownMenuContent>
                          </DropdownMenu>
                        </TableCell>
                      </TableRow>
                      {expandedRows.has(p.id)&&(p.variants||[]).map((v:any)=>(
                        <VariantRow key={v.id} variant={v} product={p} onDelete={(id)=>delVariant.mutate(id)} onReceive={openReceive}/>
                      ))}
                    </React.Fragment>
                  ))}
                </TableBody>
              </Table>
            </CardContent>
          </Card>
        </TabsContent>

        <TabsContent value="batches">
          <Card>
            <CardContent className="pt-4">
              <div className="flex items-center justify-between mb-4 gap-3">
                <div className="relative flex-1 max-w-sm">
                  <Search className="absolute left-2.5 top-2.5 h-4 w-4 text-muted-foreground"/>
                  <Input placeholder="Search batches by product, batch no..." className="pl-9" value={batchSearch} onChange={e=>setBatchSearch(e.target.value)}/>
                </div>
                <Button className="bg-green-600 hover:bg-green-700" onClick={()=>openReceive()}><ArrowDownToLine className="w-4 h-4 mr-2"/>Receive New Stock</Button>
              </div>
              {(batches as any[]).length===0?
                <div className="text-center py-12 text-muted-foreground">
                  <Boxes className="w-10 h-10 mx-auto mb-3 opacity-30"/>
                  <p className="font-medium">No stock batches yet</p>
                  <p className="text-sm mt-1">Click "Receive Stock" to record your first stock batch with purchase & selling prices.</p>
                  <Button className="mt-4 bg-green-600 hover:bg-green-700" onClick={()=>openReceive()}><ArrowDownToLine className="w-4 h-4 mr-2"/>Receive Stock</Button>
                </div>
              :<Table>
                <TableHeader>
                  <TableRow>
                    <TableHead>Product</TableHead>
                    <TableHead>Variant</TableHead>
                    <TableHead>Batch No.</TableHead>
                    <TableHead className="text-right">Qty Rcvd</TableHead>
                    <TableHead className="text-right">Current Qty</TableHead>
                    <TableHead className="text-right">Purchase Price</TableHead>
                    <TableHead className="text-right">Selling Price</TableHead>
                    <TableHead>Mfg Date</TableHead>
                    <TableHead>Expiry Date</TableHead>
                    <TableHead>Warehouse</TableHead>
                    <TableHead>Received On</TableHead>
                  </TableRow>
                </TableHeader>
                <TableBody>
                  {filteredBatches.map((b:any)=>(
                    <TableRow key={b.id}>
                      <TableCell className="font-medium text-sm">{b.productName||"—"}</TableCell>
                      <TableCell className="text-sm text-muted-foreground">{b.variantName||"—"}</TableCell>
                      <TableCell className="font-mono text-sm">{b.batchNumber||<span className="text-muted-foreground">—</span>}</TableCell>
                      <TableCell className="text-right text-sm">{b.quantityReceived}</TableCell>
                      <TableCell className="text-right">
                        <span className={cn("text-sm font-semibold",b.currentQty===0?"text-red-400":b.currentQty<5?"text-yellow-400":"text-emerald-400")}>{b.currentQty}</span>
                      </TableCell>
                      <TableCell className="text-right text-sm">{fmt(Number(b.purchasePrice||0))}</TableCell>
                      <TableCell className="text-right text-sm font-semibold">{fmt(Number(b.sellingPrice||0))}</TableCell>
                      <TableCell className="text-xs text-muted-foreground">{b.manufacturingDate||"—"}</TableCell>
                      <TableCell className="text-xs">{b.expiryDate?<span className="text-orange-400">{b.expiryDate}</span>:"—"}</TableCell>
                      <TableCell className="text-xs text-muted-foreground">{b.warehouse||"—"}</TableCell>
                      <TableCell className="text-xs text-muted-foreground">{b.createdAt?new Date(b.createdAt).toLocaleDateString("en-IN"):"—"}</TableCell>
                    </TableRow>
                  ))}
                </TableBody>
              </Table>}
            </CardContent>
          </Card>
        </TabsContent>
      </Tabs>

      {/* RECEIVE STOCK DIALOG */}
      <Dialog open={receiveOpen} onOpenChange={v=>{setReceiveOpen(v);if(!v)setBatchForm(EMPTY_BATCH);}}>
        <DialogContent className="max-w-lg">
          <DialogHeader>
            <DialogTitle className="flex items-center gap-2">
              <ArrowDownToLine className="w-5 h-5 text-green-500"/>
              Receive Stock
            </DialogTitle>
          </DialogHeader>
          <p className="text-sm text-muted-foreground -mt-2">Set purchase price and selling price per batch. Each batch can have different prices.</p>

          <div className="space-y-4">
            <div className="grid gap-2">
              <Label>Product *</Label>
              <Select value={String(batchForm.productId||"")} onValueChange={v=>setBatchForm(f=>({...f,productId:Number(v),variantId:""}))}>
                <SelectTrigger><SelectValue placeholder="Select product..."/></SelectTrigger>
                <SelectContent>
                  {(products as any[]).map((p:any)=><SelectItem key={p.id} value={String(p.id)}>{p.name}{p.brand?` (${p.brand})`:""}</SelectItem>)}
                </SelectContent>
              </Select>
            </div>

            {selectedProduct?.variants?.length>0&&(
              <div className="grid gap-2">
                <Label>Variant <span className="text-muted-foreground text-xs">(optional — leave blank for base product)</span></Label>
                <Select value={batchForm.variantId||"none"} onValueChange={v=>setBatchForm(f=>({...f,variantId:v==="none"?"":v}))}>
                  <SelectTrigger><SelectValue placeholder="Base product (no variant)"/></SelectTrigger>
                  <SelectContent>
                    <SelectItem value="none">Base product (no variant)</SelectItem>
                    {selectedProduct.variants.map((v:any)=><SelectItem key={v.id} value={String(v.id)}>{v.variantName}{v.size?` — ${v.size}${v.sizeUnit||""}`:""} (Stock: {v.currentStock})</SelectItem>)}
                  </SelectContent>
                </Select>
              </div>
            )}

            <div className="grid grid-cols-3 gap-3">
              <div className="grid gap-2 col-span-1">
                <Label>Qty Received *</Label>
                <Input type="number" min="1" placeholder="0" value={batchForm.quantityReceived} onChange={e=>setBatchForm(f=>({...f,quantityReceived:e.target.value}))}/>
              </div>
              <div className="grid gap-2">
                <Label>Purchase Price (₹) *</Label>
                <Input type="number" min="0" step="0.01" placeholder="0.00" value={batchForm.purchasePrice} onChange={e=>setBatchForm(f=>({...f,purchasePrice:e.target.value}))}/>
              </div>
              <div className="grid gap-2">
                <Label>Selling Price (₹) *</Label>
                <Input type="number" min="0" step="0.01" placeholder="0.00" value={batchForm.sellingPrice} onChange={e=>setBatchForm(f=>({...f,sellingPrice:e.target.value}))}/>
              </div>
            </div>

            {batchForm.purchasePrice&&batchForm.sellingPrice&&(
              <div className="bg-muted/30 rounded-lg px-3 py-2 text-sm flex gap-4">
                <span className="text-muted-foreground">Margin:</span>
                <span className={cn("font-semibold",Number(batchForm.sellingPrice)>Number(batchForm.purchasePrice)?"text-green-500":"text-red-500")}>
                  ₹{(Number(batchForm.sellingPrice)-Number(batchForm.purchasePrice)).toFixed(2)}
                  {" "}({Number(batchForm.purchasePrice)>0?((Number(batchForm.sellingPrice)-Number(batchForm.purchasePrice))/Number(batchForm.purchasePrice)*100).toFixed(1):0}%)
                </span>
              </div>
            )}

            <div className="grid grid-cols-2 gap-3">
              <div className="grid gap-2">
                <Label>Batch Number</Label>
                <Input placeholder="e.g. BATCH-A, LOT-001" value={batchForm.batchNumber} onChange={e=>setBatchForm(f=>({...f,batchNumber:e.target.value}))}/>
              </div>
              <div className="grid gap-2">
                <Label>Warehouse / Location</Label>
                <Input placeholder="Main Store, Cold Storage..." value={batchForm.warehouse} onChange={e=>setBatchForm(f=>({...f,warehouse:e.target.value}))}/>
              </div>
              <div className="grid gap-2">
                <Label>Manufacturing Date</Label>
                <Input type="date" value={batchForm.manufacturingDate} onChange={e=>setBatchForm(f=>({...f,manufacturingDate:e.target.value}))}/>
              </div>
              <div className="grid gap-2">
                <Label>Expiry Date</Label>
                <Input type="date" value={batchForm.expiryDate} onChange={e=>setBatchForm(f=>({...f,expiryDate:e.target.value}))}/>
              </div>
            </div>

            <div className="grid gap-2">
              <Label>Notes <span className="text-muted-foreground text-xs">(optional)</span></Label>
              <Input placeholder="Supplier name, invoice no., notes..." value={batchForm.notes} onChange={e=>setBatchForm(f=>({...f,notes:e.target.value}))}/>
            </div>
          </div>

          <DialogFooter>
            <Button variant="outline" onClick={()=>setReceiveOpen(false)}>Cancel</Button>
            <Button
              className="bg-green-600 hover:bg-green-700"
              onClick={()=>receiveStock.mutate({...batchForm,productId:Number(batchForm.productId),variantId:batchForm.variantId?Number(batchForm.variantId):undefined,quantityReceived:Number(batchForm.quantityReceived),purchasePrice:Number(batchForm.purchasePrice),sellingPrice:Number(batchForm.sellingPrice)})}
              disabled={receiveStock.isPending||!batchForm.productId||!batchForm.quantityReceived||!batchForm.sellingPrice}
            >
              <ArrowDownToLine className="w-4 h-4 mr-2"/>
              {receiveStock.isPending?"Saving...":"Receive Stock"}
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      {/* ADD/EDIT PRODUCT DIALOG */}
      <Dialog open={open} onOpenChange={v=>{setOpen(v);if(!v){setEditing(null);setVariants([]);}}}>
        <DialogContent className="max-w-2xl max-h-[95vh] overflow-y-auto">
          <DialogHeader><DialogTitle>{editing?"Edit Product":"Add New Product"}</DialogTitle></DialogHeader>
          <Tabs defaultValue="basic">
            <TabsList className="mb-4">
              <TabsTrigger value="basic">Basic Info</TabsTrigger>
              <TabsTrigger value="stock">Stock Settings</TabsTrigger>
              <TabsTrigger value="details">Details</TabsTrigger>
              {!editing&&<TabsTrigger value="variants">Variants ({variants.length})</TabsTrigger>}
            </TabsList>

            <TabsContent value="basic" className="space-y-3">
              <div className="p-3 bg-blue-500/10 border border-blue-500/20 rounded-lg text-xs text-blue-400 mb-2">
                💡 Selling price is set per stock batch (via Receive Stock), not stored permanently on the product.
              </div>
              <div className="grid grid-cols-2 gap-3">
                <div className="col-span-2 grid gap-2"><Label>Product Name *</Label><Input value={form.name} onChange={setF("name")} placeholder="e.g. Roundup Weedkiller"/></div>
                <div className="grid gap-2"><Label>Technical Name</Label><Input value={form.technicalName} onChange={setF("technicalName")} placeholder="Chemical / technical name"/></div>
                <div className="grid gap-2"><Label>Brand</Label><Input value={form.brand} onChange={setF("brand")} placeholder="Brand name"/></div>
                <div className="grid gap-2">
                  <Label>Category</Label>
                  <Select value={form.category} onValueChange={v=>setForm(f=>({...f,category:v}))}>
                    <SelectTrigger><SelectValue/></SelectTrigger>
                    <SelectContent>{CATEGORIES.map(c=><SelectItem key={c} value={c}>{c}</SelectItem>)}</SelectContent>
                  </Select>
                </div>
                <div className="grid gap-2"><Label>Barcode</Label><Input value={form.barcode} onChange={setF("barcode")} placeholder="Scan or enter barcode"/></div>
                <div className="grid gap-2"><Label>SKU</Label><Input value={form.sku} onChange={setF("sku")} placeholder="SKU-001"/></div>
                <div className="grid gap-2"><Label>HSN Code</Label><Input value={form.hsnCode} onChange={setF("hsnCode")} placeholder="e.g. 3808"/></div>
                <div className="grid gap-2">
                  <Label>GST Rate</Label>
                  <Select value={form.gstRate} onValueChange={v=>setForm(f=>({...f,gstRate:v}))}>
                    <SelectTrigger><SelectValue/></SelectTrigger>
                    <SelectContent>{GST_RATES.map(r=><SelectItem key={r} value={r}>{r}%</SelectItem>)}</SelectContent>
                  </Select>
                </div>
                <div className="grid gap-2">
                  <Label>Unit</Label>
                  <Select value={form.unit} onValueChange={v=>setForm(f=>({...f,unit:v}))}>
                    <SelectTrigger><SelectValue/></SelectTrigger>
                    <SelectContent>{UNITS.map(u=><SelectItem key={u} value={u}>{u}</SelectItem>)}</SelectContent>
                  </Select>
                </div>
              </div>
            </TabsContent>

            <TabsContent value="stock" className="space-y-3">
              <div className="grid grid-cols-2 gap-3">
                <div className="grid gap-2"><Label>Opening Stock</Label><Input type="number" min="0" value={form.openingStock} onChange={setF("openingStock")}/></div>
                <div className="grid gap-2"><Label>Min Stock Alert Level</Label><Input type="number" min="0" value={form.minStock} onChange={setF("minStock")}/></div>
                <div className="grid gap-2"><Label>Reorder Level</Label><Input type="number" min="0" value={form.reorderLevel} onChange={setF("reorderLevel")}/></div>
              </div>
              <p className="text-xs text-muted-foreground bg-muted/30 rounded p-2">Purchase price and selling price are set when you <strong>Receive Stock</strong> (per batch). This allows different batches to have different prices.</p>
            </TabsContent>

            <TabsContent value="details" className="space-y-3">
              <div className="grid gap-3">
                <div className="grid gap-2"><Label>Ingredients / Composition</Label><Input value={form.ingredients} onChange={setF("ingredients")} placeholder="Active ingredients..."/></div>
                <div className="grid gap-2"><Label>Description</Label><Input value={form.description} onChange={setF("description")} placeholder="Product description"/></div>
              </div>
            </TabsContent>

            {!editing&&(
              <TabsContent value="variants" className="space-y-3">
                <div className="flex items-center justify-between mb-2">
                  <p className="text-sm text-muted-foreground">Add size variants (e.g. 500mL, 1L, 5L). Prices set via Receive Stock later.</p>
                  <Button size="sm" variant="outline" onClick={()=>setVariants(v=>[...v,{...EMPTY_VARIANT}])}><Plus className="w-3 h-3 mr-1"/>Add Variant</Button>
                </div>
                {variants.length===0&&<div className="text-center py-8 text-muted-foreground text-sm"><Layers className="w-8 h-8 mx-auto mb-2 opacity-30"/>No variants. Click Add Variant to create size-wise variants.</div>}
                {variants.map((v,i)=>(
                  <div key={i} className="border rounded-lg p-3 space-y-2">
                    <div className="flex items-center justify-between">
                      <p className="text-sm font-medium">Variant {i+1}</p>
                      <Button size="sm" variant="ghost" className="h-7 text-destructive" onClick={()=>setVariants(vs=>vs.filter((_,j)=>j!==i))}>×</Button>
                    </div>
                    <div className="grid grid-cols-3 gap-2">
                      <div className="grid gap-1"><Label className="text-xs">Variant Name *</Label><Input className="h-8" value={v.variantName} onChange={e=>setVariants(vs=>vs.map((x,j)=>j===i?{...x,variantName:e.target.value}:x))} placeholder="500mL Pack"/></div>
                      <div className="grid gap-1"><Label className="text-xs">Size</Label><Input className="h-8" value={v.size} onChange={e=>setVariants(vs=>vs.map((x,j)=>j===i?{...x,size:e.target.value}:x))} placeholder="500"/></div>
                      <div className="grid gap-1"><Label className="text-xs">Size Unit</Label>
                        <Select value={v.sizeUnit} onValueChange={val=>setVariants(vs=>vs.map((x,j)=>j===i?{...x,sizeUnit:val}:x))}>
                          <SelectTrigger className="h-8"><SelectValue/></SelectTrigger>
                          <SelectContent>{SIZE_UNITS.map(u=><SelectItem key={u} value={u}>{u}</SelectItem>)}</SelectContent>
                        </Select>
                      </div>
                      <div className="grid gap-1 col-span-2"><Label className="text-xs">Barcode</Label><Input className="h-8" value={v.barcode} onChange={e=>setVariants(vs=>vs.map((x,j)=>j===i?{...x,barcode:e.target.value}:x))} placeholder="Unique barcode for this variant"/></div>
                      <div className="grid gap-1"><Label className="text-xs">Opening Stock</Label><Input className="h-8" type="number" value={v.currentStock} onChange={e=>setVariants(vs=>vs.map((x,j)=>j===i?{...x,currentStock:e.target.value}:x))}/></div>
                    </div>
                  </div>
                ))}
              </TabsContent>
            )}
          </Tabs>

          <DialogFooter>
            <Button variant="outline" onClick={()=>{setOpen(false);setEditing(null);setVariants([]);}}>Cancel</Button>
            <Button onClick={()=>save.mutate(form)} disabled={save.isPending||!form.name}>{editing?"Update":"Add Product"}{!editing&&variants.length>0&&` (${variants.length} variants)`}</Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      {/* ADD VARIANT DIALOG */}
      <Dialog open={variantDialogProductId!==null} onOpenChange={v=>{if(!v){setVariantDialogProductId(null);setVariantForm(EMPTY_VARIANT);}}}>
        <DialogContent className="max-w-md">
          <DialogHeader><DialogTitle>Add Product Variant</DialogTitle></DialogHeader>
          <div className="grid grid-cols-2 gap-3">
            <div className="col-span-2 grid gap-2"><Label>Variant Name *</Label><Input value={variantForm.variantName} onChange={e=>setVariantForm(f=>({...f,variantName:e.target.value}))} placeholder="e.g. 500mL Pack, 1 Litre, 25 KG"/></div>
            <div className="grid gap-2"><Label>Size</Label><Input value={variantForm.size} onChange={e=>setVariantForm(f=>({...f,size:e.target.value}))} placeholder="500"/></div>
            <div className="grid gap-2"><Label>Size Unit</Label>
              <Select value={variantForm.sizeUnit} onValueChange={v=>setVariantForm(f=>({...f,sizeUnit:v}))}>
                <SelectTrigger><SelectValue/></SelectTrigger>
                <SelectContent>{SIZE_UNITS.map(u=><SelectItem key={u} value={u}>{u}</SelectItem>)}</SelectContent>
              </Select>
            </div>
            <div className="col-span-2 grid gap-2"><Label>Barcode</Label><Input value={variantForm.barcode} onChange={e=>setVariantForm(f=>({...f,barcode:e.target.value}))} placeholder="Unique barcode for this variant"/></div>
            <div className="grid gap-2"><Label>Opening Stock</Label><Input type="number" value={variantForm.currentStock} onChange={e=>setVariantForm(f=>({...f,currentStock:e.target.value}))}/></div>
            <div className="grid gap-2"><Label>Min Stock</Label><Input type="number" value={variantForm.minStock} onChange={e=>setVariantForm(f=>({...f,minStock:e.target.value}))}/></div>
          </div>
          <p className="text-xs text-muted-foreground bg-muted/30 rounded p-2">Purchase price and selling price will be set when you <strong>Receive Stock</strong> for this variant.</p>
          <DialogFooter>
            <Button variant="outline" onClick={()=>{setVariantDialogProductId(null);setVariantForm(EMPTY_VARIANT);}}>Cancel</Button>
            <Button onClick={()=>addVariant.mutate({productId:variantDialogProductId,...variantForm})} disabled={addVariant.isPending||!variantForm.variantName}>Add Variant</Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </div>
  );
}
