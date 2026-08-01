import { useQuery } from "@tanstack/react-query";
import { apiFetch } from "../lib/auth";
import { useAuth } from "../contexts/AuthContext";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { AreaChart, Area, XAxis, YAxis, CartesianGrid, Tooltip, ResponsiveContainer } from "recharts";
import {
  TrendingUp, TrendingDown, Users, Package, AlertTriangle, IndianRupee,
  Briefcase, ArrowUpRight, CalendarClock, PackageX, ShieldAlert, Clock, Receipt
} from "lucide-react";
import { cn } from "@/lib/utils";
import { Badge } from "@/components/ui/badge";
import { differenceInDays, parseISO } from "date-fns";

const fmt = (n: number) => new Intl.NumberFormat("en-IN", { maximumFractionDigits: 0 }).format(n);
const fmtC = (n: number) => `₹${fmt(n)}`;

function StatCard({ label, value, icon: Icon, color, sub }: { label: string; value: string; icon: any; color: string; sub?: string }) {
  return (
    <Card className="bg-card/50 border-border/50">
      <CardContent className="pt-5 pb-5">
        <div className="flex items-start justify-between">
          <div className="min-w-0">
            <p className="text-muted-foreground text-xs">{label}</p>
            <p className="text-xl font-bold mt-1 truncate">{value}</p>
            {sub && <p className="text-xs text-muted-foreground mt-0.5">{sub}</p>}
          </div>
          <div className={cn("p-2 rounded-lg flex-shrink-0", color)}>
            <Icon className="w-4 h-4" />
          </div>
        </div>
      </CardContent>
    </Card>
  );
}

function expiryUrgency(expiryDate: string): { label: string; color: string; badgeClass: string; days: number } {
  try {
    const days = differenceInDays(parseISO(expiryDate), new Date());
    if (days < 0) return { label: "Expired", color: "text-red-400", badgeClass: "bg-red-500/20 text-red-400 border-red-500/30", days };
    if (days <= 30) return { label: `${days}d left`, color: "text-red-400", badgeClass: "bg-red-500/20 text-red-400 border-red-500/30", days };
    if (days <= 60) return { label: `${days}d left`, color: "text-orange-400", badgeClass: "bg-orange-500/20 text-orange-400 border-orange-500/30", days };
    return { label: `${days}d left`, color: "text-yellow-400", badgeClass: "bg-yellow-500/20 text-yellow-400 border-yellow-500/30", days };
  } catch {
    return { label: "—", color: "text-muted-foreground", badgeClass: "bg-muted text-muted-foreground", days: 999 };
  }
}

export default function Dashboard() {
  const { company } = useAuth();
  const { data, isLoading } = useQuery({
    queryKey: ["dashboard"],
    queryFn: () => apiFetch("/dashboard/summary").then(r => r.json()),
    staleTime: 30000,
  });

  if (isLoading) return (
    <div className="flex h-64 items-center justify-center">
      <div className="animate-spin w-8 h-8 border-4 border-primary border-t-transparent rounded-full" />
    </div>
  );

  const d = data || {};
  const expiryBatches: any[] = d.expiringBatches ?? [];
  const expiredBatches = expiryBatches.filter((b: any) => {
    try { return differenceInDays(parseISO(b.expiryDate), new Date()) < 0; } catch { return false; }
  });
  const criticalBatches = expiryBatches.filter((b: any) => {
    try { const days = differenceInDays(parseISO(b.expiryDate), new Date()); return days >= 0 && days <= 30; } catch { return false; }
  });
  const totalExpiryAlerts = expiryBatches.length;

  return (
    <div className="space-y-5">
      <div>
        <h1 className="text-2xl font-bold">Dashboard</h1>
        <p className="text-muted-foreground text-sm">{company?.name} · {new Date().toLocaleDateString("en-IN", { weekday: "long", year: "numeric", month: "long", day: "numeric" })}</p>
      </div>

      {/* Expiry Alert Banner */}
      {totalExpiryAlerts > 0 && (
        <div className={cn(
          "flex items-start gap-3 rounded-xl border px-4 py-3",
          expiredBatches.length > 0
            ? "bg-red-500/10 border-red-500/30"
            : criticalBatches.length > 0
            ? "bg-orange-500/10 border-orange-500/30"
            : "bg-yellow-500/10 border-yellow-500/30"
        )}>
          <ShieldAlert className={cn("w-5 h-5 flex-shrink-0 mt-0.5",
            expiredBatches.length > 0 ? "text-red-400" : criticalBatches.length > 0 ? "text-orange-400" : "text-yellow-400"
          )} />
          <div className="flex-1 min-w-0">
            <p className={cn("font-semibold text-sm",
              expiredBatches.length > 0 ? "text-red-300" : criticalBatches.length > 0 ? "text-orange-300" : "text-yellow-300"
            )}>
              {expiredBatches.length > 0
                ? `⛔ ${expiredBatches.length} batch${expiredBatches.length > 1 ? "es" : ""} already expired — remove from sale immediately`
                : criticalBatches.length > 0
                ? `🚨 ${criticalBatches.length} batch${criticalBatches.length > 1 ? "es" : ""} expiring within 30 days — prioritize selling`
                : `⚠ ${totalExpiryAlerts} batch${totalExpiryAlerts > 1 ? "es" : ""} expiring within 90 days`}
            </p>
            <p className="text-xs text-muted-foreground mt-0.5">
              {expiredBatches.length > 0 && criticalBatches.length > 0
                ? `${expiredBatches.length} expired · ${criticalBatches.length} critical · `
                : ""}
              See expiry details below
            </p>
          </div>
        </div>
      )}

      {/* Sales Stats */}
      <div className="grid grid-cols-2 lg:grid-cols-5 gap-3">
        <StatCard label="Today's Sales" value={fmtC(d.todaySales ?? 0)} icon={TrendingUp} color="bg-emerald-500/20 text-emerald-500" />
        <StatCard label="Today's Expenses" value={fmtC(d.todayExpenses ?? 0)} icon={Receipt} color="bg-orange-500/20 text-orange-500" />
        <StatCard label="Monthly Sales" value={fmtC(d.monthlySales ?? 0)} icon={IndianRupee} color="bg-blue-500/20 text-blue-500" />
        <StatCard label="Monthly Profit" value={fmtC(d.monthlyProfit ?? 0)} icon={TrendingUp} color="bg-purple-500/20 text-purple-500" />
        <StatCard label="Pending Dues" value={fmtC(d.pendingPayments ?? 0)} icon={TrendingDown} color="bg-red-500/20 text-red-500" />
      </div>

      {/* Payment Methods */}
      <div className="grid grid-cols-2 lg:grid-cols-4 gap-3">
        <StatCard label="Cash Today" value={fmtC(d.cashToday ?? 0)} icon={IndianRupee} color="bg-green-500/20 text-green-500" sub="Cash" />
        <StatCard label="UPI Today" value={fmtC(d.upiToday ?? 0)} icon={ArrowUpRight} color="bg-orange-500/20 text-orange-500" sub="UPI" />
        <StatCard label="Card Today" value={fmtC(d.cardToday ?? 0)} icon={ArrowUpRight} color="bg-cyan-500/20 text-cyan-500" sub="Card" />
        <StatCard label="Bank Transfer" value={fmtC(d.bankToday ?? 0)} icon={ArrowUpRight} color="bg-indigo-500/20 text-indigo-500" sub="NEFT/RTGS" />
      </div>

      {/* Inventory Stats */}
      <div className="grid grid-cols-2 lg:grid-cols-4 gap-3">
        <StatCard label="Customers" value={String(d.totalCustomers ?? 0)} icon={Users} color="bg-violet-500/20 text-violet-500" />
        <StatCard label="Products" value={String(d.totalProducts ?? 0)} icon={Package} color="bg-blue-500/20 text-blue-500" />
        <StatCard label="Low Stock" value={String(d.lowStockCount ?? 0)} icon={AlertTriangle} color="bg-yellow-500/20 text-yellow-500" sub="Below min stock" />
        <StatCard label="Employees" value={String(d.totalEmployees ?? 0)} icon={Briefcase} color="bg-pink-500/20 text-pink-500" />
      </div>

      {/* Charts + Recent */}
      <div className="grid lg:grid-cols-3 gap-5">
        <Card className="lg:col-span-2 bg-card/50 border-border/50">
          <CardHeader><CardTitle className="text-sm">Revenue Trend (6 months)</CardTitle></CardHeader>
          <CardContent>
            {(d.monthlyRevenue ?? []).length > 0 ? (
              <ResponsiveContainer width="100%" height={220}>
                <AreaChart data={d.monthlyRevenue}>
                  <defs>
                    <linearGradient id="rg" x1="0" y1="0" x2="0" y2="1">
                      <stop offset="5%" stopColor="#3b82f6" stopOpacity={0.3} />
                      <stop offset="95%" stopColor="#3b82f6" stopOpacity={0} />
                    </linearGradient>
                  </defs>
                  <CartesianGrid strokeDasharray="3 3" stroke="#374151" />
                  <XAxis dataKey="label" stroke="#6b7280" tick={{ fontSize: 11 }} />
                  <YAxis stroke="#6b7280" tick={{ fontSize: 11 }} tickFormatter={(v) => `₹${(v / 1000).toFixed(0)}k`} />
                  <Tooltip formatter={(v: any) => [`₹${fmt(v)}`, "Revenue"]} contentStyle={{ background: "#1f2937", border: "1px solid #374151", borderRadius: "8px" }} />
                  <Area type="monotone" dataKey="value" stroke="#3b82f6" fill="url(#rg)" strokeWidth={2} />
                </AreaChart>
              </ResponsiveContainer>
            ) : (
              <div className="h-52 flex items-center justify-center text-muted-foreground text-sm">Create invoices to see revenue trend</div>
            )}
          </CardContent>
        </Card>

        <div className="space-y-3">
          <Card className="bg-card/50 border-border/50">
            <CardHeader className="pb-2"><CardTitle className="text-xs">Recent Invoices</CardTitle></CardHeader>
            <CardContent className="space-y-2">
              {(d.recentInvoices ?? []).length === 0 ? <p className="text-xs text-muted-foreground">No invoices yet</p> : (
                (d.recentInvoices as any[]).map((inv: any) => (
                  <div key={inv.id} className="flex items-center justify-between text-xs">
                    <div className="min-w-0">
                      <p className="font-medium truncate max-w-[110px]">{inv.customerName || "—"}</p>
                      <p className="text-muted-foreground">{inv.invoiceNumber}</p>
                    </div>
                    <div className="text-right flex-shrink-0">
                      <p className="font-medium">₹{fmt(inv.total)}</p>
                      <span className={cn("px-1 py-0.5 rounded text-[10px]", inv.paymentStatus === "paid" ? "bg-green-500/20 text-green-400" : "bg-yellow-500/20 text-yellow-400")}>{inv.paymentStatus}</span>
                    </div>
                  </div>
                ))
              )}
            </CardContent>
          </Card>

          <Card className="bg-card/50 border-border/50">
            <CardHeader className="pb-2"><CardTitle className="text-xs text-yellow-400">⚠ Low Stock Alert</CardTitle></CardHeader>
            <CardContent className="space-y-1.5">
              {(d.lowStockProducts ?? []).length === 0 ? <p className="text-xs text-muted-foreground">All items in stock</p> : (
                (d.lowStockProducts as any[]).map((p: any) => (
                  <div key={p.id} className="flex items-center justify-between text-xs">
                    <span className="truncate max-w-[110px]">{p.name}</span>
                    <span className={cn("font-medium flex-shrink-0", p.currentStock === 0 ? "text-red-400" : "text-yellow-400")}>{p.currentStock} {p.unit}</span>
                  </div>
                ))
              )}
            </CardContent>
          </Card>
        </div>
      </div>

      {/* Expiry Alerts Section */}
      {expiryBatches.length > 0 && (
        <Card className="bg-card/50 border-border/50">
          <CardHeader className="pb-3">
            <div className="flex items-center justify-between">
              <CardTitle className="text-sm flex items-center gap-2">
                <CalendarClock className="w-4 h-4 text-orange-400" />
                Stock Expiry Alerts
              </CardTitle>
              <div className="flex items-center gap-1.5">
                {expiredBatches.length > 0 && (
                  <Badge className="bg-red-500/20 text-red-400 border-red-500/30 text-[10px] py-0">
                    <PackageX className="w-3 h-3 mr-1" />{expiredBatches.length} Expired
                  </Badge>
                )}
                {criticalBatches.length > 0 && (
                  <Badge className="bg-orange-500/20 text-orange-400 border-orange-500/30 text-[10px] py-0">
                    <Clock className="w-3 h-3 mr-1" />{criticalBatches.length} Critical (≤30d)
                  </Badge>
                )}
                <Badge className="bg-muted text-muted-foreground text-[10px] py-0">{expiryBatches.length} total</Badge>
              </div>
            </div>
          </CardHeader>
          <CardContent className="pt-0">
            <div className="space-y-1.5">
              {/* Table header */}
              <div className="grid grid-cols-12 gap-2 px-2 py-1 text-[10px] font-medium text-muted-foreground uppercase tracking-wide">
                <span className="col-span-4">Product / Batch</span>
                <span className="col-span-2 text-right">Qty</span>
                <span className="col-span-3 text-center">Expiry Date</span>
                <span className="col-span-3 text-right">Status</span>
              </div>
              {expiryBatches.map((b: any) => {
                const urg = expiryUrgency(b.expiryDate);
                return (
                  <div
                    key={b.id}
                    className={cn(
                      "grid grid-cols-12 gap-2 px-2 py-2 rounded-lg text-xs items-center",
                      urg.days < 0 ? "bg-red-500/8 border border-red-500/20" :
                      urg.days <= 30 ? "bg-orange-500/8 border border-orange-500/20" :
                      "bg-yellow-500/5 border border-yellow-500/10"
                    )}
                  >
                    <div className="col-span-4 min-w-0">
                      <p className="font-medium truncate">{b.productName}</p>
                      {b.batchNumber && <p className="text-muted-foreground text-[10px]">Batch: {b.batchNumber}</p>}
                    </div>
                    <div className="col-span-2 text-right font-medium">{b.currentQty}</div>
                    <div className="col-span-3 text-center text-muted-foreground">{b.expiryDate}</div>
                    <div className="col-span-3 text-right">
                      <span className={cn("inline-flex items-center gap-1 px-2 py-0.5 rounded-full text-[10px] font-semibold border", urg.badgeClass)}>
                        {urg.days < 0 ? <PackageX className="w-3 h-3" /> : <Clock className="w-3 h-3" />}
                        {urg.label}
                      </span>
                    </div>
                  </div>
                );
              })}
            </div>
            <p className="text-[10px] text-muted-foreground mt-3 text-center">
              Showing batches with active stock expiring within 90 days · Go to Inventory → Stock Batches to manage
            </p>
          </CardContent>
        </Card>
      )}
    </div>
  );
}
