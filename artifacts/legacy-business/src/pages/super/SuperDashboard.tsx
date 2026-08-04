import { useQuery } from "@tanstack/react-query";
import { apiFetch } from "../../lib/auth";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Building2, Users, CreditCard, TrendingUp, Activity, Shield } from "lucide-react";
import { BarChart, Bar, XAxis, YAxis, CartesianGrid, Tooltip, ResponsiveContainer } from "recharts";
import { cn } from "@/lib/utils";

const fmt = (n: number) => `₹${new Intl.NumberFormat("en-IN",{maximumFractionDigits:0}).format(n)}`;

export default function SuperDashboard() {
  const { data: stats={}, isLoading } = useQuery({
    queryKey: ["super-dashboard"],
    queryFn: () => apiFetch("/super/dashboard").then(r => r.json()),
    staleTime: 30000,
  });

  const s = stats as any;

  if (isLoading) return <div className="flex h-64 items-center justify-center"><div className="animate-spin w-8 h-8 border-4 border-red-500 border-t-transparent rounded-full"/></div>;

  return (
    <div className="space-y-5">
      <div>
        <h1 className="text-2xl font-bold text-white">Super Admin Dashboard</h1>
        <p className="text-slate-400 text-sm">Platform-wide overview — {new Date().toLocaleDateString("en-IN",{weekday:"long",year:"numeric",month:"long",day:"numeric"})}</p>
      </div>

      <div className="grid grid-cols-2 md:grid-cols-4 gap-3">
        {[
          {label:"Total Companies",value:s.totalCompanies??0,icon:Building2,cls:"text-blue-400 bg-blue-900/30"},
          {label:"Active Companies",value:s.activeCompanies??0,icon:Activity,cls:"text-emerald-400 bg-emerald-900/30"},
          {label:"Total Users",value:s.totalUsers??0,icon:Users,cls:"text-purple-400 bg-purple-900/30"},
          {label:"Active Subscriptions",value:s.activeSubscriptions??0,icon:CreditCard,cls:"text-orange-400 bg-orange-900/30"},
        ].map(st=>(
          <Card key={st.label} className="bg-slate-900/50 border-slate-800">
            <CardContent className="pt-5 pb-5">
              <div className="flex items-start justify-between">
                <div><p className="text-slate-400 text-xs">{st.label}</p><p className="text-2xl font-bold text-white mt-1">{st.value}</p></div>
                <div className={cn("p-2 rounded-lg",st.cls)}><st.icon className="w-5 h-5"/></div>
              </div>
            </CardContent>
          </Card>
        ))}
      </div>

      <div className="grid md:grid-cols-2 gap-5">
        <Card className="bg-slate-900/50 border-slate-800">
          <CardHeader><CardTitle className="text-sm text-white">Companies by Plan</CardTitle></CardHeader>
          <CardContent>
            {(s.byPlan??[]).length>0 ? (
              <ResponsiveContainer width="100%" height={200}>
                <BarChart data={s.byPlan}>
                  <CartesianGrid strokeDasharray="3 3" stroke="#374151"/>
                  <XAxis dataKey="label" stroke="#6b7280" tick={{fontSize:11}}/>
                  <YAxis stroke="#6b7280" tick={{fontSize:11}}/>
                  <Tooltip contentStyle={{background:"#111827",border:"1px solid #374151",borderRadius:"8px"}}/>
                  <Bar dataKey="value" fill="#ef4444" radius={[4,4,0,0]}/>
                </BarChart>
              </ResponsiveContainer>
            ):<div className="h-48 flex items-center justify-center text-slate-500 text-sm">No plan data yet</div>}
          </CardContent>
        </Card>

        <Card className="bg-slate-900/50 border-slate-800">
          <CardHeader><CardTitle className="text-sm text-white">Recent Companies</CardTitle></CardHeader>
          <CardContent className="space-y-2">
            {(s.recentCompanies??[]).length===0 ? <p className="text-slate-500 text-sm">No companies yet</p> :
              (s.recentCompanies as any[]).map((c:any)=>(
                <div key={c.id} className="flex items-center justify-between py-1">
                  <div>
                    <p className="text-white text-sm font-medium">{c.name}</p>
                    <p className="text-slate-500 text-xs">{c.code} · {c.subscriptionStatus}</p>
                  </div>
                  <span className={cn("text-xs px-2 py-0.5 rounded-full border",c.subscriptionStatus==="active"?"bg-emerald-900/30 text-emerald-400 border-emerald-900":"bg-slate-800 text-slate-400 border-slate-700")}>{c.plan||"free"}</span>
                </div>
              ))}
          </CardContent>
        </Card>
      </div>

      <Card className="bg-slate-900/50 border-slate-800">
        <CardHeader><CardTitle className="text-sm text-white flex items-center gap-2"><Shield className="w-4 h-4 text-red-400"/>System Status</CardTitle></CardHeader>
        <CardContent>
          <div className="grid grid-cols-2 md:grid-cols-4 gap-3 text-sm">
            {[
              {label:"Database",status:"operational"},
              {label:"API Server",status:"operational"},
              {label:"Auth Service",status:"operational"},
              {label:"File Storage",status:"operational"},
            ].map(sys=>(
              <div key={sys.label} className="flex items-center gap-2 p-3 rounded-lg bg-slate-800/50 border border-slate-700">
                <div className="w-2 h-2 bg-emerald-400 rounded-full animate-pulse"/>
                <div><p className="text-white font-medium">{sys.label}</p><p className="text-emerald-400 text-xs">{sys.status}</p></div>
              </div>
            ))}
          </div>
        </CardContent>
      </Card>
    </div>
  );
}
