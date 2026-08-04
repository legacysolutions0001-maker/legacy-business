import { useState } from "react";
import { useQuery } from "@tanstack/react-query";
import { apiFetch } from "../lib/auth";
import { exportReportSummary, exportInvoices, exportCustomers, exportProducts } from "../lib/excel";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Button } from "@/components/ui/button";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";
import { BarChart, Bar, XAxis, YAxis, CartesianGrid, Tooltip, ResponsiveContainer, LineChart, Line, PieChart, Pie, Cell, Legend } from "recharts";
import { BarChart3, TrendingUp, TrendingDown, IndianRupee, FileDown } from "lucide-react";
import { cn } from "@/lib/utils";

const fmt = (n:number)=>`₹${new Intl.NumberFormat("en-IN",{maximumFractionDigits:0}).format(n)}`;
const COLORS = ["#3b82f6","#10b981","#f59e0b","#ef4444","#8b5cf6","#06b6d4"];

export default function Reports() {
  const [period,setPeriod]=useState("thisMonth");
  const { data: report={}, isLoading } = useQuery({
    queryKey:["reports",period],
    queryFn:()=>apiFetch(`/reports/summary?period=${period}`).then(r=>r.json()),
  });
  const { data: invoices=[] } = useQuery({ queryKey:["invoices-all"], queryFn:()=>apiFetch("/invoices").then(r=>r.json()) });
  const { data: customers=[] } = useQuery({ queryKey:["customers"], queryFn:()=>apiFetch("/customers").then(r=>r.json()) });
  const { data: products=[] } = useQuery({ queryKey:["products"], queryFn:()=>apiFetch("/inventory").then(r=>r.json()) });

  if(isLoading) return <div className="flex h-64 items-center justify-center"><div className="animate-spin w-8 h-8 border-4 border-primary border-t-transparent rounded-full"/></div>;

  const r = report as any;

  const summaryStats = [
    {label:"Revenue",value:r.revenue??0,icon:TrendingUp,cls:"text-emerald-400"},
    {label:"Expenses",value:r.expenses??0,icon:TrendingDown,cls:"text-red-400"},
    {label:"Gross Profit",value:r.profit??0,icon:IndianRupee,cls:"text-blue-400"},
    {label:"Net Profit",value:r.netProfit??0,icon:BarChart3,cls:"text-purple-400"},
  ];

  const paymentBreakdown = [
    {name:"Cash",value:r.cashTotal??0},
    {name:"UPI",value:r.upiTotal??0},
    {name:"Card",value:r.cardTotal??0},
    {name:"Bank",value:r.bankTotal??0},
  ].filter(x=>x.value>0);

  return (
    <div className="space-y-5">
      <div className="flex items-center justify-between flex-wrap gap-3">
        <div><h1 className="text-2xl font-bold">Reports & Analytics</h1><p className="text-muted-foreground text-sm">Business insights and performance data</p></div>
        <div className="flex gap-2 items-center">
          <Select value={period} onValueChange={setPeriod}>
            <SelectTrigger className="w-40"><SelectValue/></SelectTrigger>
            <SelectContent>
              <SelectItem value="today">Today</SelectItem>
              <SelectItem value="thisWeek">This Week</SelectItem>
              <SelectItem value="thisMonth">This Month</SelectItem>
              <SelectItem value="lastMonth">Last Month</SelectItem>
              <SelectItem value="thisYear">This Year</SelectItem>
            </SelectContent>
          </Select>
          <Button variant="outline" size="sm" onClick={()=>exportReportSummary(r,period)}><FileDown className="w-4 h-4 mr-1"/>Export</Button>
        </div>
      </div>

      <div className="grid grid-cols-2 md:grid-cols-4 gap-3">
        {summaryStats.map(s=>(
          <Card key={s.label} className="bg-card/50"><CardContent className="pt-4 pb-4 flex items-center gap-3">
            <s.icon className={`w-8 h-8 ${s.cls}`}/>
            <div><p className="text-xs text-muted-foreground">{s.label}</p><p className={cn("text-lg font-bold",s.cls)}>{fmt(s.value)}</p></div>
          </CardContent></Card>
        ))}
      </div>

      <div className="grid md:grid-cols-2 gap-4">
        <Card><CardHeader className="pb-2"><CardTitle className="text-sm">Monthly Revenue Trend</CardTitle></CardHeader>
          <CardContent>
            <ResponsiveContainer width="100%" height={220}>
              <LineChart data={r.monthlyRevenue||[]}>
                <CartesianGrid strokeDasharray="3 3" stroke="#333"/>
                <XAxis dataKey="label" tick={{fontSize:11}} stroke="#666"/>
                <YAxis tick={{fontSize:11}} stroke="#666" tickFormatter={v=>`₹${Number(v)/1000}k`}/>
                <Tooltip formatter={(v:any)=>`₹${Number(v).toLocaleString("en-IN")}`}/>
                <Line type="monotone" dataKey="value" stroke="#3b82f6" strokeWidth={2} dot={false} name="Revenue"/>
              </LineChart>
            </ResponsiveContainer>
          </CardContent>
        </Card>

        <Card><CardHeader className="pb-2"><CardTitle className="text-sm">Payment Methods Breakdown</CardTitle></CardHeader>
          <CardContent>
            {paymentBreakdown.length>0 ? (
              <ResponsiveContainer width="100%" height={220}>
                <PieChart>
                  <Pie data={paymentBreakdown} dataKey="value" nameKey="name" cx="50%" cy="50%" outerRadius={80} label={({name,percent})=>`${name} ${(percent*100).toFixed(0)}%`} labelLine={false}>
                    {paymentBreakdown.map((_,i)=><Cell key={i} fill={COLORS[i%COLORS.length]}/>)}
                  </Pie>
                  <Tooltip formatter={(v:any)=>`₹${Number(v).toLocaleString("en-IN")}`}/>
                  <Legend/>
                </PieChart>
              </ResponsiveContainer>
            ) : <div className="flex h-[220px] items-center justify-center text-muted-foreground text-sm">No payment data</div>}
          </CardContent>
        </Card>

        <Card><CardHeader className="pb-2 flex flex-row items-center justify-between"><CardTitle className="text-sm">Top Customers</CardTitle><Button size="sm" variant="ghost" onClick={()=>exportCustomers(customers as any[])}><FileDown className="w-3 h-3 mr-1"/>Export</Button></CardHeader>
          <CardContent className="p-0">
            <Table>
              <TableHeader><TableRow><TableHead>Customer</TableHead><TableHead className="text-right">Revenue</TableHead></TableRow></TableHeader>
              <TableBody>
                {(r.topCustomers||[]).slice(0,5).map((c:any,i:number)=>(
                  <TableRow key={i}><TableCell className="font-medium text-sm">{c.name}</TableCell><TableCell className="text-right text-sm text-emerald-400">{fmt(Number(c.totalRevenue||0))}</TableCell></TableRow>
                ))}
                {(!r.topCustomers||r.topCustomers.length===0)&&<TableRow><TableCell colSpan={2} className="text-center py-6 text-muted-foreground text-sm">No data</TableCell></TableRow>}
              </TableBody>
            </Table>
          </CardContent>
        </Card>

        <Card><CardHeader className="pb-2 flex flex-row items-center justify-between"><CardTitle className="text-sm">Invoices</CardTitle><Button size="sm" variant="ghost" onClick={()=>exportInvoices(invoices as any[])}><FileDown className="w-3 h-3 mr-1"/>Export</Button></CardHeader>
          <CardContent>
            <div className="space-y-3">
              {[
                {label:"Total Invoices",value:r.invoiceCount||0,suffix:""},
                {label:"Paid",value:r.paidCount||0,suffix:"",cls:"text-emerald-400"},
                {label:"Pending",value:r.pendingCount||0,suffix:"",cls:"text-blue-400"},
                {label:"Overdue",value:r.overdueCount||0,suffix:"",cls:"text-red-400"},
                {label:"Total Revenue (Invoices)",value:r.invoiceRevenue||0,suffix:"₹",cls:"text-purple-400"},
              ].map(s=>(
                <div key={s.label} className="flex justify-between text-sm">
                  <span className="text-muted-foreground">{s.label}</span>
                  <span className={cn("font-semibold",s.cls)}>{s.suffix}{typeof s.value==="number"&&s.suffix==="₹"?fmt(s.value):s.value}</span>
                </div>
              ))}
            </div>
          </CardContent>
        </Card>
      </div>

      <Card><CardHeader className="pb-2 flex flex-row items-center justify-between"><CardTitle className="text-sm">Low Stock Products</CardTitle><Button size="sm" variant="ghost" onClick={()=>exportProducts(products as any[])}><FileDown className="w-3 h-3 mr-1"/>Export Products</Button></CardHeader>
        <CardContent className="p-0">
          <Table>
            <TableHeader><TableRow><TableHead>Product</TableHead><TableHead>SKU</TableHead><TableHead className="text-center">Stock</TableHead><TableHead className="text-center">Min Stock</TableHead><TableHead className="text-right">Selling Price</TableHead></TableRow></TableHeader>
            <TableBody>
              {(r.lowStockProducts||[]).slice(0,8).map((p:any,i:number)=>(
                <TableRow key={i}>
                  <TableCell className="font-medium text-sm">{p.name}</TableCell>
                  <TableCell className="font-mono text-xs text-muted-foreground">{p.sku||"—"}</TableCell>
                  <TableCell className="text-center"><span className={p.currentStock===0?"text-red-400 font-bold":"text-amber-400 font-semibold"}>{p.currentStock}</span></TableCell>
                  <TableCell className="text-center text-muted-foreground text-sm">{p.minStock}</TableCell>
                  <TableCell className="text-right text-sm">{fmt(Number(p.sellingPrice||0))}</TableCell>
                </TableRow>
              ))}
              {(!r.lowStockProducts||r.lowStockProducts.length===0)&&<TableRow><TableCell colSpan={5} className="text-center py-6 text-muted-foreground text-sm">All products are well stocked</TableCell></TableRow>}
            </TableBody>
          </Table>
        </CardContent>
      </Card>
    </div>
  );
}
